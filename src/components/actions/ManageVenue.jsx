import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";
import { useCompetition } from "../../context/CompetitionContext";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const ManageVenue = () => {
  const { token, competition } = useAuth();
  const { groupLabel } = useCompetition() || {};
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [venues, setVenues] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", location: "", capacity: "", coordinator_id: "" });

  const competitionId = competition?._id || competition?.id || competition?.competition_id;

  const apiCall = async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      body: options.body,
    });
  };

  const loadVenues = async () => {
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
  };

  useEffect(() => {
    if (token && competitionId) loadVenues();
  }, [token, competitionId]);

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
    <div className="rounded-xl shadow-sm p-4 border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--card-fg)' }}>Manage Venues</h2>
          <p className="text-sm" style={{ color: 'var(--chart-axis)' }}>Auditoriums, halls, classrooms, and grounds.</p>
        </div>
        <button
          type="button"
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"
        >
          + Add Venue
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-3">{error}</div>
      )}

      {showForm && (
        <div className="border rounded-lg p-4 mb-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--card-fg)' }}>
            {editing ? "Edit Venue" : "New Venue"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--chart-axis)' }}>Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                placeholder="Auditorium"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--chart-axis)' }}>Location *</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                placeholder="Main Building, 2nd Floor"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--chart-axis)' }}>Capacity</label>
              <input
                type="number"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                placeholder="100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--chart-axis)' }}>Coordinator</label>
              <input
                type="text"
                value={form.coordinator_id}
                onChange={(e) => setForm({ ...form, coordinator_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                placeholder="User ID (optional)"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveVenue}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"
            >
              {editing ? "Update" : "Create"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border rounded-lg text-sm font-medium"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--chart-axis)' }}>Loading...</p>
      ) : venues.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--chart-axis)' }}>No venues created yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border-divider)' }}>
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="p-3 text-left text-xs uppercase" style={{ color: 'var(--chart-axis)' }}>Name</th>
                <th className="p-3 text-left text-xs uppercase" style={{ color: 'var(--chart-axis)' }}>Location</th>
                <th className="p-3 text-left text-xs uppercase" style={{ color: 'var(--chart-axis)' }}>Capacity</th>
                <th className="p-3 text-left text-xs uppercase" style={{ color: 'var(--chart-axis)' }}>Coordinator</th>
                <th className="p-3 text-left text-xs uppercase" style={{ color: 'var(--chart-axis)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {venues.map((v) => (
                <tr key={v._id} className="border-t" style={{ borderColor: 'var(--border-divider)' }}>
                  <td className="p-3 text-sm font-medium" style={{ color: 'var(--card-fg)' }}>{v.name}</td>
                  <td className="p-3 text-sm" style={{ color: 'var(--card-fg)' }}>{v.location}</td>
                  <td className="p-3 text-sm" style={{ color: 'var(--card-fg)' }}>{v.capacity || "—"}</td>
                  <td className="p-3 text-sm" style={{ color: 'var(--card-fg)' }}>{v.coordinator_id?.name || "—"}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(v)}
                        className="text-xs px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                        style={{ borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteVenue(v._id)}
                        className="text-xs px-2 py-1 border rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                        style={{ borderColor: 'var(--border-divider)' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ManageVenue;
