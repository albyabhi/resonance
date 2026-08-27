import React, { useState, useCallback } from "react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { Loader2, AlertCircle, CheckCircle, Copy, Download } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "../ui/tooltip";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const TARGET_FIELDS = [
  { key: "name", label: "Name *", required: true },
  { key: "class", label: "Class *", required: true },
  { key: "email", label: "Email *", required: true },
  { key: "admission_no", label: "Admission No", required: false },
  { key: "phone", label: "Phone", required: false },
];

const STEPS = ["Upload", "Map Columns", "Validate", "Preview", "Import", "Summary"];

function ImportParticipants({ groups, groupLabel = "Group", onDone }) {
  const { token } = useAuth();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [rawHeaders, setRawHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [filename, setFilename] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");

  const [columnMap, setColumnMap] = useState({});

  const [jobId, setJobId] = useState(null);
  const [validationSummary, setValidationSummary] = useState(null);
  const [validatedRows, setValidatedRows] = useState([]);

  const [rowDecisions, setRowDecisions] = useState({});

  const [result, setResult] = useState(null);
  const [showFormat, setShowFormat] = useState(false);

  const apiCall = useCallback(async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      body: options.body || undefined,
    });
  }, [token]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setFilename(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (!json.length) {
          setError("File appears to be empty or could not be parsed");
          return;
        }

        const headers = Object.keys(json[0]);
        setRawHeaders(headers);
        setRawRows(json);

        const autoMap = {};
        for (const h of headers) {
          const hl = h.toLowerCase().trim();
          const match = TARGET_FIELDS.find((t) =>
            t.key === hl || hl.includes(t.key) || t.key.includes(hl) ||
            (t.key === "admission_no" && (hl === "admission" || hl === "admissionno" || hl === "admission number" || hl === "admission_number")) ||
            (t.key === "email" && (hl === "e-mail" || hl === "email address" || hl === "emailaddress")) ||
            (t.key === "phone" && (hl === "phone number" || hl === "phonenumber" || hl === "contact" || hl === "mobile"))
          );
          if (match && !Object.values(autoMap).includes(match.key)) {
            autoMap[h] = match.key;
          }
        }
        setColumnMap(autoMap);
        setStep(1);
        toast.success(`Parsed ${json.length} rows from ${file.name}`);
      } catch (err) {
        setError("Failed to parse file: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const handleColumnMap = () => {
    if (!selectedGroup) {
      setError(`Please select a ${groupLabel.toLowerCase()} for this import`);
      return;
    }
    const missing = TARGET_FIELDS.filter((f) => f.required && !Object.values(columnMap).includes(f.key));
    if (missing.length) {
      setError(`Please map required fields: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }
    setStep(2);
  };

  const handleValidate = async () => {
    if (!selectedGroup) {
      setError(`Please select a ${groupLabel.toLowerCase()} for this import`);
      return;
    }

    setLoading(true);
    setError("");

    const mappedRows = rawRows.map((row) => {
      const entry = {};
      for (const [csvCol, targetKey] of Object.entries(columnMap)) {
        entry[targetKey] = row[csvCol];
      }
      return entry;
    });

    try {
      const result = await apiCall("/api/participants/import/validate", {
        method: "POST",
        body: JSON.stringify({ rows: mappedRows, group_id: selectedGroup, filename }),
      });
      setJobId(result.job_id);
      setValidationSummary(result.summary);
      setValidatedRows(result.rows);

      const decisions = {};
      for (const row of result.rows) {
        decisions[row.index] = row.status === "duplicate" ? "skip" : "import";
      }
      setRowDecisions(decisions);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDecisionChange = (index, action) => {
    setRowDecisions((prev) => ({ ...prev, [index]: action }));
  };

  const handleImport = async () => {
    setStep(4);
    setLoading(true);
    setError("");

    const importRows = validatedRows
      .filter((r) => r.status !== "error")
      .map((r) => ({
        index: r.index,
        action: rowDecisions[r.index] || "import",
        name: r.name,
        class: r.class,
        email: r.email,
        admission_no: r.admission_no,
        phone: r.phone,
      }));

    try {
      const res = await apiCall("/api/participants/import/execute", {
        method: "POST",
        body: JSON.stringify({ job_id: jobId, rows: importRows }),
      });
      setResult(res);
      setStep(5);
      toast.success(`Imported ${res.imported} participants`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setStep(0);
    setError("");
    setRawHeaders([]);
    setRawRows([]);
    setFilename("");
    setSelectedGroup("");
    setColumnMap({});
    setJobId(null);
    setValidationSummary(null);
    setValidatedRows([]);
    setRowDecisions({});
    setResult(null);
  };

  const getMappedRowsCount = () => {
    return Object.values(columnMap).filter((v) => v).length >= 3 ? rawRows.length : 0;
  };

  const previewCounts = () => {
    const decisions = Object.values(rowDecisions);
    const importCount = decisions.filter((d) => d === "import").length;
    const updateCount = decisions.filter((d) => d === "update").length;
    const skipCount = decisions.filter((d) => d === "skip").length;
    return { importCount, updateCount, skipCount };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                i === step ? "bg-accent-amber text-white" : i < step ? "bg-accent-green text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <CheckCircle className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-xs ${i === step ? "font-semibold text-card-foreground" : "text-muted-foreground"}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-accent-red-tint border border-accent-red/20 text-accent-red px-3 py-2 rounded-lg text-sm" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6 p-0" onClick={() => setError("")}>x</Button>
        </div>
      )}

      {step === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm mb-2 text-card-foreground">Upload a CSV or Excel file</p>
            <p className="text-xs mb-4 text-muted-foreground">Supports .csv, .xlsx, .xls (max 5000 rows)</p>
            <label className="inline-flex items-center justify-center bg-accent-amber text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-accent-amber/90 text-sm font-medium">
              Choose File
              <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="hidden" />
            </label>
            {filename && (
              <p className="mt-2 text-sm text-accent-green">{filename} loaded</p>
            )}

            <button
              type="button"
              onClick={() => setShowFormat((prev) => !prev)}
              className="mt-4 text-xs underline-offset-2 underline text-muted-foreground"
            >
              {showFormat ? "Hide" : "Show"} supported format
            </button>

            {showFormat && (
              <div className="mt-3 mx-auto max-w-xl text-left rounded-lg border p-4 bg-card border-border">
                <p className="text-xs font-semibold mb-2 text-card-foreground">Your file should look like this:</p>
                <div className="overflow-x-auto rounded border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted">
                        <TableHead className="text-xs font-medium text-card-foreground">Name</TableHead>
                        <TableHead className="text-xs font-medium text-card-foreground">Class</TableHead>
                        <TableHead className="text-xs font-medium text-card-foreground">Email</TableHead>
                        <TableHead className="text-xs font-medium text-card-foreground">Admission No</TableHead>
                        <TableHead className="text-xs font-medium text-card-foreground">Phone</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-xs text-card-foreground">John Doe</TableCell>
                        <TableCell className="text-xs text-card-foreground">10A</TableCell>
                        <TableCell className="text-xs text-card-foreground">john@school.edu</TableCell>
                        <TableCell className="text-xs text-muted-foreground">ADM2024001</TableCell>
                        <TableCell className="text-xs text-muted-foreground">9876543210</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-xs text-card-foreground">Jane Smith</TableCell>
                        <TableCell className="text-xs text-card-foreground">10B</TableCell>
                        <TableCell className="text-xs text-card-foreground">jane@school.edu</TableCell>
                        <TableCell className="text-xs text-muted-foreground">ADM2024002</TableCell>
                        <TableCell className="text-xs text-muted-foreground">9876543211</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-xs text-card-foreground">Bob Wilson</TableCell>
                        <TableCell className="text-xs text-card-foreground">11C</TableCell>
                        <TableCell className="text-xs text-card-foreground">bob@school.edu</TableCell>
                        <TableCell className="text-xs text-muted-foreground">&mdash;</TableCell>
                        <TableCell className="text-xs text-muted-foreground">9876543212</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs mt-2 text-muted-foreground">
                  Column headers are matched automatically &mdash; order does not matter. <strong>Name</strong>, <strong>Class</strong>, and <strong>Email</strong> are required.
                </p>
              </div>
            )}

            {selectedGroup ? (
              <div className="mt-4">
                <p className="text-xs font-medium mb-1 text-muted-foreground">Target {groupLabel}</p>
                <p className="text-sm font-semibold text-accent-green">{groups.find((g) => g._id === selectedGroup)?.name}</p>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-xs font-medium mb-1 text-muted-foreground">{groupLabel}</p>
                <p className="text-sm text-muted-foreground">Select a {groupLabel.toLowerCase()} in the next step</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Map Columns</CardTitle>
            <p className="text-sm text-muted-foreground">Map CSV/Excel columns to participant fields</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Target {groupLabel} *</Label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder={`Select ${groupLabel}`} />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g._id} value={g._id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border">
                    <TableHead className="text-xs uppercase text-muted-foreground">CSV Column</TableHead>
                    <TableHead className="text-xs uppercase text-muted-foreground">Maps To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rawHeaders.map((h) => (
                    <TableRow key={h} className="border-b border-border">
                      <TableCell className="text-sm text-card-foreground">{h}</TableCell>
                      <TableCell>
                        <Select
                          value={columnMap[h] || ""}
                          onValueChange={(v) => setColumnMap((prev) => ({ ...prev, [h]: v }))}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="&mdash; Skip &mdash;" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="skip">&mdash; Skip &mdash;</SelectItem>
                            {TARGET_FIELDS.map((f) => (
                              <SelectItem
                                key={f.key}
                                value={f.key}
                                disabled={f.required && Object.values(columnMap).includes(f.key) && columnMap[h] !== f.key}
                              >
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <p className="text-xs text-muted-foreground">
              {getMappedRowsCount() > 0 ? `${getMappedRowsCount()} rows ready` : "Map required fields (Name *, Class *, Email *) to proceed"}
            </p>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
              <Button disabled={getMappedRowsCount() === 0} onClick={handleColumnMap}>Continue</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Validate</CardTitle>
            <p className="text-sm text-muted-foreground">
              {filename} &rarr; {getMappedRowsCount()} mapped rows &rarr; {groups.find((g) => g._id === selectedGroup)?.name || `Selected ${groupLabel}`}
            </p>
          </CardHeader>
          <CardContent>
            <Button onClick={handleValidate} disabled={loading}>
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Validating...</>
              ) : (
                "Run Validation"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex gap-4 text-sm text-card-foreground">
              <span>Total: <strong>{validationSummary?.total}</strong></span>
              <span className="text-accent-green">Valid: <strong>{validationSummary?.valid}</strong></span>
              <span className="text-accent-amber">Duplicates: <strong>{validationSummary?.duplicates}</strong></span>
              <span className="text-accent-red">Errors: <strong>{validationSummary?.errors}</strong></span>
            </div>
          </Card>

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead className="text-xs uppercase text-muted-foreground">#</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">Name</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">Class</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">Email</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">Admission No</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">Phone</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validatedRows.map((row) => {
                  const isDuplicate = row.status === "duplicate";
                  const isError = row.status === "error";
                  return (
                    <TableRow key={row.index} className="border-b border-border">
                      <TableCell className="text-sm text-card-foreground">{row.index + 1}</TableCell>
                      <TableCell className="text-sm text-card-foreground">{row.name}</TableCell>
                      <TableCell className="text-sm text-card-foreground">{row.class}</TableCell>
                      <TableCell className="text-sm text-card-foreground">{row.email || "—"}</TableCell>
                      <TableCell className="text-sm text-card-foreground">{row.admission_no || "—"}</TableCell>
                      <TableCell className="text-sm text-card-foreground">{row.phone || "—"}</TableCell>
                      <TableCell>
                        {isDuplicate ? (
                          <Badge variant="outline" className="text-accent-amber bg-accent-amber-tint border-accent-amber/20">Duplicate</Badge>
                        ) : isError ? (
                          <Badge variant="error" title={row.errors?.join(", ")}>Error</Badge>
                        ) : (
                          <Badge variant="success">Valid</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isDuplicate ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Select
                                value={rowDecisions[row.index] || "skip"}
                                onValueChange={(v) => handleDecisionChange(row.index, v)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="skip">Skip</SelectItem>
                                  <SelectItem value="update">Update</SelectItem>
                                </SelectContent>
                              </Select>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="center">
                              <p className="text-sm max-w-xs">
                                Update existing participant with new data (keeps existing password)
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        ) : isError ? (
                          <span className="text-xs text-muted-foreground">Auto-skipped</span>
                        ) : (
                          <span className="text-xs text-accent-green">Will import</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="text-sm font-medium text-card-foreground">
            Will import: <strong className="text-accent-green">{previewCounts().importCount}</strong>{" "}
            | Will update: <strong className="text-accent-amber">{previewCounts().updateCount}</strong>{" "}
            | Will skip: <strong className="text-muted-foreground">{previewCounts().skipCount}</strong>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            <Button
              onClick={handleImport}
              disabled={loading || previewCounts().importCount + previewCounts().updateCount === 0}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Importing...</>
              ) : (
                `Import ${previewCounts().importCount + previewCounts().updateCount} Rows`
              )}
            </Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="text-center py-8 text-card-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-accent-amber mx-auto mb-4" />
          <p>Importing participants&hellip;</p>
        </div>
      )}

      {step === 5 && result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-accent-green">Import Complete</CardTitle>
            <p className="text-sm text-muted-foreground">
              Imported into <strong>{groups.find((g) => g._id === selectedGroup)?.name || groupLabel}</strong>
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-accent-green/10 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-accent-green">{result.imported}</p>
                <p className="text-xs text-accent-green">Imported</p>
              </div>
              <div className="bg-accent-amber-tint rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-accent-amber">{result.updated}</p>
                <p className="text-xs text-accent-amber">Updated</p>
              </div>
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-muted-foreground">{result.skipped}</p>
                <p className="text-xs text-muted-foreground">Skipped</p>
              </div>
              <div className={`rounded-lg p-4 text-center ${result.errors > 0 ? "bg-accent-red-tint" : "bg-muted"}`}>
                <p className={`text-2xl font-bold ${result.errors > 0 ? "text-accent-red" : "text-muted-foreground"}`}>{result.errors}</p>
                <p className={`text-xs ${result.errors > 0 ? "text-accent-red" : "text-muted-foreground"}`}>Errors</p>
              </div>
            </div>

            {result.credentials?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-card-foreground">Setup Links</h4>
                <div className="overflow-x-auto rounded-lg border border-border mb-4">
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs">Email</TableHead>
                        <TableHead className="text-xs">Setup Link</TableHead>
                        <TableHead className="text-xs">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.credentials.map((c, i) => (
                        <TableRow key={i} className="border-b border-border">
                          <TableCell className="text-xs">{c.name}</TableCell>
                          <TableCell className="text-xs">{c.email}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate" title={c.setup_link}>{c.setup_link}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Badge variant={c.action === "imported" ? "success" : "outline"} className={c.action !== "imported" ? "text-accent-amber bg-accent-amber-tint border-accent-amber/20" : ""}>
                                {c.action === "imported" ? "New" : "Updated"}
                              </Badge>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                                navigator.clipboard.writeText(c.setup_link);
                                toast.success("Link copied");
                              }}>
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs mb-4 text-muted-foreground">
                  Each participant has a one-time setup link. Share the link with each participant to set their password.
                  The link expires once used.
                </p>
              </div>
            )}

            {result.error_details?.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead className="text-xs">Row</TableHead>
                      <TableHead className="text-xs">Field</TableHead>
                      <TableHead className="text-xs">Error</TableHead>
                      <TableHead className="text-xs">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.error_details.map((err, i) => (
                      <TableRow key={i} className="border-b border-border">
                        <TableCell className="text-xs">{err.row_number}</TableCell>
                        <TableCell className="text-xs">{err.field || "—"}</TableCell>
                        <TableCell className="text-xs text-accent-red">{err.error}</TableCell>
                        <TableCell className="text-xs">{JSON.stringify(err.row_data)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={resetAll}>Import Another File</Button>
              {result.credentials?.length > 0 && (
                <Button variant="outline" onClick={() => {
                  const wsData = [["Name", "Email", "Setup Link"]];
                  result.credentials.forEach(c => {
                    wsData.push([c.name, c.email, c.setup_link]);
                  });
                  const ws = XLSX.utils.aoa_to_sheet(wsData);
                  ws["!cols"] = [{ wch: 25 }, { wch: 30 }, { wch: 60 }];
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Setup Links");
                  const groupName = groups.find((g) => g._id === selectedGroup)?.name || "Import";
                  XLSX.writeFile(wb, `${groupName}_Setup_Links.xlsx`);
                  toast.success("Excel downloaded");
                }}>
                  <Download className="h-4 w-4 mr-1" /> Download Excel
                </Button>
              )}
              <Button onClick={onDone}>Back to Participants</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
);
}
function ImportParticipantsWithTooltip(props) {
  return (
    <TooltipProvider>
      <ImportParticipants {...props} />
    </TooltipProvider>
  );
}
ImportParticipantsWithTooltip.displayName = "ImportParticipantsWithTooltip";
export default ImportParticipantsWithTooltip;
