import React, { useState } from "react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";
import { Download, FileText, Printer, CheckCircle, AlertCircle, Loader } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

export default function ExportReport() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState(null);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Get competition ID from localStorage (or current active competition context)
      const activeCompetition = localStorage.getItem("activeCompetition") 
        ? JSON.parse(localStorage.getItem("activeCompetition")) 
        : null;
      const compId = activeCompetition?._id || activeCompetition?.id || "";

      if (!compId) {
        throw new Error("No active competition selected. Please select a competition first.");
      }

      const response = await apiJson(`${API_BASE_URL}/api/export/report`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-competition-id": compId,
        },
      });

      if (response.success && response.report) {
        setReportData(response.report);
      } else {
        throw new Error(response.error || "Failed to retrieve report data.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const convertToCSV = (data) => {
    if (!data || !data.length) return "";
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => 
      Object.values(row).map(val => {
        const strVal = String(val).replace(/"/g, '""');
        return strVal.includes(",") ? `"${strVal}"` : strVal;
      }).join(",")
    );
    return [headers, ...rows].join("\n");
  };

  const downloadFile = (content, fileName, contentType) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = (type) => {
    if (!reportData) return;
    if (type === "leaderboard") {
      const csv = convertToCSV(reportData.leaderboard);
      downloadFile(csv, "leaderboard_report.csv", "text/csv;charset=utf-8;");
    } else {
      const csv = convertToCSV(reportData.results);
      downloadFile(csv, "results_detailed_report.csv", "text/csv;charset=utf-8;");
    }
  };

  const handleDownloadJSON = () => {
    if (!reportData) return;
    const jsonStr = JSON.stringify(reportData, null, 2);
    downloadFile(jsonStr, "competition_full_report.json", "application/json");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full space-y-6">
      {/* Premium Header */}
      <div className="card-premium p-6">
        <h2 className="text-xl font-bold theme-text-primary mb-1">Export Competition Report</h2>
        <p className="text-sm theme-text-secondary">
          Generate, preview, and download comprehensive reports for leaderboard standings and event results.
        </p>

        {error && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-4">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98] transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Generate/Refresh Report Data
              </>
            )}
          </button>
        </div>
      </div>

      {reportData && (
        <div className="space-y-6 animate-fadeIn">
          {/* Action Center */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={() => handleDownloadCSV("leaderboard")}
              className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition active:scale-[0.98]"
            >
              <div className="text-left">
                <p className="text-xs theme-text-secondary">Export Format</p>
                <p className="text-sm font-semibold theme-text-primary">Leaderboard (CSV)</p>
              </div>
              <Download className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </button>

            <button
              onClick={() => handleDownloadCSV("results")}
              className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition active:scale-[0.98]"
            >
              <div className="text-left">
                <p className="text-xs theme-text-secondary">Export Format</p>
                <p className="text-sm font-semibold theme-text-primary">Detailed Results (CSV)</p>
              </div>
              <Download className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </button>

            <button
              onClick={handleDownloadJSON}
              className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition active:scale-[0.98]"
            >
              <div className="text-left">
                <p className="text-xs theme-text-secondary">Export Format</p>
                <p className="text-sm font-semibold theme-text-primary">Full Report (JSON)</p>
              </div>
              <Download className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition active:scale-[0.98]"
            >
              <div className="text-left">
                <p className="text-xs theme-text-secondary">Export Format</p>
                <p className="text-sm font-semibold theme-text-primary">Print / PDF Report</p>
              </div>
              <Printer className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </button>
          </div>

          {/* Leaderboard Table Preview */}
          <div className="card-premium p-6 overflow-hidden">
            <h3 className="text-lg font-bold theme-text-primary mb-4">Leaderboard Preview</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800">
                    <th className="pb-3 font-semibold theme-text-primary w-20">Rank</th>
                    <th className="pb-3 font-semibold theme-text-primary">Group Name</th>
                    <th className="pb-3 font-semibold theme-text-primary text-right w-32">Total Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                  {reportData.leaderboard.map((row) => (
                    <tr key={row.rank} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20">
                      <td className="py-3 font-medium theme-text-primary">#{row.rank}</td>
                      <td className="py-3 theme-text-secondary">{row.group_name}</td>
                      <td className="py-3 font-semibold theme-text-primary text-right">{row.total_score} pts</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Results Table Preview */}
          <div className="card-premium p-6 overflow-hidden">
            <h3 className="text-lg font-bold theme-text-primary mb-4">Detailed Results Preview</h3>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm text-left">
                <thead className="sticky top-0 bg-white dark:bg-neutral-900 z-10">
                  <tr className="border-b border-neutral-200 dark:border-neutral-800">
                    <th className="pb-3 font-semibold theme-text-primary">Event</th>
                    <th className="pb-3 font-semibold theme-text-primary">Group</th>
                    <th className="pb-3 font-semibold theme-text-primary">Pos</th>
                    <th className="pb-3 font-semibold theme-text-primary">Points</th>
                    <th className="pb-3 font-semibold theme-text-primary">Chest</th>
                    <th className="pb-3 font-semibold theme-text-primary">Members</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                  {reportData.results.map((row) => (
                    <tr key={row.index} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20">
                      <td className="py-3 theme-text-primary font-medium">{row.event_name}</td>
                      <td className="py-3 theme-text-secondary">{row.group_name}</td>
                      <td className="py-3 theme-text-secondary">#{row.position}</td>
                      <td className="py-3 theme-text-primary font-semibold">{row.points} pts</td>
                      <td className="py-3 theme-text-secondary">{row.chest_no}</td>
                      <td className="py-3 theme-text-muted max-w-xs truncate" title={row.members}>
                        {row.members}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Hidden printable report view */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>

      {reportData && (
        <div id="print-area" className="hidden print:block p-8 bg-white text-black space-y-8">
          <div className="border-b-2 border-black pb-4 text-center">
            <h1 className="text-3xl font-black uppercase tracking-wider">Competition Report</h1>
            <p className="text-sm mt-1">Generated on {new Date(reportData.timestamp).toLocaleString()}</p>
          </div>

          <div>
            <h2 className="text-xl font-bold uppercase mb-4 tracking-wide border-b border-black pb-1">Leaderboard Standings</h2>
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-black">
                  <th className="py-2 font-bold w-20">Rank</th>
                  <th className="py-2 font-bold">Group Name</th>
                  <th className="py-2 font-bold text-right w-32">Total Score</th>
                </tr>
              </thead>
              <tbody>
                {reportData.leaderboard.map((row) => (
                  <tr key={row.rank} className="border-b border-gray-200">
                    <td className="py-2">#{row.rank}</td>
                    <td className="py-2">{row.group_name}</td>
                    <td className="py-2 text-right font-bold">{row.total_score} pts</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="page-break">
            <h2 className="text-xl font-bold uppercase mb-4 tracking-wide border-b border-black pb-1">Event Placements Breakdown</h2>
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-black">
                  <th className="py-2 font-bold">Event</th>
                  <th className="py-2 font-bold">Group</th>
                  <th className="py-2 font-bold w-12">Pos</th>
                  <th className="py-2 font-bold w-20 text-right">Points</th>
                  <th className="py-2 font-bold">Members</th>
                </tr>
              </thead>
              <tbody>
                {reportData.results.map((row) => (
                  <tr key={row.index} className="border-b border-gray-200">
                    <td className="py-2 font-semibold">{row.event_name}</td>
                    <td className="py-2">{row.group_name}</td>
                    <td className="py-2">#{row.position}</td>
                    <td className="py-2 text-right font-bold">{row.points} pts</td>
                    <td className="py-2 text-gray-700">{row.members}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
