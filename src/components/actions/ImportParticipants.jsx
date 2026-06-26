import React, { useState, useCallback } from "react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const TARGET_FIELDS = [
  { key: "name", label: "Name *", required: true },
  { key: "class", label: "Class *", required: true },
  { key: "admission_no", label: "Admission No", required: false },
  { key: "phone", label: "Phone", required: false },
];

const STEPS = ["Upload", "Map Columns", "Validate", "Preview", "Import", "Summary"];

export default function ImportParticipants({ houses, onDone }) {
  const { token } = useAuth();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [rawHeaders, setRawHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [filename, setFilename] = useState("");
  const [selectedHouse, setSelectedHouse] = useState("");

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
    const missing = TARGET_FIELDS.filter((f) => f.required && !Object.values(columnMap).includes(f.key));
    if (missing.length) {
      setError(`Please map required fields: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }
    setStep(2);
  };

  const handleValidate = async () => {
    if (!selectedHouse) {
      setError("Please select a house/group for this import");
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
        body: JSON.stringify({ rows: mappedRows, group_id: selectedHouse, filename }),
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
    setLoading(true);
    setError("");

    const importRows = validatedRows
      .filter((r) => r.status !== "error")
      .map((r) => ({
        index: r.index,
        action: rowDecisions[r.index] || "import",
        name: r.name,
        class: r.class,
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
    setSelectedHouse("");
    setColumnMap({});
    setJobId(null);
    setValidationSummary(null);
    setValidatedRows([]);
    setRowDecisions({});
    setResult(null);
  };

  const getMappedRowsCount = () => {
    return Object.values(columnMap).filter((v) => v).length >= 2 ? rawRows.length : 0;
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
                i === step ? "bg-orange-600 text-white" : i < step ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`text-xs ${i === step ? "font-semibold" : "text-gray-400"}`} style={{ color: i === step ? 'var(--card-fg)' : undefined }}>{s}</span>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-300" />}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg" role="alert">
          {error}
          <button onClick={() => setError("")} className="ml-2 text-red-500 focus:outline-none">×</button>
        </div>
      )}

      {/* STEP 0: Upload */}
      {step === 0 && (
        <div
          className="border-2 border-dashed rounded-xl p-8 text-center"
          style={{ borderColor: 'var(--border-divider)', backgroundColor: 'var(--surface)' }}
        >
          <p className="text-sm mb-2" style={{ color: 'var(--card-fg)' }}>Upload a CSV or Excel file</p>
          <p className="text-xs mb-4" style={{ color: 'var(--chart-axis)' }}>Supports .csv, .xlsx, .xls (max 5000 rows)</p>
          <label className="inline-block bg-orange-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-orange-700">
            Choose File
            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="hidden" />
          </label>
          {filename && (
            <p className="mt-2 text-sm text-green-600">{filename} loaded</p>
          )}

          <button
            type="button"
            onClick={() => setShowFormat((prev) => !prev)}
            className="mt-4 text-xs underline-offset-2 underline"
            style={{ color: 'var(--chart-axis)' }}
          >
            {showFormat ? "Hide" : "Show"} supported format
          </button>

          {showFormat && (
            <div className="mt-3 mx-auto max-w-xl text-left rounded-lg border p-4" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-divider)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--card-fg)' }}>Your file should look like this:</p>
              <div className="overflow-x-auto rounded border" style={{ borderColor: 'var(--border-divider)' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b" style={{ borderBottomColor: 'var(--border-divider)', backgroundColor: 'var(--surface)' }}>
                      <th className="p-2 text-left font-medium" style={{ color: 'var(--card-fg)' }}>Name</th>
                      <th className="p-2 text-left font-medium" style={{ color: 'var(--card-fg)' }}>Class</th>
                      <th className="p-2 text-left font-medium" style={{ color: 'var(--card-fg)' }}>Admission No</th>
                      <th className="p-2 text-left font-medium" style={{ color: 'var(--card-fg)' }}>Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b" style={{ borderBottomColor: 'var(--border-divider)' }}>
                      <td className="p-2" style={{ color: 'var(--card-fg)' }}>John Doe</td>
                      <td className="p-2" style={{ color: 'var(--card-fg)' }}>10A</td>
                      <td className="p-2" style={{ color: 'var(--chart-axis)' }}>ADM2024001</td>
                      <td className="p-2" style={{ color: 'var(--chart-axis)' }}>9876543210</td>
                    </tr>
                    <tr className="border-b" style={{ borderBottomColor: 'var(--border-divider)' }}>
                      <td className="p-2" style={{ color: 'var(--card-fg)' }}>Jane Smith</td>
                      <td className="p-2" style={{ color: 'var(--card-fg)' }}>10B</td>
                      <td className="p-2" style={{ color: 'var(--chart-axis)' }}>ADM2024002</td>
                      <td className="p-2" style={{ color: 'var(--chart-axis)' }}>9876543211</td>
                    </tr>
                    <tr>
                      <td className="p-2" style={{ color: 'var(--card-fg)' }}>Bob Wilson</td>
                      <td className="p-2" style={{ color: 'var(--card-fg)' }}>11C</td>
                      <td className="p-2" style={{ color: 'var(--chart-axis)' }}>—</td>
                      <td className="p-2" style={{ color: 'var(--chart-axis)' }}>9876543212</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--chart-axis)' }}>
                Column headers are matched automatically — order does not matter. Only <strong>Name</strong> and <strong>Class</strong> are required.
              </p>
            </div>
          )}

          <div className="mt-4">
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--chart-axis)' }}>Target House / Group</p>
            <select
              value={selectedHouse}
              onChange={(e) => setSelectedHouse(e.target.value)}
              className="px-3 py-2 min-h-[44px] border rounded-lg text-sm w-full max-w-xs"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
            >
              <option value="">Select house/group</option>
              {houses.map((h) => (
                <option key={h._id} value={h._id}>{h.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* STEP 1: Map Columns */}
      {step === 1 && (
        <div
          className="rounded-xl border p-6 space-y-4"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}
        >
          <h3 className="text-lg font-semibold" style={{ color: 'var(--card-fg)' }}>Map Columns</h3>
          <p className="text-sm" style={{ color: 'var(--chart-axis)' }}>Map CSV/Excel columns to participant fields</p>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b" style={{ borderBottomColor: 'var(--border-divider)' }}>
                  <th className="text-left p-2 text-xs uppercase" style={{ color: 'var(--chart-axis)' }}>CSV Column</th>
                  <th className="text-left p-2 text-xs uppercase" style={{ color: 'var(--chart-axis)' }}>Maps To</th>
                </tr>
              </thead>
              <tbody>
                {rawHeaders.map((h) => (
                  <tr key={h} className="border-b" style={{ borderBottomColor: 'var(--border-divider)' }}>
                    <td className="p-2 text-sm" style={{ color: 'var(--card-fg)' }}>{h}</td>
                    <td className="p-2">
                      <select
                        value={columnMap[h] || ""}
                        onChange={(e) => setColumnMap((prev) => ({ ...prev, [h]: e.target.value }))}
                        className="px-2 py-1 border rounded text-sm"
                        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                      >
                        <option value="">— Skip —</option>
                        {TARGET_FIELDS.map((f) => (
                          <option key={f.key} value={f.key} disabled={f.required && Object.values(columnMap).includes(f.key) && columnMap[h] !== f.key}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs" style={{ color: 'var(--chart-axis)' }}>
            {getMappedRowsCount() > 0 ? `${getMappedRowsCount()} rows ready` : "Map required fields (Name *, Class *) to proceed"}
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => setStep(0)}
              className="px-4 py-2 border rounded-lg text-sm"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
            >
              Back
            </button>
            <button
              onClick={handleColumnMap}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm disabled:opacity-50"
              disabled={getMappedRowsCount() === 0}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Validate */}
      {step === 2 && (
        <div
          className="rounded-xl border p-6 space-y-4"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}
        >
          <h3 className="text-lg font-semibold" style={{ color: 'var(--card-fg)' }}>Validate</h3>
          <p className="text-sm" style={{ color: 'var(--chart-axis)' }}>
            {filename} → {getMappedRowsCount()} mapped rows → {houses.find((h) => h._id === selectedHouse)?.name || "Selected House"}
          </p>
          <button
            onClick={handleValidate}
            disabled={loading}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg text-sm disabled:opacity-50"
          >
            {loading ? "Validating…" : "Run Validation"}
          </button>
        </div>
      )}

      {/* STEP 3: Preview */}
      {step === 3 && (
        <div className="space-y-4">
          <div
            className="rounded-xl border p-4 flex gap-4 text-sm"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}
          >
            <span style={{ color: 'var(--card-fg)' }}>Total: <strong>{validationSummary?.total}</strong></span>
            <span className="text-green-600">Valid: <strong>{validationSummary?.valid}</strong></span>
            <span className="text-yellow-600">Duplicates: <strong>{validationSummary?.duplicates}</strong></span>
            <span className="text-red-600">Errors: <strong>{validationSummary?.errors}</strong></span>
          </div>

          <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-card)' }}>
            <table className="min-w-full">
              <thead style={{ backgroundColor: 'var(--surface)' }}>
                <tr>
                  <th className="p-2 text-left text-xs uppercase" style={{ color: 'var(--chart-axis)' }}>#</th>
                  <th className="p-2 text-left text-xs uppercase" style={{ color: 'var(--chart-axis)' }}>Name</th>
                  <th className="p-2 text-left text-xs uppercase" style={{ color: 'var(--chart-axis)' }}>Class</th>
                  <th className="p-2 text-left text-xs uppercase" style={{ color: 'var(--chart-axis)' }}>Admission No</th>
                  <th className="p-2 text-left text-xs uppercase" style={{ color: 'var(--chart-axis)' }}>Phone</th>
                  <th className="p-2 text-left text-xs uppercase" style={{ color: 'var(--chart-axis)' }}>Status</th>
                  <th className="p-2 text-left text-xs uppercase" style={{ color: 'var(--chart-axis)' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {validatedRows.map((row) => {
                  const isDuplicate = row.status === "duplicate";
                  const isError = row.status === "error";
                  return (
                    <tr key={row.index} className="border-b" style={{ borderBottomColor: 'var(--border-divider)' }}>
                      <td className="p-2 text-sm" style={{ color: 'var(--card-fg)' }}>{row.index + 1}</td>
                      <td className="p-2 text-sm" style={{ color: 'var(--card-fg)' }}>{row.name}</td>
                      <td className="p-2 text-sm" style={{ color: 'var(--card-fg)' }}>{row.class}</td>
                      <td className="p-2 text-sm" style={{ color: 'var(--card-fg)' }}>{row.admission_no || "—"}</td>
                      <td className="p-2 text-sm" style={{ color: 'var(--card-fg)' }}>{row.phone || "—"}</td>
                      <td className="p-2">
                        {isDuplicate ? (
                          <span className="text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded text-xs font-medium">Duplicate</span>
                        ) : isError ? (
                          <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs font-medium" title={row.errors?.join(", ")}>Error</span>
                        ) : (
                          <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs font-medium">Valid</span>
                        )}
                      </td>
                      <td className="p-2">
                        {isDuplicate ? (
                          <select
                            value={rowDecisions[row.index] || "skip"}
                            onChange={(e) => handleDecisionChange(row.index, e.target.value)}
                            className="px-2 py-1 border rounded text-xs"
                            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                          >
                            <option value="skip">Skip</option>
                            <option value="update">Update</option>
                          </select>
                        ) : isError ? (
                          <span className="text-xs text-gray-400">Auto-skipped</span>
                        ) : (
                          <span className="text-xs text-green-600">Will import</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="text-sm font-medium" style={{ color: 'var(--card-fg)' }}>
            Will import: <strong className="text-green-600">{previewCounts().importCount}</strong>{" "}
            | Will update: <strong className="text-yellow-600">{previewCounts().updateCount}</strong>{" "}
            | Will skip: <strong className="text-gray-500">{previewCounts().skipCount}</strong>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 border rounded-lg text-sm"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
            >
              Back
            </button>
            <button
              onClick={handleImport}
              disabled={loading || previewCounts().importCount + previewCounts().updateCount === 0}
              className="px-6 py-3 bg-orange-600 text-white rounded-lg text-sm disabled:opacity-50"
            >
              {loading ? "Importing…" : `Import ${previewCounts().importCount + previewCounts().updateCount} Rows`}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Importing (transition) */}
      {step === 4 && (
        <div className="text-center py-8" style={{ color: 'var(--card-fg)' }}>
          <div className="animate-spin w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p>Importing participants…</p>
        </div>
      )}

      {/* STEP 5: Summary */}
      {step === 5 && result && (
        <div
          className="rounded-xl border p-6 space-y-4"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}
        >
          <h3 className="text-lg font-semibold text-green-600">Import Complete</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{result.imported}</p>
              <p className="text-xs text-green-700">Imported</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{result.updated}</p>
              <p className="text-xs text-yellow-700">Updated</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-600">{result.skipped}</p>
              <p className="text-xs text-gray-700">Skipped</p>
            </div>
            <div className={`rounded-lg p-4 text-center ${result.errors > 0 ? "bg-red-50" : "bg-gray-50"}`}>
              <p className={`text-2xl font-bold ${result.errors > 0 ? "text-red-600" : "text-gray-600"}`}>{result.errors}</p>
              <p className={`text-xs ${result.errors > 0 ? "text-red-700" : "text-gray-700"}`}>Errors</p>
            </div>
          </div>

          {result.error_details?.length > 0 && (
            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border-card)' }}>
              <table className="min-w-full text-xs">
                <thead style={{ backgroundColor: 'var(--surface)' }}>
                  <tr>
                    <th className="p-2 text-left">Row</th>
                    <th className="p-2 text-left">Field</th>
                    <th className="p-2 text-left">Error</th>
                    <th className="p-2 text-left">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {result.error_details.map((err, i) => (
                    <tr key={i} className="border-b" style={{ borderBottomColor: 'var(--border-divider)' }}>
                      <td className="p-2">{err.row_number}</td>
                      <td className="p-2">{err.field || "—"}</td>
                      <td className="p-2 text-red-600">{err.error}</td>
                      <td className="p-2">{JSON.stringify(err.row_data)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={resetAll}
              className="px-4 py-2 border rounded-lg text-sm"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
            >
              Import Another File
            </button>
            <button
              onClick={onDone}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm"
            >
              Back to Participants
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
