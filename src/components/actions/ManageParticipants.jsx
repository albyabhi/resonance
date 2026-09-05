import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../AuthContext";
import { apiJson, API_ROUTES, buildUrl } from "../../utils/apiClient";
import usePermission from "../../hooks/usePermission";
import { useCompetition } from "../../context/CompetitionContext";
import ImportParticipants from "./ImportParticipants";
import ExportParticipantsDialog from "./ExportParticipantsDialog";
import toast from "react-hot-toast";
import {
  Card, CardHeader, CardTitle, CardContent,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "../ui/table";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "../ui/select";
import {
  AlertDialog, AlertDialogContent,
  AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogAction, AlertDialogCancel,
} from "../ui/alert-dialog";
import { Pencil, Trash2, AlertTriangle, Download, Copy, Link2, KeyRound } from "lucide-react";
import { Badge } from "../ui/badge";
import { getParticipantStatusMeta } from "../../utils/participantStatus";
import * as XLSX from "xlsx";

// Derived credential state from list payload (backend strips hashes and
// adds setup_status/has_password/setup_expires — see participantService).
function getCredentialMeta(stu) {
  if (stu?.has_password || stu?.setup_status === "active") {
    return { label: "Active", badge: "success", hint: "Password set — can log in" };
  }
  if (stu?.setup_status === "pending") {
    return { label: "Link pending", badge: "outline", hint: "Setup link shared, not used yet" };
  }
  if (stu?.setup_status === "expired") {
    return { label: "Expired", badge: "error", hint: "Link expired — regenerate" };
  }
  return { label: "No link", badge: "outline", hint: "Generate a setup link" };
}

function ManageParticipants() {
  const { token } = useAuth();
  const { hasRole } = usePermission();
  const { competition, groupLabel } = useCompetition();
  const isSuperAdmin = hasRole("super_admin");

  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [groups, setGroups] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [editingParticipant, setEditingParticipant] = useState(null);

  const [filterGroup, setFilterGroup] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [statusChangeTarget, setStatusChangeTarget] = useState(null);
  const [statusChangeValue, setStatusChangeValue] = useState("");
  const [statusChangeReason, setStatusChangeReason] = useState("");

  const [selectedIds, setSelectedIds] = useState([]);

  const [addForm, setAddForm] = useState({ name: "", class: "", group_id: "", admission_no: "", phone: "", email: "", gender: "" });

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [bulkLinks, setBulkLinks] = useState(null);
  const [bulkLinksOpen, setBulkLinksOpen] = useState(false);
  const [linksLoading, setLinksLoading] = useState(false);

  const apiCall = useCallback(async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(`${buildUrl(endpoint)}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body || undefined,
    });
  }, [token]);

  useEffect(() => {
    const load = async () => {
      if (!token || !competition?._id) return;
      setLoading(true);
      setError("");
      try {
        const groupsResp = await apiCall(API_ROUTES.COMPETITIONS.GROUPS(competition._id));
        setGroups(Array.isArray(groupsResp) ? groupsResp : groupsResp.groups || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, competition?._id, apiCall]);

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url = API_ROUTES.PARTICIPANTS.LIST({
        competition_id: competition?._id,
        group_id: filterGroup,
        class: filterClass,
        status: filterStatus,
        search,
      });
      const { participants } = await apiCall(url);
      setParticipants(participants || []);
      setSelectedIds([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [competition?._id, filterGroup, filterClass, filterStatus, search, apiCall]);

  useEffect(() => {
    if (token && activeTab === "all") fetchParticipants();
  }, [token, activeTab, filterGroup, filterClass, filterStatus, search, fetchParticipants]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setError("");
    setEditingParticipant(null);
    setAddForm({ name: "", class: "", group_id: "", admission_no: "", phone: "", email: "", gender: "" });
    if (tab === "all" && token) fetchParticipants();
  };

  const handleAddSingle = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { participant, setup_link } = await apiCall(API_ROUTES.PARTICIPANTS.CREATE, {
        method: "POST",
        body: JSON.stringify(addForm),
      });
      setCreatedCredentials({ name: participant.name, email: participant.email, setup_link });
      setAddForm({ name: "", class: "", group_id: "", admission_no: "", phone: "", email: "", gender: "" });
      setParticipants((prev) => [participant, ...prev]);
      setActiveTab("all");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} copied to clipboard`),
      () => toast.error("Failed to copy")
    );
  };

  // ── Bulk setup-link manager (minimal patch: manual share only) ──
  // Backend always mints FRESH links (old raw unrecoverable) — toast warns
  // when rotation happens so admin knows to re-share.
  const handleBulkLinks = async () => {
    if (!selectedIds.length) return;
    setLinksLoading(true);
    setError("");
    try {
      const res = await apiCall(API_ROUTES.PARTICIPANTS.SETUP_LINKS_BULK, {
        method: "POST",
        body: JSON.stringify({ ids: selectedIds }),
      });
      setBulkLinks(res);
      setBulkLinksOpen(true);
      if (res?.skippedActive > 0) {
        toast(`Skipped ${res.skippedActive} with password already set`, { icon: "ℹ️" });
      } else {
        toast.success(`Generated ${res?.links?.length || 0} setup links`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLinksLoading(false);
    }
  };

  const handleRegenerateSingle = async (stu) => {
    setLinksLoading(true);
    try {
      const res = await apiCall(API_ROUTES.PARTICIPANTS.SETUP_LINK_REGENERATE(stu._id), {
        method: "POST",
      });
      setBulkLinks({ links: [{ participant_id: res.participant_id, name: res.name, email: res.email, setup_link: res.setup_link, expires: res.expires }], skippedActive: 0, requested: 1 });
      setBulkLinksOpen(true);
      fetchParticipants();
    } catch (err) {
      setError(err.message);
    } finally {
      setLinksLoading(false);
    }
  };

  const copyAllBulkLinks = () => {
    if (!bulkLinks?.links?.length) return;
    const text = bulkLinks.links
      .map((l) => `${l.name} <${l.email || "no-email"}>\n${l.setup_link}`)
      .join("\n\n");
    // Clipboard can reject very long payloads for 100s of rows — fall back to Excel.
    if (text.length > 18000) {
      toast.error("Too many links for clipboard — use Download Excel instead");
      return;
    }
    copyToClipboard(text, `${bulkLinks.links.length} links`);
  };

  const downloadBulkLinksExcel = () => {
    if (!bulkLinks?.links?.length) return;
    const wsData = [["Name", "Email", "Admission No", "Setup Link"]];
    bulkLinks.links.forEach((l) => {
      wsData.push([l.name, l.email || "", l.admission_no || "", l.setup_link]);
    });
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [{ wch: 25 }, { wch: 30 }, { wch: 16 }, { wch: 60 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Setup Links");
    XLSX.writeFile(wb, `Participant_Setup_Links.xlsx`);
    toast.success("Excel downloaded — share manually (no auto-send)");
  };

  const handleEditStart = (stu) => {
    setEditingParticipant({
      ...stu,
      group_id: stu.group_id?._id || stu.group_id,
    });
    setActiveTab("update");
  };

  const handleStatusChange = async () => {
    if (!statusChangeTarget || !statusChangeValue) return;
    setLoading(true);
    setError("");
    try {
      await apiCall(API_ROUTES.PARTICIPANTS.STATUS(statusChangeTarget._id), {
        method: "PATCH",
        body: JSON.stringify({ status: statusChangeValue, reason: statusChangeReason }),
      });
      setStatusChangeTarget(null);
      setStatusChangeValue("");
      setStatusChangeReason("");
      fetchParticipants();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiCall(API_ROUTES.PARTICIPANTS.UPDATE(editingParticipant._id), {
        method: "PUT",
        body: JSON.stringify(editingParticipant),
      });
      setActiveTab("all");
      fetchParticipants();
      setEditingParticipant(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSingle = async (id) => {
    setLoading(true);
    setError("");
    try {
      await apiCall(API_ROUTES.PARTICIPANTS.DELETE(id), { method: "DELETE" });
      setParticipants((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBulk = async () => {
    setLoading(true);
    setError("");
    try {
      await apiCall(API_ROUTES.PARTICIPANTS.BULK_DELETE, {
        method: "DELETE",
        body: JSON.stringify({ ids: selectedIds }),
      });
      fetchParticipants();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "single") {
      await handleDeleteSingle(deleteTarget.id);
    } else if (deleteTarget.type === "bulk") {
      await handleDeleteBulk();
    }
    setDeleteTarget(null);
  };

  const handleSelect = (sid) => {
    setSelectedIds((prev) =>
      prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(participants.map((s) => s._id));
  };

  const handleDeselectAll = () => setSelectedIds([]);

  const getGroupName = (id) =>
    (groups.find((g) => g._id === id) || {}).name || "";

  const tabs = [
    { key: "all", label: "All Participants" },
    { key: "add", label: "Add" },
    { key: "update", label: "Update", disabled: !editingParticipant },
    ...(isSuperAdmin ? [{ key: "import", label: "Import" }] : []),
  ];

  return (
    <div className="min-h-dvh p-4 bg-background">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4">
          <h1 className="text-xl md:text-2xl font-bold mb-1 text-card-foreground">
            Participant Management
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Manage all participants, classes, and house mapping
          </p>
        </div>

        {error && (
          <div
            className="bg-accent-red-tint border border-accent-red/20 text-accent-red px-3 py-2 rounded-lg mb-4"
            role="alert"
            aria-live="polite"
          >
            {error}
            <button
              onClick={() => setError("")}
              className="ml-2 text-accent-red focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red rounded"
            >
              ×
            </button>
          </div>
        )}

        {createdCredentials && (
          <Card className="border-2 border-accent-green/40 mb-4">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-semibold text-accent-green">Participant Created — Share Setup Link</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Share the one-time setup link with <strong>{createdCredentials.name}</strong>. The link expires in 7 days.
                  </p>
                </div>
                <button
                  onClick={() => setCreatedCredentials(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>
              <div className="flex items-center gap-2 bg-muted rounded-lg p-2">
                <span className="text-xs truncate flex-1 text-muted-foreground">{createdCredentials.setup_link}</span>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(createdCredentials.setup_link, "Setup link")}>
                  <Copy className="h-3 w-3 mr-1" /> Copy Link
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-4">
          <CardContent className="p-1.5 flex gap-1 overflow-x-auto" role="tablist" aria-label="Participant management views">
            {tabs.map((tab) => (
              <Button
                key={tab.key}
                role="tab"
                aria-selected={activeTab === tab.key}
                aria-controls={`panel-${tab.key}`}
                id={`tab-${tab.key}`}
                variant={activeTab === tab.key ? "default" : "ghost"}
                disabled={tab.disabled}
                onClick={() => switchTab(tab.key)}
                className={`shrink-0 min-h-10 whitespace-nowrap ${activeTab === tab.key ? "bg-accent-amber text-white hover:bg-accent-amber/90" : ""}`}
              >
                {tab.label}
              </Button>
            ))}
          </CardContent>
        </Card>

        {activeTab === "all" && (
          <section id="panel-all" role="tabpanel" aria-labelledby="tab-all" className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2 mb-3 lg:items-end">
              <div className="w-full sm:w-auto lg:w-48">
                <Label htmlFor="filter-group" className="sr-only">Filter by {groupLabel}</Label>
                <Select value={filterGroup} onValueChange={setFilterGroup}>
                  <SelectTrigger id="filter-group" className="min-h-11">
                    <SelectValue placeholder={`Filter by ${groupLabel}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All {groupLabel}s</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g._id} value={g._id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-auto lg:w-40">
                <Label htmlFor="filter-class" className="sr-only">Filter by class</Label>
                <Input id="filter-class" type="text" value={filterClass} onChange={(e) => setFilterClass(e.target.value)} placeholder="Filter by class" className="min-h-11" />
              </div>
              <div className="w-full sm:w-auto lg:w-40">
                <Label htmlFor="filter-status" className="sr-only">Filter by status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger id="filter-status" className="min-h-11">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="withdrawn">Withdrawn</SelectItem>
                    <SelectItem value="disqualified">Disqualified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-auto lg:w-48 sm:col-span-2 lg:col-span-1">
                <Label htmlFor="search" className="sr-only">Search participants</Label>
                <Input id="search" type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="min-h-11" />
              </div>
              {selectedIds.length > 0 && (
                <p className="text-xs font-medium text-muted-foreground w-full lg:w-auto lg:pb-3" aria-live="polite">
                  {selectedIds.length} selected
                </p>
              )}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full lg:w-auto">
                <Button variant="outline" className="min-h-10" onClick={handleDeselectAll}>Clear</Button>
                <Button variant="outline" className="min-h-10" onClick={handleSelectAll}>Select All</Button>
                <Button variant="outline" className="min-h-10" onClick={() => setExportDialogOpen(true)}>
                  <Download className="h-4 w-4 mr-1" /> Export
                </Button>
                <Button variant="outline" className="min-h-10 col-span-1" disabled={!selectedIds.length || linksLoading} onClick={handleBulkLinks} title="Generate copyable setup links for selected participants (rotates old links)">
                  <Link2 className="h-4 w-4 mr-1" /> Links{selectedIds.length ? ` (${selectedIds.length})` : ""}
                </Button>
                <Button variant="destructive" className="min-h-10 col-span-2" disabled={!selectedIds.length} onClick={() => setDeleteTarget({ type: "bulk" })}>
                  Delete{selectedIds.length ? ` (${selectedIds.length})` : ""}
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              No link to share? Participants can self-serve at <span className="font-medium text-card-foreground">Participant Login → Claim</span> with competition slug + admission no + imported email. Or select rows → <span className="font-medium">Links</span> to copy/download fresh links (rotates old ones, 7-day expiry).
            </p>

            <ul className="space-y-2 sm:hidden" aria-label="Participants list">
              {participants.map((stu) => (
                <li key={stu._id} className="rounded-xl border border-border p-3 shadow-sm bg-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium break-words text-card-foreground">
                        {stu.name}
                        <Badge variant={getParticipantStatusMeta(stu.status).badge} className="ml-2 text-[10px]">
                          {getParticipantStatusMeta(stu.status).label}
                        </Badge>
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant={getCredentialMeta(stu).badge} className="text-[10px]" title={getCredentialMeta(stu).hint}>
                          <KeyRound className="h-3 w-3 mr-1" />{getCredentialMeta(stu).label}
                        </Badge>
                      </p>
                      <p className="text-xs text-muted-foreground">Class: <span className="font-medium text-card-foreground">{stu.class}</span></p>
                      <p className="text-xs text-muted-foreground">{groupLabel}: <span className="font-medium text-card-foreground">{getGroupName(stu.group_id?._id || stu.group_id)}</span></p>
                      <p className="text-[11px] mt-1 text-muted-foreground">ID: {stu.unique_id}</p>
                    </div>
                    <div className="shrink-0">
                      <Checkbox
                        aria-label={`Select ${stu.name}`}
                        checked={selectedIds.includes(stu._id)}
                        onCheckedChange={() => handleSelect(stu._id)}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditStart(stu)}>
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleRegenerateSingle(stu)} disabled={linksLoading} title="Generate fresh setup link (rotates old link)">
                      Link
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setStatusChangeTarget(stu); setStatusChangeValue(""); setStatusChangeReason(""); }}>
                      Status
                    </Button>
                    <Button variant="destructive" size="sm" className="flex-1" onClick={() => setDeleteTarget({ type: "single", id: stu._id })}>
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
           </ul>

            <Card className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Access</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>{groupLabel}</TableHead>
                    <TableHead>Participant ID</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.map((stu) => (
                    <TableRow key={stu._id}>
                      <TableCell>
                        <Checkbox
                          aria-label={`Select ${stu.name}`}
                          checked={selectedIds.includes(stu._id)}
                          onCheckedChange={() => handleSelect(stu._id)}
                        />
                      </TableCell>
                      <TableCell className="text-card-foreground">{stu.name}</TableCell>
                      <TableCell>
                        <Badge variant={getParticipantStatusMeta(stu.status).badge}>
                          {getParticipantStatusMeta(stu.status).label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getCredentialMeta(stu).badge} title={getCredentialMeta(stu).hint}>
                          {getCredentialMeta(stu).label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-card-foreground">{stu.class}</TableCell>
                      <TableCell className="text-card-foreground">{getGroupName(stu.group_id?._id || stu.group_id)}</TableCell>
                      <TableCell className="text-card-foreground">{stu.unique_id}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditStart(stu)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleRegenerateSingle(stu)} title="Generate fresh setup link (rotates old link)">
                            <Link2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setStatusChangeTarget(stu); setStatusChangeValue(""); setStatusChangeReason(""); }} title="Change Status">
                            <AlertTriangle className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: "single", id: stu._id })} title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </section>
        )}

        {activeTab === "add" && (
          <section id="panel-add" role="tabpanel" aria-labelledby="tab-add">
            <Card className="max-w-2xl">
              <CardHeader>
                <CardTitle>Add Single Participant</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={handleAddSingle}>
                  <div>
                    <Label htmlFor="add-group" className="sr-only">{groupLabel}</Label>
                    <Select
                      value={addForm.group_id}
                      onValueChange={(val) => setAddForm((f) => ({ ...f, group_id: val }))}
                    >
                      <SelectTrigger id="add-group">
                        <SelectValue placeholder={`Select ${groupLabel} *`} />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map((g) => (
                          <SelectItem key={g._id} value={g._id}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="add-name" className="sr-only">Name</Label>
                      <Input id="add-name" required type="text" placeholder="Name *" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="add-class" className="sr-only">Class</Label>
                      <Input id="add-class" required type="text" placeholder="Class *" value={addForm.class} onChange={(e) => setAddForm((f) => ({ ...f, class: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="add-admission" className="sr-only">Admission No</Label>
                      <Input id="add-admission" type="text" placeholder="Admission No" value={addForm.admission_no} onChange={(e) => setAddForm((f) => ({ ...f, admission_no: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="add-phone" className="sr-only">Phone</Label>
                      <Input id="add-phone" type="text" placeholder="Phone" value={addForm.phone} onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="add-email" className="sr-only">Email</Label>
                      <Input id="add-email" type="email" placeholder="Email" value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="add-gender" className="sr-only">Gender</Label>
                      <Select
                        value={addForm.gender}
                        onValueChange={(val) => setAddForm((f) => ({ ...f, gender: val }))}
                      >
                        <SelectTrigger id="add-gender">
                          <SelectValue placeholder="Gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-accent-amber text-white hover:bg-accent-amber/90">
                    Add Participant
                  </Button>
                </form>
              </CardContent>
            </Card>
          </section>
        )}

        {activeTab === "import" && isSuperAdmin && (
          <section id="panel-import" role="tabpanel" aria-labelledby="tab-import">
            <ImportParticipants groups={groups} groupLabel={groupLabel} onDone={() => { switchTab("all"); fetchParticipants(); }} />
          </section>
        )}

        {activeTab === "update" && editingParticipant && (
          <section id="panel-update" role="tabpanel" aria-labelledby="tab-update">
            <Card className="max-w-xl">
              <CardHeader>
                <CardTitle>Edit Participant</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="edit-group" className="sr-only">{groupLabel}</Label>
                  <Select
                    value={editingParticipant.group_id}
                    onValueChange={(val) => setEditingParticipant((p) => ({ ...p, group_id: val }))}
                  >
                    <SelectTrigger id="edit-group">
                      <SelectValue placeholder={groupLabel} />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((g) => (
                        <SelectItem key={g._id} value={g._id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-name" className="sr-only">Name</Label>
                  <Input id="edit-name" required type="text" value={editingParticipant.name || ""} onChange={(e) => setEditingParticipant((p) => ({ ...p, name: e.target.value }))} placeholder="Name" />
                </div>
                <div>
                  <Label htmlFor="edit-class" className="sr-only">Class</Label>
                  <Input id="edit-class" required type="text" value={editingParticipant.class || ""} onChange={(e) => setEditingParticipant((p) => ({ ...p, class: e.target.value }))} placeholder="Class" />
                </div>
                <Button type="submit" onClick={handleEditSave} disabled={loading} className="w-full bg-accent-amber text-white hover:bg-accent-amber/90">
                  Save Changes
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setEditingParticipant(null)}>
                  Cancel
                </Button>
              </CardContent>
            </Card>
          </section>
        )}
      </div>

      <AlertDialog open={!!statusChangeTarget} onOpenChange={(open) => { if (!open) { setStatusChangeTarget(null); setStatusChangeValue(""); setStatusChangeReason(""); } }}>
        <AlertDialogContent className="max-h-[90dvh] overflow-y-auto w-[calc(100%-2rem)] sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle>Change Participant Status</AlertDialogTitle>
            <AlertDialogDescription>
              Change status for <strong>{statusChangeTarget?.name}</strong> (current: {getParticipantStatusMeta(statusChangeTarget?.status).label}).
              {statusChangeValue && (statusChangeValue === "withdrawn" || statusChangeValue === "disqualified") && " Reason is required for this change."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <Select value={statusChangeValue} onValueChange={setStatusChangeValue}>
              <SelectTrigger className="min-h-11">
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
                <SelectItem value="disqualified">Disqualified</SelectItem>
              </SelectContent>
            </Select>
            {(statusChangeValue === "withdrawn" || statusChangeValue === "disqualified") && (
              <div>
                <Label htmlFor="status-reason">Reason *</Label>
                <Input id="status-reason" type="text" value={statusChangeReason} onChange={(e) => setStatusChangeReason(e.target.value)} placeholder="Reason for status change" className="mt-1 min-h-11" />
              </div>
            )}
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <AlertDialogCancel className="min-h-11" onClick={() => { setStatusChangeTarget(null); setStatusChangeValue(""); setStatusChangeReason(""); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={!statusChangeValue || ((statusChangeValue === "withdrawn" || statusChangeValue === "disqualified") && !statusChangeReason.trim())} onClick={handleStatusChange} className="min-h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Change Status
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="max-h-[90dvh] overflow-y-auto w-[calc(100%-2rem)] sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "bulk"
                ? `Delete ${selectedIds.length} selected participants? This action cannot be undone.`
                : "Delete this participant? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <AlertDialogCancel className="min-h-11" onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="min-h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkLinksOpen} onOpenChange={(open) => { if (!open) { setBulkLinksOpen(false); } }}>
        <AlertDialogContent className="max-h-[90dvh] overflow-y-auto w-[calc(100%-2rem)] sm:max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Setup links ({bulkLinks?.links?.length || 0})</AlertDialogTitle>
            <AlertDialogDescription>
              Fresh one-time links — old links for these participants no longer work. Links expire in 7 days.
              Share manually (copy, Excel, or via house captain). Participants without a link can also self-serve
              at Participant Login → Claim with slug + admission no + email.
              {bulkLinks?.skippedActive > 0 && ` Skipped ${bulkLinks.skippedActive} with password already set.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col sm:flex-row gap-2 py-2">
            <Button variant="outline" className="min-h-10 flex-1" onClick={copyAllBulkLinks}>
              <Copy className="h-4 w-4 mr-1" /> Copy all
            </Button>
            <Button variant="outline" className="min-h-10 flex-1" onClick={downloadBulkLinksExcel}>
              <Download className="h-4 w-4 mr-1" /> Download Excel
            </Button>
          </div>
          <ul className="space-y-2 max-h-[40dvh] overflow-y-auto pr-1">
            {(bulkLinks?.links || []).map((l) => (
              <li key={String(l.participant_id)} className="rounded-lg border border-border p-2.5">
                <p className="text-sm font-medium text-card-foreground truncate">{l.name}</p>
                <p className="text-xs text-muted-foreground truncate">{l.email || "no-email"}</p>
                <div className="mt-1.5 flex items-center gap-2 rounded-md bg-muted px-2 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={l.setup_link}>{l.setup_link}</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(l.setup_link, `Link for ${l.name}`)}>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <AlertDialogCancel className="min-h-11" onClick={() => setBulkLinksOpen(false)}>Done</AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <ExportParticipantsDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        groups={groups}
        groupLabel={groupLabel}
      />
    </div>
  );
}

export default ManageParticipants;
