import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";
import { Pencil, Trash2, Plus, MapPin, Users, Search, X } from "lucide-react";
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
import { Badge } from "../ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "../ui/alert-dialog";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const ManageVenue = () => {
  const { token, competition, role } = useAuth();
  // Coordinators get GET /api/venues only (POST/PUT/DELETE are organizer-only).
  // Render a read-only directory so the sidebar action never hits a 403.
  const isCoordinator = String(role || "").toLowerCase() === "event_coordinator";
  const canWriteVenues = !isCoordinator;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [venues, setVenues] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", location: "", capacity: "", coordinator_id: "" });
  const [coordinators, setCoordinators] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const formRef = useRef(null);

  const competitionId = competition?._id || competition?.id || competition?.competition_id;

  const apiCall = useCallback(async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      body: options.body,
    });
  }, [token]);

  const loadVenues = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await apiCall(`/api/venues?competition_id=${competitionId}`);
      setVenues(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [competitionId, apiCall]);

  useEffect(() => {
    if (token && competitionId) loadVenues();
  }, [token, competitionId, loadVenues]);

  useEffect(() => {
    if (!token) return;
    const fetchCoordinators = async () => {
      try {
        const { data } = await apiCall("/api/event/coordinators");
        setCoordinators(data || []);
      } catch {
        setCoordinators([]);
      }
    };
    fetchCoordinators();
  }, [token, apiCall]);

  useEffect(() => {
    if (showForm) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [showForm]);

  const resetForm = () => {
    setForm({ name: "", location: "", capacity: "", coordinator_id: "" });
    setEditing(null);
    setShowForm(false);
  };

  const openEdit = (venue) => {
    setForm({
      name: venue.name || "",
      location: venue.location || "",
      capacity: venue.capacity || "",
      coordinator_id: venue.coordinator_id?._id || venue.coordinator_id || "",
    });
    setEditing(venue._id);
    setShowForm(true);
  };

  const saveVenue = async () => {
    try {
      setError("");
      if (!form.name.trim() || !form.location.trim()) {
        setError("Name and location are required");
        return;
      }
      const payload = {
        name: form.name.trim(),
        location: form.location.trim(),
        capacity: form.capacity ? parseInt(form.capacity, 10) : null,
        coordinator_id: form.coordinator_id || null,
        competition_id: competitionId,
      };

      if (editing) {
        await apiCall(`/api/venues/${editing}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await apiCall("/api/venues", { method: "POST", body: JSON.stringify(payload) });
      }
      resetForm();
      await loadVenues();
    } catch (err) {
      setError(err.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await apiCall(`/api/venues/${deleteTarget._id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await loadVenues();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const filteredVenues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return venues;
    return venues.filter(
      (v) =>
        (v.name || "").toLowerCase().includes(q) ||
        (v.location || "").toLowerCase().includes(q) ||
        (v.coordinator_id?.name || "").toLowerCase().includes(q)
    );
  }, [venues, searchQuery]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <CardTitle>Manage Venues</CardTitle>
          <p className="text-sm text-muted-foreground">
            Auditoriums, halls, classrooms, and grounds.
          </p>
        </div>
        {canWriteVenues ? (
          <Button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="min-h-[44px] w-full bg-accent-amber text-white hover:bg-accent-amber/90 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Add Venue
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground sm:text-right">
            Read-only for coordinators — contact an organizer to add venues.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <span className="flex-1">{error}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setError("")} aria-label="Dismiss error">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {canWriteVenues && showForm && (
          <div ref={formRef} className="scroll-mt-4 rounded-lg border border-border bg-muted p-4">
            <h3 className="mb-3 text-sm font-semibold text-card-foreground">
              {editing ? "Edit Venue" : "New Venue"}
            </h3>
            <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Name *
                </label>
                <Input
                  type="text"
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Auditorium"
                  className="min-h-[44px] text-base sm:text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Location *
                </label>
                <Input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Main Building, 2nd Floor"
                  className="min-h-[44px] text-base sm:text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Capacity
                </label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  placeholder="100"
                  className="min-h-[44px] text-base sm:text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Coordinator
                </label>
                <Select
                  value={form.coordinator_id || "none"}
                  onValueChange={(v) => setForm({ ...form, coordinator_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {coordinators.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}{c.email ? ` (${c.email})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                onClick={saveVenue}
                className="min-h-[44px] w-full bg-accent-amber text-white hover:bg-accent-amber/90 sm:w-auto"
              >
                {editing ? "Update" : "Create"}
              </Button>
              <Button variant="outline" onClick={resetForm} className="min-h-[44px] w-full sm:w-auto">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {venues.length > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search venues..."
                className="min-h-[44px] pl-9"
              />
            </div>
            <Badge variant="secondary" className="w-fit shrink-0">
              {filteredVenues.length} venue{filteredVenues.length === 1 ? "" : "s"}
            </Badge>
          </div>
        )}

        {loading ? null : filteredVenues.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-4 py-10 text-center">
            <MapPin className="h-8 w-8 text-muted-foreground/50" />
            <div>
              <p className="text-sm font-semibold text-card-foreground">
                {venues.length === 0 ? "No venues created yet." : "No venues match your search."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {venues.length === 0
                  ? "Add auditoriums, halls, or grounds to assign them to events."
                  : "Try a different name, location, or coordinator."}
              </p>
            </div>
            {canWriteVenues && venues.length === 0 && !showForm && (
              <Button
                onClick={() => { resetForm(); setShowForm(true); }}
                className="min-h-[44px] w-full bg-accent-amber text-white hover:bg-accent-amber/90 sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Add your first venue
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="space-y-3 md:hidden">
              {filteredVenues.map((v) => (
                <div key={v._id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-card-foreground">{v.name}</h3>
                      <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span className="line-clamp-2 break-words">{v.location}</span>
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      <Users className="mr-1 h-3 w-3" />
                      {v.capacity || "—"}
                    </Badge>
                  </div>
                  <p className="mt-2 truncate text-xs text-muted-foreground">
                    {v.coordinator_id?.name ? `Coordinator: ${v.coordinator_id.name}` : "No coordinator"}
                  </p>
                  {canWriteVenues && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(v)}
                        aria-label={`Edit ${v.name}`}
                        className="min-h-[44px] flex-1"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteTarget(v)}
                        aria-label={`Delete ${v.name}`}
                        className="min-h-[44px] flex-1 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Coordinator</TableHead>
                    {canWriteVenues && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVenues.map((v) => (
                    <TableRow key={v._id}>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell>{v.location}</TableCell>
                      <TableCell>{v.capacity || "—"}</TableCell>
                      <TableCell>{v.coordinator_id?.name || "—"}</TableCell>
                      {canWriteVenues && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(v)}
                              title="Edit venue"
                              aria-label={`Edit ${v.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTarget(v)}
                              title="Delete venue"
                              aria-label={`Delete ${v.name}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete venue?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? (
                <>This will permanently delete <span className="font-semibold">“{deleteTarget.name}”</span>. Events using it will need a new venue.</>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel className="min-h-[44px]" disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleting}
              className="min-h-[44px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default ManageVenue;
