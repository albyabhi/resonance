import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";
import { Pencil, Trash2 } from "lucide-react";
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const ManageVenue = () => {
  const { token, competition } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [venues, setVenues] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", location: "", capacity: "", coordinator_id: "" });
  const [coordinators, setCoordinators] = useState([]);

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

  const deleteVenue = async (id) => {
    if (!window.confirm("Delete this venue?")) return;
    try {
      await apiCall(`/api/venues/${id}`, { method: "DELETE" });
      await loadVenues();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Manage Venues</CardTitle>
          <p className="text-sm text-muted-foreground">
            Auditoriums, halls, classrooms, and grounds.
          </p>
        </div>
        <Button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-accent-amber text-white hover:bg-accent-amber/90"
        >
          + Add Venue
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {showForm && (
          <div className="mb-4 rounded-lg border border-border bg-muted p-4">
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
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Auditorium"
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
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Capacity
                </label>
                <Input
                  type="number"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  placeholder="100"
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
                  <SelectTrigger>
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
            <div className="flex gap-2">
              <Button
                onClick={saveVenue}
                className="bg-accent-amber text-white hover:bg-accent-amber/90"
              >
                {editing ? "Update" : "Create"}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : venues.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No venues created yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Coordinator</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {venues.map((v) => (
                  <TableRow key={v._id}>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell>{v.location}</TableCell>
                    <TableCell>{v.capacity || "\u2014"}</TableCell>
                    <TableCell>{v.coordinator_id?.name || "\u2014"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(v)}
                          title="Edit venue"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteVenue(v._id)}
                          title="Delete venue"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ManageVenue;
