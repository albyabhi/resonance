import React, { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { FadeIn } from "../AnimateReveal";
import { UserPlus, Users, Edit3, Trash2, Search, Copy, ExternalLink, Link } from "lucide-react";
import { useCompetition } from "../../context/CompetitionContext";
import { apiJson } from "../../utils/apiClient";
import toast from "react-hot-toast";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const BASE_ROLE_OPTIONS = [
  { value: "super_admin", label: "Super Admin" },
  { value: "organizer", label: "Organizer" },
  { value: "event_coordinator", label: "Event Coordinator" },
  { value: "judge", label: "Judge" },
];

const ManageUser = () => {
  const { token } = useAuth();
  const { competition, groupLabel } = useCompetition();
  const [activeTab, setActiveTab] = useState("manage");
  const [users, setUsers] = useState([]);
  const [houses, setHouses] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    role: "participant",
    house: "",
  });
  const [editingUserId, setEditingUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState(null);

  const roleOptions = BASE_ROLE_OPTIONS;

  const apiCall = async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      body: options.body,
    });
  };

  const fetchHouses = async () => {
    try {
      if (!competition?._id) return;
      const resp = await apiCall(`/api/competition/${competition._id}/groups`);
      setHouses(Array.isArray(resp.groups) ? resp.groups : []);
    } catch (err) {
      console.error("Failed to fetch houses:", err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await apiCall("/api/users");
      const userList = Array.isArray(resp.users) ? resp.users : resp.data || [];
      setUsers(userList);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUsers();
      fetchHouses();
    }
  }, [token, competition?._id]);

  useEffect(() => {
    if (houses.length === 0) {
      setFormData((prev) => ({ ...prev, house: "" }));
    }
  }, [houses.length]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const method = editingUserId ? "PUT" : "POST";
      const endpoint = editingUserId ? `/api/users/${editingUserId}` : "/api/users/add";

      const body = {
        name: formData.name.trim(),
        username: formData.username.trim().toLowerCase(),
        role: formData.role,
      };

      if (!editingUserId && formData.password) body.password = formData.password;
      if (formData.house) body.house = formData.house;

      const resp = await apiCall(endpoint, {
        method,
        body: JSON.stringify(body),
      });

      setFormData({ name: "", username: "", password: "", role: "participant", house: "" });
      setEditingUserId(null);

      if (!editingUserId && resp.credentials) {
        setCredentials(resp.credentials);
      } else {
        setActiveTab("manage");
      }

      await fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setFormData({
      name: user.name || "",
      username: user.username || "",
      password: "",
      role: user.role || "participant",
      house: user.house?._id || "",
    });
    setEditingUserId(user._id);
    setActiveTab("add");
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Are you sure you want to remove this user?")) return;
    try {
      await apiCall(`/api/users/${userId}`, { method: "DELETE" });
      await fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleResendLink = async (userId) => {
    try {
      const resp = await apiCall(`/api/users/setup-link/${userId}`, { method: "POST" });
      await navigator.clipboard.writeText(resp.setup_link);
      toast.success(`Setup link copied to clipboard for ${resp.email}`);
    } catch (err) {
      toast.error(err.message || "Failed to generate setup link");
    }
  };

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const filteredUsers = users.filter((u) =>
    !searchQuery || (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const roleLabel = (role) => {
    const found = BASE_ROLE_OPTIONS.find((r) => r.value === role);
    return found ? found.label : role;
  };

  return (
    <FadeIn>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold theme-text-primary">User Management</h2>
          <button
            onClick={() => { setActiveTab(activeTab === "manage" ? "add" : "manage"); setEditingUserId(null); setCredentials(null); setFormData({ name: "", username: "", password: "", role: "participant", house: "" }); }}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all hover:opacity-80"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            {activeTab === "manage" ? <UserPlus className="h-4 w-4" /> : <Users className="h-4 w-4" />}
            {activeTab === "manage" ? "Add User" : "View All"}
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {credentials && (
          <div className="rounded-2xl p-6 theme-card border-2 border-green-200 dark:border-green-900/40">
            <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-4">
              User Created — Share Credentials
            </h3>
            <div className="overflow-x-auto rounded-lg border mb-4" style={{ borderColor: 'var(--border-card)' }}>
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: 'var(--surface)' }}>
                  <tr>
                    <th className="p-3 text-left font-semibold theme-text-secondary">Field</th>
                    <th className="p-3 text-left font-semibold theme-text-secondary">Value</th>
                    <th className="p-3 text-left font-semibold theme-text-secondary">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b" style={{ borderColor: 'var(--border-divider)' }}>
                    <td className="p-3 font-medium theme-text-primary">Email</td>
                    <td className="p-3 theme-text-secondary">{credentials.email}</td>
                    <td className="p-3">
                      <button onClick={() => copyToClipboard(credentials.email, "Email")}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded hover:bg-indigo-500/10"
                        style={{ color: 'var(--accent)' }}>
                        <Copy className="h-3 w-3" /> Copy
                      </button>
                    </td>
                  </tr>
                  <tr className="border-b" style={{ borderColor: 'var(--border-divider)' }}>
                    <td className="p-3 font-medium theme-text-primary">Password</td>
                    <td className="p-3 font-mono text-orange-600 dark:text-orange-400">{credentials.password}</td>
                    <td className="p-3">
                      <button onClick={() => copyToClipboard(credentials.password, "Password")}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded hover:bg-indigo-500/10"
                        style={{ color: 'var(--accent)' }}>
                        <Copy className="h-3 w-3" /> Copy
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium theme-text-primary">Setup Link</td>
                    <td className="p-3">
                      <span className="text-xs break-all theme-text-secondary">{credentials.setup_link}</span>
                    </td>
                    <td className="p-3">
                      <button onClick={() => copyToClipboard(credentials.setup_link, "Setup link")}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded hover:bg-indigo-500/10"
                        style={{ color: 'var(--accent)' }}>
                        <Copy className="h-3 w-3" /> Copy Link
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--chart-axis)' }}>
              Share the password or the setup link with the user. The link expires in 7 days.
              The user can set their password at the link and then sign in.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setCredentials(null); setActiveTab("manage"); }}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all hover:opacity-80"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                Done — View All Users
              </button>
              <button
                onClick={() => { setCredentials(null); }}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all hover:opacity-80"
                style={{ backgroundColor: 'var(--surface)', color: 'var(--card-fg)' }}
              >
                Add Another User
              </button>
            </div>
          </div>
        )}

        {activeTab === "add" && !credentials && (
          <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl p-6 theme-card">
            <h3 className="text-lg font-semibold theme-text-primary">
              {editingUserId ? "Edit User" : "Add New User"}
            </h3>
            <p className="text-xs theme-text-secondary -mt-3">
              Password is optional — leave blank to auto-generate a secure password and setup link.
            </p>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider theme-text-secondary">Name</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Full name"
                  required
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all focus:ring-2"
                  style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider theme-text-secondary">Email</label>
                <input
                  name="username"
                  type="email"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="email@example.com"
                  required
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all focus:ring-2"
                  style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                />
              </div>

              {!editingUserId && (
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider theme-text-secondary">
                    Password <span className="font-normal lowercase opacity-60">(optional)</span>
                  </label>
                  <input
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Leave blank to auto-generate"
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all focus:ring-2"
                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider theme-text-secondary">Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all focus:ring-2"
                  style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                >
                  {roleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider theme-text-secondary">
                  {groupLabel || "Group"}
                </label>
                <select
                  name="house"
                  value={formData.house}
                  onChange={handleChange}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all focus:ring-2"
                  style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                >
                  <option value="">Select {groupLabel || "Group"}</option>
                  {houses.map((h) => (
                    <option key={h._id} value={h._id}>{h.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                {loading ? "Saving..." : (editingUserId ? "Update User" : "Add User")}
              </button>
              {editingUserId && (
                <button
                  type="button"
                  onClick={() => { setEditingUserId(null); setFormData({ name: "", username: "", password: "", role: "participant", house: "" }); }}
                  className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all hover:opacity-80"
                  style={{ backgroundColor: 'var(--surface)', color: 'var(--card-fg)' }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}

        {activeTab === "manage" && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users by name..."
                className="w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
              />
            </div>

            <div className="overflow-x-auto rounded-2xl theme-card">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border-divider)' }}>
                    <th className="px-4 py-3 font-semibold theme-text-secondary">Name</th>
                    <th className="px-4 py-3 font-semibold theme-text-secondary">Email</th>
                    <th className="px-4 py-3 font-semibold theme-text-secondary">Role</th>
                    <th className="px-4 py-3 font-semibold theme-text-secondary">{groupLabel || "House"}</th>
                    <th className="px-4 py-3 font-semibold theme-text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center theme-text-secondary">Loading...</td></tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center theme-text-secondary">No users found</td></tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user._id} className="border-b last:border-0" style={{ borderColor: 'var(--border-divider)' }}>
                        <td className="px-4 py-3 font-medium theme-text-primary">{user.name}</td>
                        <td className="px-4 py-3 theme-text-secondary">{user.username || user.email}</td>
                        <td className="px-4 py-3">
                          <span className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
                            style={{ backgroundColor: 'var(--surface)', color: 'var(--accent)' }}>
                            {roleLabel(user.role || user.membership_role)}
                          </span>
                        </td>
                        <td className="px-4 py-3 theme-text-secondary">{user.house?.name || "-"}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleResendLink(user._id)}
                              title="Generate setup link"
                              className="rounded-lg p-2 transition-colors hover:bg-emerald-500/10"
                            >
                              <ExternalLink className="h-4 w-4 text-emerald-500" />
                            </button>
                            <button onClick={() => handleEdit(user)}
                              className="rounded-lg p-2 transition-colors hover:bg-indigo-500/10">
                              <Edit3 className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                            </button>
                            <button onClick={() => handleDelete(user._id)}
                              className="rounded-lg p-2 transition-colors hover:bg-red-500/10">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </FadeIn>
  );
};

export default ManageUser;
