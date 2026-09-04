import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "../AuthContext";
import { useCompetition } from "../../context/CompetitionContext";
import { apiJson } from "../../utils/apiClient";
import toast from "react-hot-toast";
import { useMobileMode } from "../utils/useMobileMode";
import {
  Users, Search, Plus, X, AlertCircle,
  Edit, Trash2, Save, UserPlus, Loader2,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../ui/table";
import { getParticipantStatusMeta } from "../../utils/participantStatus";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";
import { Label } from "../ui/label";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent,
  AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogAction, AlertDialogCancel,
} from "../ui/alert-dialog";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

export default function CaptainMyGroup() {
  const { token } = useAuth();
  const { competition, groupLabel } = useCompetition();
  const { isMobile } = useMobileMode();
  const participantSource = competition?.participant_source || "import";
  const canCreateParticipants =
    participantSource === "captain" || participantSource === "hybrid";

  const apiCall = useCallback(async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      body: options.body,
    });
  }, [token]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [participants, setParticipants] = useState([]);
  const [groupInfo, setGroupInfo] = useState(null);
  const [search, setSearch] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "", class: "", admission_no: "", phone: "", email: "", gender: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchParticipants = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const resp = await apiCall("/api/captain/group-participants");
      if (resp.success) {
        setParticipants(resp.data || []);
        setGroupInfo(resp.group || null);
      }
    } catch (err) {
      setError(err.message || "Failed to load group participants");
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  const filteredParticipants = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return participants;
    return participants.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.unique_id || "").toLowerCase().includes(q) ||
        (p.admission_no || "").toLowerCase().includes(q) ||
        p.class.toLowerCase().includes(q)
    );
  }, [participants, search]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.class.trim()) {
      toast.error("Name and class are required");
      return;
    }
    try {
      setSubmitting(true);
      await apiCall("/api/captain/create-participant", {
        method: "POST",
        body: JSON.stringify(addForm),
      });
      setAddForm({ name: "", class: "", admission_no: "", phone: "", email: "", gender: "" });
      setShowAddForm(false);
      toast.success("Participant added to your group");
      fetchParticipants();
    } catch (err) {
      toast.error(err.message || "Failed to create participant");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (p) => {
    setEditingId(p._id);
    setEditForm({
      name: p.name,
      class: p.class,
      admission_no: p.admission_no || "",
      phone: p.phone || "",
      email: p.email || "",
      gender: p.gender || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleEditSubmit = async (participantId) => {
    try {
      setSubmitting(true);
      await apiCall(`/api/participants/${participantId}`, {
        method: "PUT",
        body: JSON.stringify(editForm),
      });
      cancelEdit();
      toast.success("Participant updated");
      fetchParticipants();
    } catch (err) {
      toast.error(err.message || "Failed to update participant");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSubmitting(true);
      await apiCall(`/api/participants/${deleteTarget._id}`, { method: "DELETE" });
      setParticipants((prev) => prev.filter((p) => p._id !== deleteTarget._id));
      toast.success(`${deleteTarget.name} removed from group`);
    } catch (err) {
      toast.error(err.message || "Failed to delete participant");
    } finally {
      setSubmitting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-extrabold text-card-foreground">
            My {groupLabel}
          </h2>
          {groupInfo && (
            <p className="text-sm mt-1 text-muted-foreground truncate">
              {groupInfo.name} &middot; {participants.length} participant{participants.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        {canCreateParticipants && (
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="gap-2 min-h-[44px] w-full sm:w-auto"
          >
            {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showAddForm ? "Cancel" : "Add Participant"}
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-accent-red-tint border border-accent-red/20 text-accent-red rounded-2xl text-sm font-semibold">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {!canCreateParticipants && (
        <div className="p-4 bg-accent-amber-tint border border-accent-amber/20 text-accent-amber rounded-2xl text-sm flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Participants are managed by the organizer for this competition.</p>
            <p className="text-xs mt-0.5 opacity-80">You can view your group members and register them for events, but cannot add, edit, or delete participants.</p>
          </div>
        </div>
      )}

      {showAddForm && canCreateParticipants && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Participant</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label>
                    Name <span className="text-accent-red">*</span>
                  </Label>
                  <Input
                    type="text" required
                    value={addForm.name}
                    onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Full name"
                    className="min-h-[44px] text-base sm:text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Class <span className="text-accent-red">*</span>
                  </Label>
                  <Input
                    type="text" required
                    value={addForm.class}
                    onChange={(e) => setAddForm((f) => ({ ...f, class: e.target.value }))}
                    placeholder="e.g. 10A"
                    className="min-h-[44px] text-base sm:text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Admission No</Label>
                  <Input
                    type="text"
                    value={addForm.admission_no}
                    onChange={(e) => setAddForm((f) => ({ ...f, admission_no: e.target.value }))}
                    placeholder="Optional"
                    className="min-h-[44px] text-base sm:text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    type="text"
                    value={addForm.phone}
                    onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="Optional"
                    className="min-h-[44px] text-base sm:text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="Optional"
                    className="min-h-[44px] text-base sm:text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select
                    value={addForm.gender}
                    onValueChange={(v) => setAddForm((f) => ({ ...f, gender: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Not specified" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                  className="min-h-[44px] w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="gap-2 min-h-[44px] w-full sm:w-auto"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  {submitting ? "Adding..." : "Add Participant"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="sticky top-0 z-10 -mx-1 px-1 py-2" style={{ backgroundColor: "var(--background)" }}>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search participants by name, ID, or class...`}
          className="pl-10 min-h-[44px] text-base sm:text-sm"
        />
      </div>
      {!loading && filteredParticipants.length > 0 && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Showing {filteredParticipants.length} of {participants.length}
        </p>
      )}
      </div>

      {loading ? null : filteredParticipants.length === 0 ? (
        <Card className="text-center py-20">
          <CardContent>
            <Users className="h-14 w-14 mx-auto mb-4 text-muted-foreground" />
            <p className="font-semibold text-lg text-muted-foreground">
              {search ? "No participants match your search" : `No participants in your ${groupLabel.toLowerCase()}`}
            </p>
            <p className="text-xs mt-1 text-muted-foreground">
              {canCreateParticipants && !search
                ? "Click 'Add Participant' above to get started."
                : "Check back after organizers add participants."}
            </p>
          </CardContent>
        </Card>
      ) : isMobile ? (
        <div className="space-y-3">
          {filteredParticipants.map((p) => (
            <Card key={p._id} className="p-4">
              {editingId === p._id ? (
                <div className="space-y-3">
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    className="min-h-[48px] text-base"
                    placeholder="Name"
                  />
                  <Input
                    value={editForm.class}
                    onChange={(e) => setEditForm((f) => ({ ...f, class: e.target.value }))}
                    className="min-h-[48px] text-base"
                    placeholder="Class"
                  />
                  <Input
                    value={editForm.admission_no}
                    onChange={(e) => setEditForm((f) => ({ ...f, admission_no: e.target.value }))}
                    className="min-h-[48px] text-base"
                    placeholder="Admission No"
                  />
                  <Input
                    value={editForm.email}
                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                    className="min-h-[48px] text-base"
                    placeholder="Email"
                  />
                  <Input
                    value={editForm.phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                    className="min-h-[48px] text-base"
                    placeholder="Phone"
                  />
                  <Select
                    value={editForm.gender}
                    onValueChange={(v) => setEditForm((f) => ({ ...f, gender: v }))}
                  >
                    <SelectTrigger className="min-h-[48px] text-base">
                      <SelectValue placeholder="Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleEditSubmit(p._id)}
                      disabled={submitting}
                      className="flex-1 min-h-[48px] gap-2 bg-accent-green hover:bg-accent-green/90"
                    >
                      <Save className="h-5 w-5" /> Save
                    </Button>
                    <Button
                      onClick={cancelEdit}
                      variant="outline"
                      className="flex-1 min-h-[48px]"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base leading-snug text-card-foreground break-words">
                        {p.name}
                      </p>
                      <div className="mt-1">
                      <Badge variant={getParticipantStatusMeta(p.status).badge} className="text-[10px]">
                        {getParticipantStatusMeta(p.status).label}
                      </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {p.class}
                        {p.unique_id && <span> &middot; {p.unique_id}</span>}
                      </p>
                    </div>
                    <span
                      title="Event registrations"
                      className={`inline-flex shrink-0 items-center justify-center h-9 w-9 rounded-full text-sm font-bold ml-2 ${
                        p.event_registrations > 0
                          ? "bg-accent-green/10 text-accent-green"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.event_registrations}
                    </span>
                  </div>
                  {p.admission_no && (
                    <p className="text-xs mb-2 text-muted-foreground">Adm: {p.admission_no}</p>
                  )}
                  {p.email && (
                    <p className="text-xs mb-3 text-muted-foreground">{p.email}</p>
                  )}
                  {canCreateParticipants && (
                    <div className="flex gap-2.5 pt-3 mt-1 border-t border-border">
                      <Button
                        variant="outline"
                        onClick={() => startEdit(p)}
                        className="flex-1 min-h-[44px] gap-2"
                      >
                        <Edit className="h-4 w-4" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setDeleteTarget(p)}
                        className="flex-1 min-h-[44px] gap-2 text-accent-red"
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </Button>
                    </div>
                  )}
                </>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead className="text-xs font-bold uppercase tracking-wider">Name</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Class</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider hidden lg:table-cell">ID</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider hidden xl:table-cell">Email</TableHead>
                <TableHead className="text-center text-xs font-bold uppercase tracking-wider">Events</TableHead>
                {canCreateParticipants && (
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParticipants.map((p) => (
                <TableRow key={p._id}>
                  {editingId === p._id ? (
                    <>
                      <TableCell colSpan={5}>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="h-8 text-sm" placeholder="Name" />
                          <Input value={editForm.class} onChange={(e) => setEditForm((f) => ({ ...f, class: e.target.value }))} className="h-8 text-sm" placeholder="Class" />
                          <Input value={editForm.admission_no} onChange={(e) => setEditForm((f) => ({ ...f, admission_no: e.target.value }))} className="h-8 text-sm" placeholder="Admission No" />
                          <Input value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} className="h-8 text-sm" placeholder="Email" />
                          <Input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} className="h-8 text-sm" placeholder="Phone" />
                          <Select
                            value={editForm.gender}
                            onValueChange={(v) => setEditForm((f) => ({ ...f, gender: v }))}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button onClick={() => handleEditSubmit(p._id)} disabled={submitting} className="h-8 w-8 p-0 bg-accent-green hover:bg-accent-green/90" title="Save">
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button onClick={cancelEdit} variant="outline" className="h-8 w-8 p-0" title="Cancel">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>
                        <div className="font-semibold text-sm text-card-foreground">{p.name}</div>
                        {p.admission_no && <div className="text-xs text-muted-foreground">{p.admission_no}</div>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getParticipantStatusMeta(p.status).badge} className="text-[10px]">
                          {getParticipantStatusMeta(p.status).label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-card-foreground">{p.class}</TableCell>
                      <TableCell className="text-sm hidden lg:table-cell">
                        <code className="text-xs px-2 py-0.5 rounded bg-muted text-card-foreground">{p.unique_id || "-"}</code>
                      </TableCell>
                      <TableCell className="text-sm hidden xl:table-cell text-card-foreground max-w-[180px] truncate">{p.email || "-"}</TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${p.event_registrations > 0 ? "bg-accent-green/10 text-accent-green" : "bg-muted text-muted-foreground"}`}>
                          {p.event_registrations}
                        </span>
                      </TableCell>
                      {canCreateParticipants && (
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" onClick={() => startEdit(p)} className="h-9 w-9 p-0" title="Edit" aria-label={`Edit ${p.name}`}>
                            <Edit className="h-4 w-4 text-accent-blue" />
                          </Button>
                          <Button variant="ghost" onClick={() => setDeleteTarget(p)} className="h-9 w-9 p-0" title="Delete" aria-label={`Delete ${p.name}`}>
                            <Trash2 className="h-4 w-4 text-accent-red" />
                          </Button>
                        </div>
                      </TableCell>
                      )}
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Participant</AlertDialogTitle>
            <AlertDialogDescription>
              Delete participant "{deleteTarget?.name}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={submitting}>Delete</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
