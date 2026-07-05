import { useEffect, useState, useMemo } from "react";
import { useCompetition } from "../../context/CompetitionContext";
import { apiJson } from "../../utils/apiClient";
import toast from "react-hot-toast";
import {
  Users, Search, Plus, X, AlertCircle, CheckCircle,
  Edit, Trash2, Save, UserPlus, Filter,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem("auth")
    ? JSON.parse(localStorage.getItem("auth")).token
    : null;
  if (!token) throw new Error("No authorization token found");
  return apiJson(`${API_BASE_URL}${endpoint}`, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    body: options.body,
  });
};

export default function CaptainMyGroup() {
  const { competition, groupLabel } = useCompetition();
  const participantSource = competition?.participant_source || "import";
  const canCreateParticipants =
    participantSource === "captain" || participantSource === "hybrid";

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

  const fetchParticipants = async () => {
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
  };

  useEffect(() => {
    fetchParticipants();
  }, []);

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

  const handleDelete = async (participantId, name) => {
    if (!window.confirm(`Delete participant "${name}"? This cannot be undone.`)) return;
    try {
      setSubmitting(true);
      await apiCall(`/api/participants/${participantId}`, { method: "DELETE" });
      setParticipants((prev) => prev.filter((p) => p._id !== participantId));
      toast.success(`${name} removed from group`);
    } catch (err) {
      toast.error(err.message || "Failed to delete participant");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold" style={{ color: "var(--card-fg)" }}>
            My {groupLabel}
          </h2>
          {groupInfo && (
            <p className="text-sm mt-1" style={{ color: "var(--chart-axis)" }}>
              {groupInfo.name} &middot; {participants.length} participant{participants.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        {canCreateParticipants && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-md"
          >
            {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showAddForm ? "Cancel" : "Add Participant"}
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-sm font-semibold">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {!canCreateParticipants && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl text-sm flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          Participants are managed by administrators. You can view and register them for events.
        </div>
      )}

      {showAddForm && canCreateParticipants && (
        <form
          onSubmit={handleAddSubmit}
          className="p-6 border rounded-2xl space-y-4"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-divider)" }}
        >
          <h3 className="font-bold text-lg" style={{ color: "var(--card-fg)" }}>
            Add New Participant
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--chart-axis)" }}>
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text" required
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                style={{ backgroundColor: "var(--card)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--chart-axis)" }}>
                Class <span className="text-red-400">*</span>
              </label>
              <input
                type="text" required
                value={addForm.class}
                onChange={(e) => setAddForm((f) => ({ ...f, class: e.target.value }))}
                className="w-full px-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                style={{ backgroundColor: "var(--card)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
                placeholder="e.g. 10A"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--chart-axis)" }}>
                Admission No
              </label>
              <input
                type="text"
                value={addForm.admission_no}
                onChange={(e) => setAddForm((f) => ({ ...f, admission_no: e.target.value }))}
                className="w-full px-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                style={{ backgroundColor: "var(--card)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--chart-axis)" }}>
                Phone
              </label>
              <input
                type="text"
                value={addForm.phone}
                onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                style={{ backgroundColor: "var(--card)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--chart-axis)" }}>
                Email
              </label>
              <input
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                style={{ backgroundColor: "var(--card)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--chart-axis)" }}>
                Gender
              </label>
              <select
                value={addForm.gender}
                onChange={(e) => setAddForm((f) => ({ ...f, gender: e.target.value }))}
                className="w-full px-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                style={{ backgroundColor: "var(--card)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
              >
                <option value="">Not specified</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2.5 border rounded-xl text-sm font-bold transition-all"
              style={{ backgroundColor: "var(--card)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" />
              {submitting ? "Adding..." : "Add Participant"}
            </button>
          </div>
        </form>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--chart-axis)" }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search participants by name, ID, or class...`}
          className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--chart-axis)" }}>
            Loading participants...
          </p>
        </div>
      ) : filteredParticipants.length === 0 ? (
        <div className="text-center py-20 border rounded-3xl" style={{ backgroundColor: "var(--card)", borderColor: "var(--border-card)" }}>
          <Users className="h-14 w-14 mx-auto mb-4" style={{ color: "var(--chart-axis)" }} />
          <p className="font-semibold text-lg" style={{ color: "var(--chart-axis)" }}>
            {search ? "No participants match your search" : `No participants in your ${groupLabel.toLowerCase()}`}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--chart-axis)" }}>
            {canCreateParticipants && !search
              ? "Click 'Add Participant' above to get started."
              : "Check back after organizers add participants."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden border rounded-2xl" style={{ borderColor: "var(--border-card)" }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: "var(--surface)" }}>
                  <th className="text-left p-3 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--chart-axis)" }}>
                    Name
                  </th>
                  <th className="text-left p-3 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--chart-axis)" }}>
                    Class
                  </th>
                  <th className="text-left p-3 text-xs font-bold uppercase tracking-wider hidden sm:table-cell" style={{ color: "var(--chart-axis)" }}>
                    ID
                  </th>
                  <th className="text-left p-3 text-xs font-bold uppercase tracking-wider hidden md:table-cell" style={{ color: "var(--chart-axis)" }}>
                    Email
                  </th>
                  <th className="text-center p-3 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--chart-axis)" }}>
                    Events
                  </th>
                  <th className="text-right p-3 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--chart-axis)" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.map((p) => (
                  <tr
                    key={p._id}
                    className="border-t"
                    style={{ borderColor: "var(--border-divider)" }}
                  >
                    {editingId === p._id ? (
                      <>
                        <td className="p-2" colSpan={5}>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <input
                              value={editForm.name}
                              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                              className="px-2 py-1.5 border rounded-lg text-sm"
                              style={{ backgroundColor: "var(--card)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
                              placeholder="Name"
                            />
                            <input
                              value={editForm.class}
                              onChange={(e) => setEditForm((f) => ({ ...f, class: e.target.value }))}
                              className="px-2 py-1.5 border rounded-lg text-sm"
                              style={{ backgroundColor: "var(--card)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
                              placeholder="Class"
                            />
                            <input
                              value={editForm.admission_no}
                              onChange={(e) => setEditForm((f) => ({ ...f, admission_no: e.target.value }))}
                              className="px-2 py-1.5 border rounded-lg text-sm"
                              style={{ backgroundColor: "var(--card)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
                              placeholder="Admission No"
                            />
                            <input
                              value={editForm.email}
                              onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                              className="px-2 py-1.5 border rounded-lg text-sm"
                              style={{ backgroundColor: "var(--card)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
                              placeholder="Email"
                            />
                            <input
                              value={editForm.phone}
                              onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                              className="px-2 py-1.5 border rounded-lg text-sm"
                              style={{ backgroundColor: "var(--card)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
                              placeholder="Phone"
                            />
                            <select
                              value={editForm.gender}
                              onChange={(e) => setEditForm((f) => ({ ...f, gender: e.target.value }))}
                              className="px-2 py-1.5 border rounded-lg text-sm"
                              style={{ backgroundColor: "var(--card)", borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
                            >
                              <option value="">Gender</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                        </td>
                        <td className="p-2 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEditSubmit(p._id)}
                              disabled={submitting}
                              className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all"
                              title="Save"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-2 border rounded-lg transition-all"
                              style={{ borderColor: "var(--border-divider)", color: "var(--card-fg)" }}
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3" style={{ color: "var(--card-fg)" }}>
                          <div className="font-semibold text-sm">{p.name}</div>
                          {p.admission_no && (
                            <div className="text-xs" style={{ color: "var(--chart-axis)" }}>
                              {p.admission_no}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-sm" style={{ color: "var(--card-fg)" }}>
                          {p.class}
                        </td>
                        <td className="p-3 text-sm hidden sm:table-cell" style={{ color: "var(--card-fg)" }}>
                          <code className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "var(--surface)" }}>
                            {p.unique_id || "-"}
                          </code>
                        </td>
                        <td className="p-3 text-sm hidden md:table-cell" style={{ color: "var(--card-fg)" }}>
                          {p.email || "-"}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${
                              p.event_registrations > 0
                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                            }`}
                          >
                            {p.event_registrations}
                          </span>
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => startEdit(p)}
                              className="p-2 hover:bg-indigo-500/10 rounded-lg transition-all"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4 text-indigo-500" />
                            </button>
                            <button
                              onClick={() => handleDelete(p._id, p.name)}
                              className="p-2 hover:bg-red-500/10 rounded-lg transition-all"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
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
