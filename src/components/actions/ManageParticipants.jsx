import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";
import usePermission from "../../hooks/usePermission";
import { useCompetition } from "../../context/CompetitionContext";
import ImportParticipants from "./ImportParticipants";
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
import { Pencil, Trash2 } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

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
  const [search, setSearch] = useState("");

  const [selectedIds, setSelectedIds] = useState([]);

  const [addForm, setAddForm] = useState({ name: "", class: "", group_id: "", admission_no: "", phone: "", email: "", gender: "" });

  const [deleteTarget, setDeleteTarget] = useState(null);

  const apiCall = async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body || undefined,
    });
  };

  useEffect(() => {
    const load = async () => {
      if (!token || !competition?._id) return;
      setLoading(true);
      setError("");
      try {
        const groupsResp = await apiCall(`/api/competition/${competition._id}/groups`);
        setGroups(Array.isArray(groupsResp) ? groupsResp : groupsResp.groups || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, competition?._id]);

  const fetchParticipants = async () => {
    setLoading(true);
    setError("");
    try {
      let url = "/api/participants?";
      if (competition?._id) url += `competition_id=${competition._id}&`;
      if (filterGroup) url += `group_id=${filterGroup}&`;
      if (filterClass) url += `class=${encodeURIComponent(filterClass)}&`;
      if (search) url += `search=${encodeURIComponent(search)}&`;
      const { participants } = await apiCall(url);
      setParticipants(participants || []);
      setSelectedIds([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && activeTab === "all") fetchParticipants();
  }, [token, activeTab, filterGroup, filterClass, search]);

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
      const { participant } = await apiCall("/api/participants", {
        method: "POST",
        body: JSON.stringify(addForm),
      });
      setAddForm({ name: "", class: "", group_id: "", admission_no: "", phone: "", email: "", gender: "" });
      setParticipants((prev) => [participant, ...prev]);
      setActiveTab("all");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditStart = (stu) => {
    setEditingParticipant({
      ...stu,
      group_id: stu.group_id?._id || stu.group_id,
    });
    setActiveTab("update");
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiCall(`/api/participants/${editingParticipant._id}`, {
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
      await apiCall(`/api/participants/${id}`, { method: "DELETE" });
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
      await apiCall("/api/participants/bulk/remove", {
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
            className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-4"
            role="alert"
            aria-live="polite"
          >
            {error}
            <button
              onClick={() => setError("")}
              className="ml-2 text-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded"
            >
              ×
            </button>
          </div>
        )}

        <Card className="mb-4">
          <CardContent className="p-1 flex gap-1" role="tablist" aria-label="Participant management views">
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
                className={activeTab === tab.key ? "bg-accent-amber text-white hover:bg-accent-amber/90" : ""}
              >
                {tab.label}
              </Button>
            ))}
          </CardContent>
        </Card>

        {activeTab === "all" && (
          <section id="panel-all" role="tabpanel" aria-labelledby="tab-all" className="space-y-3">
            <div className="flex flex-wrap gap-2 mb-3 items-end">
              <div className="w-48">
                <Label htmlFor="filter-group" className="sr-only">Filter by {groupLabel}</Label>
                <Select value={filterGroup} onValueChange={setFilterGroup}>
                  <SelectTrigger id="filter-group">
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
              <div className="w-40">
                <Label htmlFor="filter-class" className="sr-only">Filter by class</Label>
                <Input id="filter-class" type="text" value={filterClass} onChange={(e) => setFilterClass(e.target.value)} placeholder="Filter by class" />
              </div>
              <div className="w-48">
                <Label htmlFor="search" className="sr-only">Search participants</Label>
                <Input id="search" type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" />
              </div>
              <Button variant="outline" onClick={handleDeselectAll}>Clear Selection</Button>
              <Button variant="outline" onClick={handleSelectAll}>Select All</Button>
              <Button variant="destructive" disabled={!selectedIds.length} onClick={() => setDeleteTarget({ type: "bulk" })}>
                Bulk Delete
              </Button>
            </div>

            <ul className="space-y-2 sm:hidden" aria-label="Participants list">
              {participants.map((stu) => (
                <li key={stu._id} className="rounded-xl border border-border p-3 shadow-sm bg-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium break-words text-card-foreground">{stu.name}</p>
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
                    <Button variant="destructive" size="sm" className="flex-1" onClick={() => setDeleteTarget({ type: "single", id: stu._id })}>
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
              {loading && <li className="text-center text-sm text-muted-foreground py-2">Loading…</li>}
            </ul>

            <Card className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Name</TableHead>
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
                      <TableCell className="text-card-foreground">{stu.class}</TableCell>
                      <TableCell className="text-card-foreground">{getGroupName(stu.group_id?._id || stu.group_id)}</TableCell>
                      <TableCell className="text-card-foreground">{stu.unique_id}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditStart(stu)} title="Edit">
                            <Pencil className="h-4 w-4" />
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
              {loading && <div className="px-3 py-2 text-muted-foreground text-center text-sm">Loading…</div>}
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
            <Card>
              <CardContent className="p-4 sm:p-6">
                <ImportParticipants groups={groups} groupLabel={groupLabel} onDone={() => { switchTab("all"); fetchParticipants(); }} />
              </CardContent>
            </Card>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "bulk"
                ? `Delete ${selectedIds.length} selected participants? This action cannot be undone.`
                : "Delete this participant? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ManageParticipants;
