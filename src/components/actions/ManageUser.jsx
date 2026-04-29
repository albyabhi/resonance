// src/components/actions/ManageUser.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { useIsMobile } from "../utils/useIsMobile";
import { FadeIn } from "../AnimateReveal";
import { UserPlus, Users, Edit3, Trash2, Shield, House, Search, Filter, Mail, Calendar, ChevronRight } from "lucide-react";
import { useCompetition } from "../../context/CompetitionContext";
import { apiJson } from "../../utils/apiClient";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const roles = ["admin", "captain", "student_coordinator", "faculty", "guest"];

const mapToBackendRole = (feRole) => {
  const map = {
    admin: "admin",
    student_coordinator: "coordinator",
    faculty: "faculty",
    captain: "participant",
    guest: "participant"
  };
  return map[feRole] || "participant";
};

const ManageUser = () => {
  const { token } = useAuth();
  const { competition, groupLabel, groupLabelPlural } = useCompetition();
  const [activeTab, setActiveTab] = useState("manage");
  const [users, setUsers] = useState([]);
  const [houses, setHouses] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState({});
  const [customPermissions, setCustomPermissions] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    role: "guest",
    house: "",
  });
  const [editingUserId, setEditingUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const mobileView = useIsMobile();

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
      setHouses(Array.isArray(resp) ? resp : []);
    } catch { setHouses([]); }
  };

  const fetchPermissions = async () => {
    try {
      const resp = await apiCall("/api/users/permissions");
      if (resp.success) {
        setAvailablePermissions(resp.permissions);
      }
    } catch (err) {
      console.error("Failed to fetch permissions:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const resp = await apiCall("/api/users");
      setUsers(Array.isArray(resp) ? resp : resp.users || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (token) { 
      fetchUsers(); 
      fetchPermissions();
    }
  }, [token]);

  useEffect(() => {
    if (token && competition?._id) {
      fetchHouses();
    }
  }, [token, competition]);

  const handleAddOrEditUser = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const requiresHouse = ["captain", "student_coordinator"].includes(formData.role);
      const basePayload = requiresHouse ? { ...formData, house: formData.house || null } : formData;
      const payload = { ...basePayload, custom_permissions: customPermissions };

      if (editingUserId) {
        const resp = await apiCall(`/api/users/${editingUserId}`, { method: "PUT", body: JSON.stringify(payload) });
        const updatedUser = resp.user || resp.data;
        setUsers(prev => prev.map(u => u._id === editingUserId ? updatedUser : u));
        setEditingUserId(null);
      } else {
        const resp = await apiCall("/api/users/add", { method: "POST", body: JSON.stringify(payload) });
        const newUser = resp.user || resp.data;
        setUsers(prev => [newUser, ...prev]);
      }
      setFormData({ name: "", username: "", password: "", role: "guest", house: "" });
      setCustomPermissions({});
      setActiveTab("manage");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const roleConfig = (role) => {
    const map = {
      admin: { label: "Admin", classes: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border-rose-100 dark:border-rose-500/20" },
      captain: { label: `${groupLabel} Captain`, classes: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20" },
      student_coordinator: { label: "Coordinator", classes: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400 border-violet-100 dark:border-violet-500/20" },
      faculty: { label: "Faculty", classes: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20" },
      guest: { label: "Observer", classes: "bg-slate-50 text-slate-600 dark:bg-white/5 dark:text-slate-400 border-slate-200 dark:border-white/5" },
    };
    return map[role] || map.guest;
  };

  const filteredUsers = users.filter(u => u.role !== 'admin' && (u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.username.toLowerCase().includes(searchQuery.toLowerCase())));

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-100 dark:border-white/5">
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white font-heading">
                    User Management
                </h2>
            </div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-[0.3em] leading-none pl-7">Manage users</p>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/5">
          {["manage", "add"].map(t => (
            <button
              key={t}
              onClick={() => { setActiveTab(t); if(t==='add') setEditingUserId(null); }}
              className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === t ? 'bg-white dark:bg-[#0B1220] text-indigo-600 dark:text-indigo-400 shadow-xl shadow-indigo-500/10' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {t === 'manage' ? 'Directory' : editingUserId ? 'Edit Node' : 'Initialize Node'}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-2xl flex items-center gap-4 text-rose-600 dark:text-rose-400 shadow-soft">
          <Shield className="w-5 h-5 shrink-0" />
          <p className="text-xs font-bold uppercase tracking-widest leading-none">{error}</p>
        </div>
      )}

      {activeTab === "manage" ? (
        <FadeIn className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
             <div className="relative group w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Identify personnel via name or key..." 
                    className="w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400"
                />
             </div>
            <div className="text-xs font-black text-slate-400 underline decoration-indigo-500/20 underline-offset-8 decoration-2">{filteredUsers.length} USERS</div>
          </div>

          <div className="card-premium overflow-hidden border-slate-200 dark:border-white/5 bg-white dark:bg-[#111827]">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/10 uppercase tracking-[0.2em] text-[9px] font-black text-slate-500">
                    <th className="p-6">Name</th>
                    <th className="p-6">Role</th>
                    <th className="p-6">{groupLabel}</th>
                    <th className="p-6">Created</th>
                    <th className="p-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                  {filteredUsers.map(user => {
                    const cfg = roleConfig(user.role);
                    return (
                      <tr key={user._id} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-all">
                        <td className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 shrink-0 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black group-hover:scale-110 transition-transform">
                                    {user.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">@{user.username}</p>
                                </div>
                            </div>
                        </td>
                        <td className="p-6">
                            <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border ${cfg.classes}`}>
                                {cfg.label}
                            </span>
                        </td>
                        <td className="p-6">
                            <div className="flex items-center gap-2">
                                <House className="w-3.5 h-3.5 text-slate-300" />
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 capitalize">{user.house?.name || "Global"}</span>
                            </div>
                        </td>
                        <td className="p-6">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-slate-300" />
                                <span className="text-xs font-bold text-slate-500">{new Date(user.createdAt || user.created_at).toLocaleDateString()}</span>
                            </div>
                        </td>
                        <td className="p-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                                <button 
                                    onClick={() => { 
                                      setFormData({ 
                                        name: user.name, 
                                        username: user.username || user.email, 
                                        password: "", 
                                        role: user.role, 
                                        house: user.house?._id || "" 
                                      }); 
                                      setCustomPermissions(user.custom_permissions || {});
                                      setEditingUserId(user._id); 
                                      setActiveTab("add"); 
                                    }}
                                    className="p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 dark:bg-white/5 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-400 transition-all active:scale-95 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-500/30"
                                pug>
                                    <Edit3 className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => { if(window.confirm('Terminate Node Presence?')) apiCall(`/api/users/${user._id}`, { method: 'DELETE' }).then(fetchUsers); }}
                                    className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 dark:bg-white/5 dark:hover:bg-rose-500/20 dark:hover:text-rose-400 transition-all active:scale-95 border border-transparent hover:border-rose-100 dark:hover:border-rose-500/30"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
                {loading && <div className="p-20 text-center text-[10px] font-black uppercase tracking-widest text-slate-300 animate-pulse">Loading users...</div>}
                {!loading && filteredUsers.length === 0 && <div className="p-20 text-center space-y-4">
                  <Filter className="w-10 h-10 text-slate-200 dark:text-white/5 mx-auto" />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">No users found</p>
              </div>}
            </div>
          </div>
        </FadeIn>
      ) : (
        <FadeIn className="max-w-2xl mx-auto">
          <div className="card-premium p-10 bg-white dark:bg-[#111827] space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 p opacity-5">
                <UserPlus className="w-32 h-32 text-indigo-500" />
            </div>
            
            <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{editingUserId ? 'Edit User' : 'Add User'}</h3>
                <p className="text-sm font-medium text-slate-500">Enter the user details below.</p>
            </div>

            <form onSubmit={handleAddOrEditUser} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Name</label>
                        <input 
                            required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                            placeholder="Full name"
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-900 dark:text-white transition-all focus:ring-2 focus:ring-indigo-500/20"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email (Node Key)</label>
                        <input 
                            required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})}
                            placeholder="Email address"
                            type="email"
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-900 dark:text-white transition-all focus:ring-2 focus:ring-indigo-500/20"
                        />
                    </div>
                </div>

                {!editingUserId && (
                   <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Password</label>
                        <input 
                            required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                            placeholder="Password"
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-900 dark:text-white transition-all focus:ring-2 focus:ring-indigo-500/20"
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Role</label>
                        <select 
                            value={formData.role} onChange={e => setFormData({...formData, role: e.target.value, house: ['captain', 'student_coordinator'].includes(e.target.value) ? formData.house : ""})}
                            className="w-full appearance-none bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-900 dark:text-white transition-all focus:ring-2 focus:ring-indigo-500/20"
                        >
                            {roles.map(r => {
                                let label = r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                                if (r === 'captain') label = `${groupLabel} Captain`;
                                return <option key={r} value={r} className="bg-white dark:bg-[#0B1220]">{label}</option>;
                            })}
                        </select>
                    </div>

                    {["captain", "student_coordinator"].includes(formData.role) && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{groupLabel}</label>
                            <select 
                                required value={formData.house} onChange={e => setFormData({...formData, house: e.target.value})}
                                className="w-full appearance-none bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-900 dark:text-white transition-all focus:ring-2 focus:ring-indigo-500/20"
                            >
                                <option value="" className="bg-white dark:bg-[#0B1220]">Select {groupLabel.toLowerCase()}...</option>
                                {houses.map(h => <option key={h._id} value={h._id} className="bg-white dark:bg-[#0B1220]">{h.name} ({h.code})</option>)}
                            </select>
                        </div>
                    )}
                </div>

                {/* Custom Permissions Section */}
                <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-white/5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Custom Overrides (Policy Node)</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(availablePermissions[mapToBackendRole(formData.role)] || {}).map(perm => {
                      const isChecked = customPermissions[perm] !== undefined 
                        ? customPermissions[perm] 
                        : (availablePermissions[mapToBackendRole(formData.role)] || {})[perm];
                        
                      return (
                        <label key={perm} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                          <input 
                            type="checkbox" 
                            checked={!!isChecked}
                            onChange={(e) => setCustomPermissions({...customPermissions, [perm]: e.target.checked})}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 capitalize">{perm.replace(/_/g, ' ')}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-8 flex gap-4">
                    <button 
                        type="button" 
                        onClick={() => setActiveTab("manage")}
                        className="flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border border-slate-200 dark:border-white/5 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                    >
                        {loading ? "Saving..." : editingUserId ? "Update user" : "Add user"}
                    </button>
                </div>
            </form>
          </div>
        </FadeIn>
      )}
    </div>
  );
};

export default ManageUser;
