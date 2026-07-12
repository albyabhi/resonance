import React, { useState } from "react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";
import { Download, FileText, Printer, AlertCircle, Loader } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../ui/table";
import { Button } from "../ui/button";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

export default function ExportReport() {
  const { token, competition } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState(null);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError("");

      const compId = competition?._id || competition?.id || "";

      if (!compId) {
        throw new Error("No active competition selected. Please select a competition first.");
      }

      const response = await apiJson(`${API_BASE_URL}/api/export/report`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Export Competition Report</CardTitle>
          <p className="text-sm text-muted-foreground">
            Generate, preview, and download comprehensive reports for leaderboard standings and event results.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            <Button
              onClick={fetchReport}
              disabled={loading}
              className="bg-accent-blue text-white hover:bg-accent-blue/90"
            >
              {loading ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate/Refresh Report Data
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <div className="space-y-6 animate-fadeIn">
          {/* Action Center */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Button
              variant="outline"
              onClick={() => handleDownloadCSV("leaderboard")}
              className="flex h-auto items-center justify-between p-4"
            >
              <div className="text-left">
                <p className="text-xs text-muted-foreground">Export Format</p>
                <p className="text-sm font-semibold text-foreground">Leaderboard (CSV)</p>
              </div>
              <Download className="h-5 w-5 text-accent-blue" />
            </Button>

            <Button
              variant="outline"
              onClick={() => handleDownloadCSV("results")}
              className="flex h-auto items-center justify-between p-4"
            >
              <div className="text-left">
                <p className="text-xs text-muted-foreground">Export Format</p>
                <p className="text-sm font-semibold text-foreground">Detailed Results (CSV)</p>
              </div>
              <Download className="h-5 w-5 text-accent-blue" />
            </Button>

            <Button
              variant="outline"
              onClick={handleDownloadJSON}
              className="flex h-auto items-center justify-between p-4"
            >
              <div className="text-left">
                <p className="text-xs text-muted-foreground">Export Format</p>
                <p className="text-sm font-semibold text-foreground">Full Report (JSON)</p>
              </div>
              <Download className="h-5 w-5 text-accent-blue" />
            </Button>

            <Button
              variant="outline"
              onClick={handlePrint}
              className="flex h-auto items-center justify-between p-4"
            >
              <div className="text-left">
                <p className="text-xs text-muted-foreground">Export Format</p>
                <p className="text-sm font-semibold text-foreground">Print / PDF Report</p>
              </div>
              <Printer className="h-5 w-5 text-accent-blue" />
            </Button>
          </div>

          {/* Leaderboard Table Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Leaderboard Preview</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Rank</TableHead>
                    <TableHead>Group Name</TableHead>
                    <TableHead className="w-32 text-right">Total Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.leaderboard.map((row) => (
                    <TableRow key={row.rank}>
                      <TableCell className="font-medium">#{row.rank}</TableCell>
                      <TableCell className="text-muted-foreground">{row.group_name}</TableCell>
                      <TableCell className="text-right font-semibold text-foreground">
                        {row.total_score} pts
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Results Table Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detailed Results Preview</CardTitle>
            </CardHeader>
            <CardContent className="max-h-96 overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10">
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Pos</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Chest</TableHead>
                    <TableHead>Members</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.results.map((row) => (
                    <TableRow key={row.index}>
                      <TableCell className="font-medium text-foreground">{row.event_name}</TableCell>
                      <TableCell className="text-muted-foreground">{row.group_name}</TableCell>
                      <TableCell className="text-muted-foreground">#{row.position}</TableCell>
                      <TableCell className="font-semibold text-foreground">{row.points} pts</TableCell>
                      <TableCell className="text-muted-foreground">{row.chest_no}</TableCell>
                      <TableCell
                        className="max-w-xs truncate text-muted-foreground"
                        title={row.members}
                      >
                        {row.members}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
        <div id="print-area" className="hidden print:block space-y-8 bg-white p-8 text-black">
          <div className="border-b-2 border-black pb-4 text-center">
            <h1 className="text-3xl font-black uppercase tracking-wider">Competition Report</h1>
            <p className="mt-1 text-sm">Generated on {new Date(reportData.timestamp).toLocaleString()}</p>
          </div>

          <div>
            <h2 className="mb-4 border-b border-black pb-1 text-xl font-bold uppercase tracking-wide">Leaderboard Standings</h2>
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-black">
                  <th className="w-20 py-2 font-bold">Rank</th>
                  <th className="py-2 font-bold">Group Name</th>
                  <th className="w-32 py-2 text-right font-bold">Total Score</th>
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
            <h2 className="mb-4 border-b border-black pb-1 text-xl font-bold uppercase tracking-wide">Event Placements Breakdown</h2>
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-black">
                  <th className="py-2 font-bold">Event</th>
                  <th className="py-2 font-bold">Group</th>
                  <th className="w-12 py-2 font-bold">Pos</th>
                  <th className="w-20 py-2 text-right font-bold">Points</th>
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
                    <td className="text-gray-700 py-2">{row.members}</td>
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
