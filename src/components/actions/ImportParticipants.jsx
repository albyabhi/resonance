import React, { useState, useCallback, useMemo } from "react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  Copy,
  Download,
  Upload,
  FileSpreadsheet,
  X,
  Search,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { TooltipProvider } from "../ui/tooltip";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const TARGET_FIELDS = [
  { key: "name", label: "Name *", short: "Name", required: true },
  { key: "class", label: "Class *", short: "Class", required: true },
  { key: "email", label: "Email *", short: "Email", required: true },
  { key: "admission_no", label: "Admission No", short: "Admission No", required: false },
  { key: "phone", label: "Phone", short: "Phone", required: false },
  { key: "gender", label: "Gender", short: "Gender", required: false },
];

// Consolidated 4-step wizard (was 6: Upload / Map / Validate / Preview / Import / Summary).
// Validate is now the primary action inside "Map fields"; Import loading is an overlay, not a step.
const STEPS = [
  { key: "upload", label: "Upload", hint: "Choose file & group" },
  { key: "map", label: "Map fields", hint: "Match columns" },
  { key: "review", label: "Review", hint: "Fix & confirm" },
  { key: "done", label: "Done", hint: "Links & summary" },
];

function ImportParticipants({ groups, groupLabel = "Group", onDone }) {
  const { token } = useAuth();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false); // validate in progress
  const [isImporting, setIsImporting] = useState(false); // execute in progress (overlay, not a step)
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

  // Review toolbar state (client-side only — no API change)
  const [reviewFilter, setReviewFilter] = useState("all");
  const [reviewSearch, setReviewSearch] = useState("");
  // Done-step link manager state (minimal patch — no API change)
  const [doneSearch, setDoneSearch] = useState("");

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
            (t.key === "phone" && (hl === "phone number" || hl === "phonenumber" || hl === "contact" || hl === "mobile")) ||
            (t.key === "gender" && (hl === "sex" || hl === "m/f"))
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

  const clearFile = () => {
    setFilename("");
    setRawHeaders([]);
    setRawRows([]);
    setColumnMap({});
  };

  const missingRequired = TARGET_FIELDS.filter(
    (f) => f.required && !Object.values(columnMap).includes(f.key)
  );

  const mappedCount = useMemo(
    () => Object.values(columnMap).filter((v) => v && v !== "skip").length,
    [columnMap]
  );

  const getMappedRowsCount = () => {
    return mappedCount >= 3 ? rawRows.length : 0;
  };

  const handleMapSelect = (csvCol, v) => {
    setColumnMap((prev) => {
      const next = { ...prev };
      if (!v || v === "skip") delete next[csvCol];
      else next[csvCol] = v;
      return next;
    });
  };

  const handleValidate = async () => {
    if (!selectedGroup) {
      setError(`Please select a ${groupLabel.toLowerCase()} for this import`);
      return;
    }
    if (missingRequired.length) {
      setError(`Please map required fields: ${missingRequired.map((f) => f.label).join(", ")}`);
      return;
    }

    setLoading(true);
    setError("");

    const mappedRows = rawRows.map((row) => {
      const entry = {};
      for (const [csvCol, targetKey] of Object.entries(columnMap)) {
        if (!targetKey || targetKey === "skip") continue;
        entry[targetKey] = row[csvCol];
      }
      return entry;
    });

    try {
      const res = await apiCall("/api/participants/import/validate", {
        method: "POST",
        body: JSON.stringify({ rows: mappedRows, group_id: selectedGroup, filename }),
      });
      setJobId(res.job_id);
      setValidationSummary(res.summary);
      setValidatedRows(res.rows);

      const decisions = {};
      for (const row of res.rows) {
        decisions[row.index] = row.status === "duplicate" ? "skip" : "import";
      }
      setRowDecisions(decisions);
      setReviewFilter("all");
      setReviewSearch("");
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDecisionChange = (index, action) => {
    setRowDecisions((prev) => ({ ...prev, [index]: action }));
  };

  const handleBulkDuplicates = (action) => {
    setRowDecisions((prev) => {
      const next = { ...prev };
      for (const r of validatedRows) {
        if (r.status === "duplicate") next[r.index] = action;
      }
      return next;
    });
  };

  const handleImport = async () => {
    setIsImporting(true);
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
        gender: r.gender,
      }));

    try {
      const res = await apiCall("/api/participants/import/execute", {
        method: "POST",
        body: JSON.stringify({ job_id: jobId, rows: importRows }),
      });
      setResult(res);
      setStep(3);
      toast.success(`Imported ${res.imported} participants`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsImporting(false);
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
    setReviewFilter("all");
    setReviewSearch("");
    setDoneSearch("");
  };

  const previewCounts = () => {
    const decisions = Object.values(rowDecisions);
    const importCount = decisions.filter((d) => d === "import").length;
    const updateCount = decisions.filter((d) => d === "update").length;
    const skipCount = decisions.filter((d) => d === "skip").length;
    return { importCount, updateCount, skipCount };
  };

  const counts = previewCounts();
  const totalActionable = counts.importCount + counts.updateCount;

  const filteredReviewRows = useMemo(() => {
    const q = reviewSearch.trim().toLowerCase();
    return validatedRows.filter((r) => {
      if (reviewFilter === "duplicate" && r.status !== "duplicate") return false;
      if (reviewFilter === "error" && r.status !== "error") return false;
      if (reviewFilter === "valid" && !(r.status !== "duplicate" && r.status !== "error")) return false;
      if (reviewFilter === "attention" && !(r.status === "duplicate" || r.status === "error")) return false;
      if (q) {
        const hay = `${r.name || ""} ${r.email || ""} ${r.class || ""} ${r.gender || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [validatedRows, reviewFilter, reviewSearch]);

  const copyLink = (link) => {
    navigator.clipboard.writeText(link).then(
      () => toast.success("Link copied"),
      () => toast.error("Failed to copy")
    );
  };

  const copyAllDoneLinks = () => {
    if (!result?.credentials?.length) return;
    const text = result.credentials
      .map((c) => `${c.name} <${c.email}>\n${c.setup_link}`)
      .join("\n\n");
    if (text.length > 18000) {
      toast.error("Too many links for clipboard — use Download Excel instead");
      return;
    }
    copyLink(text);
  };

  const filteredCredentials = useMemo(() => {
    const q = doneSearch.trim().toLowerCase();
    if (!q) return result?.credentials || [];
    return (result?.credentials || []).filter((c) =>
      `${c.name || ""} ${c.email || ""}`.toLowerCase().includes(q)
    );
  }, [result?.credentials, doneSearch]);

  const downloadCredentialsExcel = () => {
    if (!result?.credentials?.length) return;
    const wsData = [["Name", "Email", "Setup Link"]];
    result.credentials.forEach((c) => {
      wsData.push([c.name, c.email, c.setup_link]);
    });
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [{ wch: 25 }, { wch: 30 }, { wch: 60 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Setup Links");
    const groupName = groups.find((g) => g._id === selectedGroup)?.name || "Import";
    XLSX.writeFile(wb, `${groupName}_Setup_Links.xlsx`);
    toast.success("Excel downloaded");
  };

  const selectedGroupName =
    groups.find((g) => g._id === selectedGroup)?.name || "";
  const progressPct = ((step + 1) / STEPS.length) * 100;

  const renderStatusBadge = (row) => {
    if (row.status === "duplicate")
      return (
        <Badge variant="outline" className="text-accent-amber bg-accent-amber-tint border-accent-amber/20">
          Duplicate
        </Badge>
      );
    if (row.status === "error")
      return (
        <Badge variant="error" title={row.errors?.join(", ")}>
          Error
        </Badge>
      );
    return <Badge variant="success">Valid</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* ── Stepper: compact on mobile, full dots on desktop ── */}
      <nav aria-label="Import progress">
        {/* Mobile: Step X of 4 + progress bar */}
        <div className="sm:hidden">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground" aria-live="polite">
              Step {step + 1} of {STEPS.length}
            </p>
            <p className="text-sm font-semibold text-card-foreground truncate">
              {STEPS[step].label}
              <span className="ml-1 font-normal text-muted-foreground hidden min-[400px]:inline">
                — {STEPS[step].hint}
              </span>
            </p>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
          >
            <div
              className="h-full rounded-full bg-accent-amber transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Desktop: 4 dots */}
        <ol className="hidden sm:flex items-center gap-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.key}>
              <li className="flex items-center gap-2 shrink-0" aria-current={i === step ? "step" : undefined}>
                <span
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                    i === step
                      ? "bg-accent-amber text-white"
                      : i < step
                        ? "bg-accent-green text-white"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < step ? <CheckCircle className="h-4 w-4" /> : i + 1}
                </span>
                <span
                  className={`text-xs ${i === step ? "font-semibold text-card-foreground" : "text-muted-foreground"}`}
                >
                  {s.label}
                </span>
              </li>
              {i < STEPS.length - 1 && <li aria-hidden className="flex-1 h-px bg-border min-w-4" />}
            </React.Fragment>
          ))}
        </ol>
      </nav>

      {error && (
        <div
          className="flex items-start gap-2 bg-accent-red-tint border border-accent-red/20 text-accent-red px-3 py-2.5 rounded-lg text-sm"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="flex-1 min-w-0 break-words">{error}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setError("")} aria-label="Dismiss error">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* ── Step 1: Upload ── */}
      {step === 0 && (
        <Card>
          <CardContent className="p-4 sm:p-8 sm:text-center">
            <div className="space-y-2 sm:mx-auto sm:max-w-md">
              <Label htmlFor="import-group">
                Target {groupLabel} <span className="text-accent-red">*</span>
              </Label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger id="import-group" className="w-full min-h-11 text-left">
                  <SelectValue placeholder={`Select ${groupLabel} *`} />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g._id} value={g._id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedGroup && (
                <p className="text-xs text-muted-foreground">
                  Required — every row will be imported into this {groupLabel.toLowerCase()}.
                </p>
              )}
            </div>

            <div className="mt-4 rounded-xl border-2 border-dashed border-border bg-muted/30 p-5 sm:p-8 text-center">
              <FileSpreadsheet className="mx-auto mb-2 h-8 w-8 text-muted-foreground" aria-hidden />
              <p className="text-sm font-medium text-card-foreground">Upload a CSV or Excel file</p>
              <p className="text-xs mb-4 text-muted-foreground">Supports .csv, .xlsx, .xls (max 5000 rows)</p>
              <label className="inline-flex min-h-11 items-center justify-center gap-2 bg-accent-amber text-white px-5 rounded-lg cursor-pointer hover:bg-accent-amber/90 text-sm font-medium">
                <Upload className="h-4 w-4" aria-hidden />
                {filename ? "Replace file" : "Choose File"}
                <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="hidden" />
              </label>
              {filename ? (
                <div className="mx-auto mt-3 flex max-w-md items-center gap-2 rounded-lg bg-card border border-border px-3 py-2 text-left">
                  <FileSpreadsheet className="h-4 w-4 shrink-0 text-accent-green" aria-hidden />
                  <p className="flex-1 min-w-0 truncate text-sm text-card-foreground" title={filename}>
                    {filename}
                    <span className="block text-xs font-normal text-accent-green">
                      {rawRows.length} rows parsed — continue to match columns
                    </span>
                  </p>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={clearFile} aria-label="Remove file">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="mt-3 sm:mx-auto sm:max-w-xl">
              <button
                type="button"
                onClick={() => setShowFormat((prev) => !prev)}
                aria-expanded={showFormat}
                className="min-h-9 text-xs underline-offset-2 underline text-muted-foreground px-2"
              >
                {showFormat ? "Hide" : "Show"} supported format
              </button>

              {showFormat && (
                <div className="mt-2 text-left rounded-lg border p-4 bg-card border-border">
                  <p className="text-xs font-semibold mb-2 text-card-foreground">Your file should look like this:</p>
                  {/* Mobile: stacked examples (no horizontal scroll) */}
                  <ul className="space-y-2 sm:hidden">
                    {[
                      { n: "John Doe", c: "10A", e: "john@school.edu", g: "male" },
                      { n: "Jane Smith", c: "10B", e: "jane@school.edu", g: "female" },
                    ].map((r) => (
                      <li key={r.e} className="rounded-lg bg-muted/40 p-2.5 text-xs">
                        <p className="font-semibold text-card-foreground">{r.n} <span className="font-normal text-muted-foreground">• {r.c} • {r.g}</span></p>
                        <p className="truncate text-muted-foreground">{r.e}</p>
                      </li>
                    ))}
                    <li className="text-xs text-muted-foreground">+ optional Admission No, Phone, Gender columns (male / female / other)</li>
                  </ul>
                  {/* Desktop: full table */}
                  <div className="hidden sm:block overflow-x-auto rounded border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted">
                          <TableHead className="text-xs font-medium text-card-foreground">Name</TableHead>
                          <TableHead className="text-xs font-medium text-card-foreground">Class</TableHead>
                          <TableHead className="text-xs font-medium text-card-foreground">Email</TableHead>
                          <TableHead className="text-xs font-medium text-card-foreground">Admission No</TableHead>
                          <TableHead className="text-xs font-medium text-card-foreground">Phone</TableHead>
                          <TableHead className="text-xs font-medium text-card-foreground">Gender</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="text-xs text-card-foreground">John Doe</TableCell>
                          <TableCell className="text-xs text-card-foreground">10A</TableCell>
                          <TableCell className="text-xs text-card-foreground">john@school.edu</TableCell>
                          <TableCell className="text-xs text-muted-foreground">ADM2024001</TableCell>
                          <TableCell className="text-xs text-muted-foreground">9876543210</TableCell>
                          <TableCell className="text-xs text-muted-foreground">male</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-xs text-card-foreground">Jane Smith</TableCell>
                          <TableCell className="text-xs text-card-foreground">10B</TableCell>
                          <TableCell className="text-xs text-card-foreground">jane@school.edu</TableCell>
                          <TableCell className="text-xs text-muted-foreground">ADM2024002</TableCell>
                          <TableCell className="text-xs text-muted-foreground">9876543211</TableCell>
                          <TableCell className="text-xs text-muted-foreground">female</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-xs mt-2 text-muted-foreground">
                    Headers are matched automatically — order does not matter. <strong>Name</strong>, <strong>Class</strong>, and <strong>Email</strong> are required. Gender accepts male / female / other.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col-reverse sm:flex-row gap-2 sm:justify-center">
              <Button
                className="w-full sm:w-auto min-h-11"
                disabled={!filename || !selectedGroup || rawRows.length === 0}
                onClick={() => setStep(1)}
              >
                Continue to match columns <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            {filename && !selectedGroup && (
              <p className="mt-2 text-xs text-accent-amber">Select a {groupLabel.toLowerCase()} above to continue.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Map fields (+ validate inline) ── */}
      {step === 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Match columns</CardTitle>
            <p className="text-sm text-muted-foreground">
              {filename || "Your file"} • {rawRows.length} rows • into{" "}
              <strong className="text-card-foreground">{selectedGroupName || groupLabel}</strong>
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="map-group">Target {groupLabel} *</Label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger id="map-group" className="w-full sm:max-w-xs min-h-11">
                  <SelectValue placeholder={`Select ${groupLabel}`} />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g._id} value={g._id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mobile: stacked mapping cards */}
            <ul className="space-y-2 md:hidden" aria-label="Column mapping">
              {rawHeaders.map((h) => {
                const mapped = columnMap[h];
                const field = TARGET_FIELDS.find((f) => f.key === mapped);
                return (
                  <li key={h} className="rounded-xl border border-border bg-card p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-card-foreground" title={h}>
                        {h}
                      </p>
                      {field?.required ? (
                        <Badge variant="outline" className="shrink-0 text-[10px]">Required</Badge>
                      ) : (
                        <Badge variant="outline" className="shrink-0 text-[10px] text-muted-foreground">Optional</Badge>
                      )}
                    </div>
                    <div className="mt-2">
                      <Label className="sr-only" htmlFor={`map-${h}`}>Map {h} to</Label>
                      <Select value={mapped || "skip"} onValueChange={(v) => handleMapSelect(h, v)}>
                        <SelectTrigger id={`map-${h}`} className="min-h-11 w-full">
                          <SelectValue placeholder="— Skip —" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip">— Skip —</SelectItem>
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
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Desktop: compact table */}
            <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border">
                    <TableHead className="text-xs uppercase text-muted-foreground">File Column</TableHead>
                    <TableHead className="text-xs uppercase text-muted-foreground">Maps To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rawHeaders.map((h) => (
                    <TableRow key={h} className="border-b border-border">
                      <TableCell className="text-sm text-card-foreground">{h}</TableCell>
                      <TableCell>
                        <Select
                          value={columnMap[h] || "skip"}
                          onValueChange={(v) => handleMapSelect(h, v)}
                        >
                          <SelectTrigger className="min-h-10 text-sm">
                            <SelectValue placeholder="— Skip —" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="skip">— Skip —</SelectItem>
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

            <p className="text-xs text-muted-foreground" aria-live="polite">
              {missingRequired.length
                ? `Still needed: ${missingRequired.map((f) => f.short).join(", ")}`
                : `${getMappedRowsCount()} rows ready to check`}
            </p>

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:pt-1">
              <Button variant="outline" className="min-h-11" onClick={() => setStep(0)}>
                <ArrowLeft className="h-4 w-4" aria-hidden /> Back
              </Button>
              <Button
                className="min-h-11 flex-1 sm:flex-none"
                disabled={loading || getMappedRowsCount() === 0 || missingRequired.length > 0}
                onClick={handleValidate}
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Checking rows…</>
                ) : (
                  <>Check {getMappedRowsCount() || ""} rows <ArrowRight className="h-4 w-4 ml-1" aria-hidden /></>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Review ── */}
      {step === 2 && (
        <div className="space-y-3">
          <Card className="p-3 sm:p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center" aria-live="polite">
              <div className="rounded-lg bg-muted/50 px-2 py-2.5">
                <p className="text-xl font-bold text-card-foreground">{validationSummary?.total ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="rounded-lg bg-accent-green/10 px-2 py-2.5">
                <p className="text-xl font-bold text-accent-green">{validationSummary?.valid ?? 0}</p>
                <p className="text-xs text-accent-green">Valid</p>
              </div>
              <div className="rounded-lg bg-accent-amber-tint px-2 py-2.5">
                <p className="text-xl font-bold text-accent-amber">{validationSummary?.duplicates ?? 0}</p>
                <p className="text-xs text-accent-amber">Duplicates</p>
              </div>
              <div className="rounded-lg bg-accent-red-tint px-2 py-2.5">
                <p className="text-xl font-bold text-accent-red">{validationSummary?.errors ?? 0}</p>
                <p className="text-xs text-accent-red">Errors</p>
              </div>
            </div>

            {/* Filter chips + search */}
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="Filter rows">
                {[
                  { k: "all", label: `All (${validatedRows.length})` },
                  { k: "attention", label: `Needs attention (${(validationSummary?.duplicates || 0) + (validationSummary?.errors || 0)})` },
                  { k: "duplicate", label: `Duplicates (${validationSummary?.duplicates || 0})` },
                  { k: "error", label: `Errors (${validationSummary?.errors || 0})` },
                  { k: "valid", label: `Valid (${validationSummary?.valid || 0})` },
                ].map((f) => (
                  <button
                    key={f.k}
                    role="tab"
                    aria-selected={reviewFilter === f.k}
                    onClick={() => setReviewFilter(f.k)}
                    className={`shrink-0 min-h-9 rounded-full border px-3 text-xs font-medium transition-colors ${
                      reviewFilter === f.k
                        ? "bg-card-foreground text-card border-card-foreground"
                        : "border-border text-muted-foreground hover:text-card-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  value={reviewSearch}
                  onChange={(e) => setReviewSearch(e.target.value)}
                  placeholder="Search name or email…"
                  className="pl-9 min-h-11"
                  aria-label="Search review rows"
                />
              </div>
              {(validationSummary?.duplicates || 0) > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>All duplicates:</span>
                  <Button variant="outline" size="sm" className="min-h-9" onClick={() => handleBulkDuplicates("skip")}>Skip all</Button>
                  <Button variant="outline" size="sm" className="min-h-9" onClick={() => handleBulkDuplicates("update")}>Update all</Button>
                  <span className="hidden sm:inline">Update keeps the existing password.</span>
                </div>
              )}
            </div>
          </Card>

          {/* Mobile cards */}
          <ul className="space-y-2 md:hidden" aria-label="Rows to review">
            {filteredReviewRows.map((row) => {
              const isDuplicate = row.status === "duplicate";
              const isError = row.status === "error";
              return (
                <li key={row.index} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-card-foreground">
                        {row.index + 1}. {row.name || "(no name)"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {row.class || "—"} • {row.gender || "—"} • {row.email || "—"}
                      </p>
                    </div>
                    {renderStatusBadge(row)}
                  </div>

                  {isError && row.errors?.length > 0 && (
                    <p className="mt-2 rounded-lg bg-accent-red-tint px-2.5 py-1.5 text-xs text-accent-red">
                      {row.errors.join(", ")}
                    </p>
                  )}

                  <details className="mt-2 text-xs text-muted-foreground">
                    <summary className="cursor-pointer underline-offset-2 hover:underline min-h-8 py-1">
                      Details
                    </summary>
                    <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
                      <dt>Admission</dt><dd className="text-card-foreground">{row.admission_no || "—"}</dd>
                      <dt>Phone</dt><dd className="text-card-foreground">{row.phone || "—"}</dd>
                      <dt>Email</dt><dd className="truncate text-card-foreground">{row.email || "—"}</dd>
                      <dt>Class</dt><dd className="text-card-foreground">{row.class || "—"}</dd>
                      <dt>Gender</dt><dd className="text-card-foreground capitalize">{row.gender || "—"}</dd>
                    </dl>
                  </details>

                  <div className="mt-2">
                    {isDuplicate ? (
                      <div>
                        <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-muted/50 p-1" role="group" aria-label={`Decision for ${row.name}`}>
                          <button
                            onClick={() => handleDecisionChange(row.index, "skip")}
                            aria-pressed={(rowDecisions[row.index] || "skip") === "skip"}
                            className={`min-h-10 rounded-md text-sm font-medium transition-colors ${
                              (rowDecisions[row.index] || "skip") === "skip"
                                ? "bg-card shadow-sm text-card-foreground"
                                : "text-muted-foreground"
                            }`}
                          >
                            Skip
                          </button>
                          <button
                            onClick={() => handleDecisionChange(row.index, "update")}
                            aria-pressed={rowDecisions[row.index] === "update"}
                            className={`min-h-10 rounded-md text-sm font-medium transition-colors ${
                              rowDecisions[row.index] === "update"
                                ? "bg-accent-amber text-white"
                                : "text-muted-foreground"
                            }`}
                          >
                            Update
                          </button>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">Update keeps the existing password.</p>
                      </div>
                    ) : isError ? (
                      <p className="text-xs text-muted-foreground">Auto-skipped — fix the file and re-upload.</p>
                    ) : (
                      <p className="text-xs font-medium text-accent-green">✓ Will import</p>
                    )}
                  </div>
                </li>
              );
            })}
            {filteredReviewRows.length === 0 && (
              <li className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No rows match this filter.
              </li>
            )}
          </ul>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead className="text-xs uppercase text-muted-foreground">#</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">Name</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">Class</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">Email</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">Admission No</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">Phone</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">Gender</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReviewRows.map((row) => {
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
                      <TableCell className="text-sm capitalize text-card-foreground">{row.gender || "—"}</TableCell>
                      <TableCell>{renderStatusBadge(row)}</TableCell>
                      <TableCell>
                        {isDuplicate ? (
                          <Select
                            value={rowDecisions[row.index] || "skip"}
                            onValueChange={(v) => handleDecisionChange(row.index, v)}
                          >
                            <SelectTrigger className="min-h-10 text-xs min-w-28" aria-label={`Decision for ${row.name}. Update keeps existing password.`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="skip">Skip</SelectItem>
                              <SelectItem value="update">Update</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : isError ? (
                          <span className="text-xs text-muted-foreground" title={row.errors?.join(", ")}>Auto-skipped</span>
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

          <Card className="p-3 sm:p-4">
            <p className="text-sm font-medium text-card-foreground" aria-live="polite">
              Will import <strong className="text-accent-green">{counts.importCount}</strong>
              {" • "}Update <strong className="text-accent-amber">{counts.updateCount}</strong>
              {" • "}Skip <strong className="text-muted-foreground">{counts.skipCount}</strong>
            </p>
            <div className="mt-3 flex flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" className="min-h-11" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4" aria-hidden /> Back to mapping
              </Button>
              <Button
                className="min-h-11 flex-1 sm:flex-none"
                onClick={handleImport}
                disabled={isImporting || totalActionable === 0}
              >
                {isImporting ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Importing…</>
                ) : (
                  `Import ${totalActionable} row${totalActionable === 1 ? "" : "s"}`
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── Step 4: Done ── */}
      {step === 3 && result && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-accent-green flex items-center gap-2">
              <CheckCircle className="h-5 w-5" aria-hidden /> Import complete
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Into <strong className="text-card-foreground">{selectedGroupName || groupLabel}</strong>
              {" • "}{filename}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-accent-green/10 rounded-lg p-3 sm:p-4 text-center">
                <p className="text-2xl font-bold text-accent-green">{result.imported}</p>
                <p className="text-xs text-accent-green">Imported</p>
              </div>
              <div className="bg-accent-amber-tint rounded-lg p-3 sm:p-4 text-center">
                <p className="text-2xl font-bold text-accent-amber">{result.updated}</p>
                <p className="text-xs text-accent-amber">Updated</p>
              </div>
              <div className="bg-muted rounded-lg p-3 sm:p-4 text-center">
                <p className="text-2xl font-bold text-muted-foreground">{result.skipped}</p>
                <p className="text-xs text-muted-foreground">Skipped</p>
              </div>
              <div className={`rounded-lg p-3 sm:p-4 text-center ${result.errors > 0 ? "bg-accent-red-tint" : "bg-muted"}`}>
                <p className={`text-2xl font-bold ${result.errors > 0 ? "text-accent-red" : "text-muted-foreground"}`}>{result.errors}</p>
                <p className={`text-xs ${result.errors > 0 ? "text-accent-red" : "text-muted-foreground"}`}>Errors</p>
              </div>
            </div>

            {result.credentials?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-card-foreground">
                  Setup links ({result.credentials.length})
                </h4>
                {/* Sticky bulk bar: copy-all + search (minimal patch for 100s) */}
                <div className="mb-2 flex flex-col sm:flex-row gap-2 sm:items-center">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="min-h-9" onClick={copyAllDoneLinks}>
                      <Copy className="h-3.5 w-3.5 mr-1" aria-hidden /> Copy all
                    </Button>
                    <Button variant="outline" size="sm" className="min-h-9" onClick={downloadCredentialsExcel}>
                      <Download className="h-3.5 w-3.5 mr-1" aria-hidden /> Excel
                    </Button>
                  </div>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input
                      value={doneSearch}
                      onChange={(e) => setDoneSearch(e.target.value)}
                      placeholder="Search name or email…"
                      className="pl-9 min-h-9"
                      aria-label="Search setup links"
                    />
                  </div>
                </div>
                <p className="text-xs mb-2 text-muted-foreground">
                  Tip: no need to share every link — participants can self-serve at Participant Login → Claim with competition slug + admission no + email.
                </p>
                {/* Mobile cards */}
                <ul className="space-y-2 md:hidden">
                  {filteredCredentials.map((c, i) => (
                    <li key={i} className="rounded-xl border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 flex-1 truncate text-sm font-medium text-card-foreground">{c.name}</p>
                        <Badge
                          variant={c.action === "imported" ? "success" : "outline"}
                          className={c.action !== "imported" ? "text-accent-amber bg-accent-amber-tint border-accent-amber/20 shrink-0" : "shrink-0"}
                        >
                          {c.action === "imported" ? "New" : "Updated"}
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground mt-0.5">{c.email}</p>
                      <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-2">
                        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={c.setup_link}>
                          {c.setup_link}
                        </span>
                        <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => copyLink(c.setup_link)} aria-label={`Copy setup link for ${c.name}`}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto rounded-lg border border-border mb-4">
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
                      {filteredCredentials.map((c, i) => (
                        <TableRow key={i} className="border-b border-border">
                          <TableCell className="text-xs">{c.name}</TableCell>
                          <TableCell className="text-xs">{c.email}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate" title={c.setup_link}>{c.setup_link}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Badge variant={c.action === "imported" ? "success" : "outline"} className={c.action !== "imported" ? "text-accent-amber bg-accent-amber-tint border-accent-amber/20" : ""}>
                                {c.action === "imported" ? "New" : "Updated"}
                              </Badge>
                              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => copyLink(c.setup_link)} aria-label={`Copy setup link for ${c.name}`}>
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {filteredCredentials.length === 0 && (
                  <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    No links match “{doneSearch}”.
                  </p>
                )}
                <p className="text-xs mb-4 text-muted-foreground">
                  Each participant has a one-time setup link. Share it so they can set their password.
                  The link expires once used.
                </p>
              </div>
            )}

            {result.error_details?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-accent-red">
                  Errors ({result.error_details.length})
                </h4>
                {/* Mobile cards */}
                <ul className="space-y-2 md:hidden">
                  {result.error_details.map((err, i) => (
                    <li key={i} className="rounded-xl border border-accent-red/20 bg-accent-red-tint/40 p-3 text-xs">
                      <p className="font-semibold text-card-foreground">Row {err.row_number} {err.field ? `• ${err.field}` : ""}</p>
                      <p className="mt-0.5 text-accent-red">{err.error}</p>
                      {err.row_data && (
                        <details className="mt-1 text-muted-foreground">
                          <summary className="cursor-pointer min-h-8 py-1">Show row data</summary>
                          <dl className="mt-1 space-y-0.5">
                            {Object.entries(err.row_data).map(([k, v]) => (
                              <div key={k} className="flex gap-2">
                                <dt className="shrink-0 font-medium">{k}:</dt>
                                <dd className="min-w-0 break-words text-card-foreground">{String(v ?? "—")}</dd>
                              </div>
                            ))}
                          </dl>
                        </details>
                      )}
                    </li>
                  ))}
                </ul>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
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
                          <TableCell className="text-xs max-w-64 break-words">
                            {err.row_data
                              ? Object.entries(err.row_data).map(([k, v]) => `${k}: ${v ?? "—"}`).join(" • ")
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
              <Button variant="outline" className="min-h-11" onClick={resetAll}>
                <RotateCcw className="h-4 w-4 mr-1" aria-hidden /> Import another file
              </Button>
              {result.credentials?.length > 0 && (
                <Button variant="outline" className="min-h-11" onClick={downloadCredentialsExcel}>
                  <Download className="h-4 w-4 mr-1" aria-hidden /> Download Excel
                </Button>
              )}
              <Button className="min-h-11 sm:flex-1" onClick={onDone}>Back to Participants</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import overlay (replaces old "Import" step) */}
      {isImporting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="alertdialog"
          aria-live="assertive"
          aria-label="Importing participants"
        >
          <div className="w-full max-w-sm rounded-xl bg-card p-6 text-center shadow-soft">
            <Loader2 className="h-8 w-8 animate-spin text-accent-amber mx-auto mb-3" aria-hidden />
            <p className="font-semibold text-card-foreground">Importing participants…</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {totalActionable} row{totalActionable === 1 ? "" : "s"} • please keep this open
            </p>
          </div>
        </div>
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
