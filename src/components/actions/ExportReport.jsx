import React, { useMemo, useState } from "react";
import { useCompetition } from "../../context/CompetitionContext";
import { api, API_ROUTES } from "../../utils/apiClient";
import toast from "react-hot-toast";
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileJson2,
  Printer,
  AlertCircle,
  Loader2,
  Trophy,
  ListOrdered,
  Search,
} from "lucide-react";
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
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../ui/select";

const CATEGORIES = ["all", "sports", "arts", "academic", "cultural", "technical"];
const PREVIEW_LIMIT = 50;

function escapeCsvCell(value) {
  const str = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toCsv(columns, rows) {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => escapeCsvCell(row[c.key])).join(","));
  // BOM so Excel opens UTF-8 correctly
  return "\uFEFF" + [header, ...lines].join("\r\n");
}

function downloadBlob(content, fileName, contentType) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function dateStamp(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

const LEADERBOARD_COLUMNS = [
  { key: "rank", label: "Rank" },
  { key: "group_name", label: "Group" },
  { key: "total_score", label: "Total Score" },
  { key: "captain_name", label: "Captain" },
];

const RESULTS_COLUMNS = [
  { key: "index", label: "#" },
  { key: "event_name", label: "Event" },
  { key: "event_category", label: "Category" },
  { key: "group_name", label: "Group" },
  { key: "position", label: "Pos" },
  { key: "points", label: "Points" },
  { key: "chest_no", label: "Chest" },
  { key: "members", label: "Members" },
];

export default function ExportReport() {
  const { competition, groupLabel, groupLabelPlural } = useCompetition();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);
  const [category, setCategory] = useState("all");
  const [groupId, setGroupId] = useState("all");
  const [search, setSearch] = useState("");

  const competitionId = competition?._id || competition?.id || "";
  const meta = report?.meta || null;
  const leaderboard = useMemo(() => report?.leaderboard || [], [report]);
  const results = useMemo(() => report?.results || [], [report]);

  const groupOptions = useMemo(
    () => leaderboard.map((g) => ({ id: g.group_id, name: g.group_name })),
    [leaderboard]
  );

  const filteredResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return results;
    return results.filter((r) =>
      [r.event_name, r.group_name, r.members, r.chest_no].some((v) =>
        String(v || "").toLowerCase().includes(q)
      )
    );
  }, [results, search]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError("");

      if (!competitionId) {
        throw new Error("No active competition selected. Please select a competition first.");
      }

      const params = {};
      if (category !== "all") params.category = category;
      if (groupId !== "all") params.group_id = groupId;

      const payload = await api.get(API_ROUTES.EXPORT.REPORT(params), {
        headers: { "X-Competition-ID": competitionId },
      });

      if (payload?.success && payload?.report) {
        setReport(payload.report);
        const counts = payload.report.meta?.counts;
        toast.success(
          `Report ready — ${counts?.groups ?? 0} ${groupLabelPlural.toLowerCase()}, ${counts?.results ?? 0} placements`
        );
      } else {
        throw new Error(payload?.error || "Failed to retrieve report data.");
      }
    } catch (err) {
      const message = err?.message || "Failed to retrieve report data.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const baseName = `${meta?.competition_slug || "competition"}_${dateStamp()}`;

  const handleDownloadLeaderboardCsv = () => {
    if (!leaderboard.length) {
      toast.error("No leaderboard data to export yet.");
      return;
    }
    downloadBlob(
      toCsv(LEADERBOARD_COLUMNS, leaderboard),
      `${baseName}_leaderboard.csv`,
      "text/csv;charset=utf-8;"
    );
    toast.success("Leaderboard CSV downloaded");
  };

  const handleDownloadResultsCsv = () => {
    if (!results.length) {
      toast.error("No published placements to export yet.");
      return;
    }
    downloadBlob(
      toCsv(RESULTS_COLUMNS, results),
      `${baseName}_placements.csv`,
      "text/csv;charset=utf-8;"
    );
    toast.success("Placements CSV downloaded");
  };

  const handleDownloadJson = () => {
    if (!report) return;
    downloadBlob(
      JSON.stringify({ meta, leaderboard, results }, null, 2),
      `${baseName}_full_report.json`,
      "application/json"
    );
    toast.success("JSON report downloaded");
  };

  const handleDownloadWorkbook = async () => {
    if (!report) return;
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const lbSheet = XLSX.utils.json_to_sheet(
        leaderboard.map((r) => ({
          Rank: r.rank,
          [groupLabel]: r.group_name,
          "Total Score": r.total_score,
          Captain: r.captain_name,
        }))
      );
      const resSheet = XLSX.utils.json_to_sheet(
        results.map((r) => ({
          "#": r.index,
          Event: r.event_name,
          Category: r.event_category,
          [groupLabel]: r.group_name,
          Pos: r.position,
          Points: r.points,
          Chest: r.chest_no,
          Members: r.members,
        }))
      );
      lbSheet["!cols"] = [{ wch: 8 }, { wch: 28 }, { wch: 14 }, { wch: 22 }];
      resSheet["!cols"] = [{ wch: 6 }, { wch: 26 }, { wch: 14 }, { wch: 22 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(wb, lbSheet, "Leaderboard");
      XLSX.utils.book_append_sheet(wb, resSheet, "Placements");
      XLSX.writeFile(wb, `${baseName}_report.xlsx`);
      toast.success("Excel workbook downloaded");
    } catch {
      toast.error("Excel export failed — try CSV instead.");
    }
  };

  const handlePrint = () => window.print();

  const generatedLabel = meta?.generated_at ? new Date(meta.generated_at).toLocaleString() : null;

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      <style>{`
        @media print {
          @page { margin: 12mm; }
          body { background: #fff !important; }
          header, nav, aside { display: none !important; }
          main { padding: 0 !important; overflow: visible !important; }
          .export-screen { display: none !important; }
          #export-print-area { display: block !important; position: static !important; background: #fff !important; color: #000 !important; }
          #export-print-area thead { display: table-header-group; }
          #export-print-area tr { break-inside: avoid; }
          #export-print-area a { text-decoration: none; color: #000; }
        }
      `}</style>

      {/* Screen UI */}
      <div className="export-screen space-y-4 sm:space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <FileText className="h-5 w-5 text-accent-blue" aria-hidden />
              Export Competition Report
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Official standings mirror the public scoreboard — only{" "}
              <span className="font-medium text-foreground">published / locked</span> placements
              from <span className="font-medium text-foreground">published / completed</span>{" "}
              events are included.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive sm:p-4"
              >
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="break-words">{error}</p>
                  <Button variant="link" size="sm" onClick={fetchReport} className="h-auto p-0">
                    Try again
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="export-category">Category filter</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="export-category" className="min-h-11 w-full">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c === "all" ? "All categories" : c[0].toUpperCase() + c.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="export-group">{groupLabel} filter</Label>
                <Select value={groupId} onValueChange={setGroupId} disabled={!groupOptions.length}>
                  <SelectTrigger id="export-group" className="min-h-11 w-full">
                    <SelectValue placeholder={groupOptions.length ? `All ${groupLabelPlural.toLowerCase()}` : "Generate report first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All {groupLabelPlural.toLowerCase()}</SelectItem>
                    {groupOptions.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={fetchReport}
                disabled={loading || !competitionId}
                className="min-h-11 w-full bg-accent-blue text-white hover:bg-accent-blue/90 sm:w-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Generating…
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" aria-hidden />
                    {report ? "Refresh report" : "Generate report"}
                  </>
                )}
              </Button>
            </div>

            {!competitionId && (
              <p className="text-sm text-muted-foreground">
                No active competition found. Select a competition to enable exports.
              </p>
            )}
          </CardContent>
        </Card>

        {loading && !report && (
          <div className="space-y-3" aria-live="polite" aria-busy="true">
            <div className="h-16 animate-pulse rounded-lg bg-muted" />
            <div className="h-48 animate-pulse rounded-lg bg-muted" />
          </div>
        )}

        {report && meta && (
          <div className="space-y-4 sm:space-y-6">
            {/* Summary strip */}
            <div
              className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4"
              aria-live="polite"
            >
              {[
                { label: groupLabelPlural, value: meta.counts.groups, icon: Trophy },
                { label: "Events counted", value: meta.counts.events_counted, icon: ListOrdered },
                { label: "Placements", value: meta.counts.results, icon: ListOrdered },
                { label: "Generated", value: generatedLabel || "—", icon: FileText },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg border bg-card p-3 text-card-foreground shadow-sm"
                >
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </p>
                  <p className="mt-1 truncate text-base font-semibold sm:text-lg" title={String(s.value)}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {meta.competition_name} · published + locked placements only
              {meta.filters?.category ? ` · category: ${meta.filters.category}` : ""}
              {meta.counts.truncated ? " · truncated at 5,000 rows in file export" : ""} · ties
              share the same rank
            </p>

            {/* Download tiles */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Button
                variant="outline"
                onClick={handleDownloadLeaderboardCsv}
                disabled={!leaderboard.length}
                className="flex min-h-[64px] h-auto items-center justify-between p-4 text-left"
              >
                <span>
                  <span className="block text-xs text-muted-foreground">CSV · Excel-ready</span>
                  <span className="block text-sm font-semibold text-foreground">
                    Leaderboard
                  </span>
                </span>
                <Download className="h-5 w-5 shrink-0 text-accent-blue" aria-hidden />
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadResultsCsv}
                disabled={!results.length}
                className="flex min-h-[64px] h-auto items-center justify-between p-4 text-left"
              >
                <span>
                  <span className="block text-xs text-muted-foreground">CSV · Excel-ready</span>
                  <span className="block text-sm font-semibold text-foreground">
                    Placements detail
                  </span>
                </span>
                <Download className="h-5 w-5 shrink-0 text-accent-blue" aria-hidden />
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadWorkbook}
                disabled={!leaderboard.length && !results.length}
                className="flex min-h-[64px] h-auto items-center justify-between p-4 text-left"
              >
                <span>
                  <span className="block text-xs text-muted-foreground">XLSX · 2 sheets</span>
                  <span className="block text-sm font-semibold text-foreground">
                    Workbook
                  </span>
                </span>
                <FileSpreadsheet className="h-5 w-5 shrink-0 text-accent-blue" aria-hidden />
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadJson}
                className="flex min-h-[64px] h-auto items-center justify-between p-4 text-left"
              >
                <span>
                  <span className="block text-xs text-muted-foreground">JSON · full data</span>
                  <span className="block text-sm font-semibold text-foreground">Raw report</span>
                </span>
                <FileJson2 className="h-5 w-5 shrink-0 text-accent-blue" aria-hidden />
              </Button>
              <Button
                variant="outline"
                onClick={handlePrint}
                className="flex min-h-[64px] h-auto items-center justify-between p-4 text-left sm:col-span-2 lg:col-span-2"
              >
                <span>
                  <span className="block text-xs text-muted-foreground">Print / Save as PDF</span>
                  <span className="block text-sm font-semibold text-foreground">
                    Printable report
                  </span>
                </span>
                <Printer className="h-5 w-5 shrink-0 text-accent-blue" aria-hidden />
              </Button>
            </div>

            {/* Leaderboard preview */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">
                  Leaderboard preview
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {leaderboard.length
                      ? `showing ${Math.min(PREVIEW_LIMIT, leaderboard.length)} of ${leaderboard.length}`
                      : ""}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto px-2 sm:px-6">
                {leaderboard.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No groups found for this competition yet.
                  </p>
                ) : (
                  <Table className="min-w-[420px]">
                    <TableHeader className="sticky top-0 z-10 bg-card">
                      <TableRow>
                        <TableHead className="w-20">Rank</TableHead>
                        <TableHead>{groupLabel}</TableHead>
                        <TableHead className="w-32 text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboard.slice(0, PREVIEW_LIMIT).map((row) => (
                        <TableRow key={row.group_id}>
                          <TableCell className="font-medium">#{row.rank}</TableCell>
                          <TableCell>
                            <span className="font-medium text-foreground">{row.group_name}</span>
                            <span className="block text-xs text-muted-foreground sm:hidden">
                              {row.total_score} pts
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-foreground">
                            {row.total_score} pts
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Results preview */}
            <Card>
              <CardHeader className="space-y-3 pb-2">
                <CardTitle className="text-base sm:text-lg">
                  Placements preview
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {results.length
                      ? `showing ${Math.min(PREVIEW_LIMIT, filteredResults.length)} of ${filteredResults.length}`
                      : ""}
                  </span>
                </CardTitle>
                {results.length > 0 && (
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Label htmlFor="export-search" className="sr-only">
                      Search placements
                    </Label>
                    <Input
                      id="export-search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search event, group, chest no…"
                      className="min-h-11 pl-9"
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent className="overflow-x-auto px-2 sm:px-6">
                {results.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm font-medium text-foreground">No published placements yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Placements appear here after events are published. Approved-only results are
                      intentionally excluded.
                    </p>
                  </div>
                ) : filteredResults.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No placements match “{search}”.
                  </p>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    <Table className="min-w-[640px]">
                      <TableHeader className="sticky top-0 z-10 bg-card">
                        <TableRow>
                          <TableHead>Event</TableHead>
                          <TableHead>{groupLabel}</TableHead>
                          <TableHead>Pos</TableHead>
                          <TableHead>Points</TableHead>
                          <TableHead>Chest</TableHead>
                          <TableHead>Members</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredResults.slice(0, PREVIEW_LIMIT).map((row) => (
                          <TableRow key={`${row.event_name}-${row.position}-${row.chest_no}-${row.index}`}>
                            <TableCell className="font-medium text-foreground">
                              {row.event_name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {row.group_name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">#{row.position}</TableCell>
                            <TableCell className="font-semibold text-foreground">
                              {row.points} pts
                            </TableCell>
                            <TableCell className="text-muted-foreground">{row.chest_no}</TableCell>
                            <TableCell className="max-w-[220px] text-muted-foreground">
                              <details>
                                <summary className="cursor-pointer truncate text-sm">
                                  {row.members}
                                </summary>
                                <span className="mt-1 block whitespace-normal text-sm">
                                  {row.members}
                                </span>
                              </details>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {!report && !loading && !error && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Choose a filter and hit <span className="font-medium text-foreground">Generate report</span> to
              preview standings and download files.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Print-only view */}
      {report && (
        <div id="export-print-area" className="hidden space-y-8 bg-white p-8 text-black print:block">
          <div className="border-b-2 border-black pb-4 text-center">
            <h1 className="text-3xl font-black uppercase tracking-wider">
              {meta?.competition_name || "Competition"} — Report
            </h1>
            <p className="mt-1 text-sm">
              Generated {generatedLabel || ""} · {meta?.counts.groups ?? 0} {groupLabelPlural.toLowerCase()} ·{" "}
              {meta?.counts.events_counted ?? 0} events · {meta?.counts.results ?? 0} placements
            </p>
          </div>

          <div>
            <h2 className="mb-4 border-b border-black pb-1 text-xl font-bold uppercase tracking-wide">
              Leaderboard standings
            </h2>
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-black">
                  <th className="w-20 py-2 font-bold">Rank</th>
                  <th className="py-2 font-bold">{groupLabel}</th>
                  <th className="w-32 py-2 text-right font-bold">Total score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row) => (
                  <tr key={row.group_id} className="border-b border-gray-200">
                    <td className="py-2">#{row.rank}</td>
                    <td className="py-2">{row.group_name}</td>
                    <td className="py-2 text-right font-bold">{row.total_score} pts</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h2 className="mb-4 border-b border-black pb-1 text-xl font-bold uppercase tracking-wide">
              Event placements
            </h2>
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-black">
                  <th className="py-2 font-bold">Event</th>
                  <th className="py-2 font-bold">{groupLabel}</th>
                  <th className="w-12 py-2 font-bold">Pos</th>
                  <th className="w-20 py-2 text-right font-bold">Points</th>
                  <th className="py-2 font-bold">Members</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row) => (
                  <tr key={`${row.event_name}-${row.position}-${row.chest_no}-${row.index}`} className="border-b border-gray-200">
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
