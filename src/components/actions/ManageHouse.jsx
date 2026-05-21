// src/components/actions/ManageHouse.jsx
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../AuthContext";
import { useCompetition } from "../../context/CompetitionContext";
import { apiJson } from "../../utils/apiClient";
import { FadeIn } from "../AnimateReveal";
import { 
  Users, 
  PlusCircle, 
  Search, 
  Edit3, 
  Trash2, 
  Shield, 
  Upload, 
  Camera, 
  User, 
  Phone, 
  Loader2 
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const ManageHouse = () => {
  const { token } = useAuth();
  const { competition, groupLabel = "Group", groupLabelPlural = "Groups" } = useCompetition();

  const [activeTab, setActiveTab] = useState("manage");
  const [groups, setGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [formData, setFormData] = useState({ 
    name: "", 
    captain_name: "", 
    captain_contact: "" 
  });
  
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPublicId, setLogoPublicId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const [editingGroupId, setEditingGroupId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const apiCall = async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: { 
        "Content-Type": "application/json", 
        ...(options.headers || {}) 
      }
    });
  };

  const fetchGroups = async () => {
    if (!competition?._id) return;
    try { 
      setLoading(true); 
      const data = await apiCall(`/api/competition/${competition._id}/groups`);
      setGroups(data || []); 
    }
    catch (err) { 
      setError(err.message); 
    }
    finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    if (token && competition?._id) {
      fetchGroups(); 
    }
  }, [token, competition?._id]);

  // Handle Logo Uploading via separate endpoint
  const uploadLogoFile = async (file) => {
    if (!file) return;
    if (!/image\/(png|jpe?g|webp|svg\+xml)/i.test(file.type)) {
      setError("Only PNG, JPEG, SVG, or WEBP images are allowed.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Logo size exceeds 2MB limit.");
      return;
    }

    try {
      setUploading(true);
      setError("");
      
      const uploadFd = new FormData();
      uploadFd.append("image", file);

      // Using the secure upload endpoint we just created
      const response = await fetch(`${API_BASE_URL}/api/competition/upload`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: uploadFd
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to upload image");
      }

      setLogoUrl(data.secure_url);
      setLogoPublicId(data.public_id);
    } catch (err) {
      setError(err.message || "Failed to upload logo image");
    } finally {
      setUploading(false);
    }
  };

  const onLogoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadLogoFile(file);
  };

  // Drag and Drop Logo Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) uploadLogoFile(file);
  };

  // Clipboard Paste Handler
  const handlePaste = (e) => {
    const item = e.clipboardData?.items?.[0];
    if (item && item.type.indexOf("image") !== -1) {
      const file = item.getAsFile();
      if (file) uploadLogoFile(file);
    }
  };

  const handleAddOrEditGroup = async (e) => {
    e.preventDefault();
    if (!competition?._id) return;
    try {
      setLoading(true);
      
      const payload = {
        name: formData.name,
        logoUrl: logoUrl || null,
        logoPublicId: logoPublicId || null,
        captain_name: formData.captain_name || null,
        captain_contact: formData.captain_contact || null
      };

      if (editingGroupId) {
        const updated = await apiCall(`/api/competition/${competition._id}/groups/${editingGroupId}`, { 
          method: "PUT", 
          body: JSON.stringify(payload) 
        });
        setGroups(groups.map(g => g._id === editingGroupId ? updated : g));
      } else {
        const created = await apiCall(`/api/competition/${competition._id}/groups`, { 
          method: "POST", 
          body: JSON.stringify(payload) 
        });
        setGroups([created, ...groups]);
      }
      resetForm();
      setActiveTab("manage");
    } catch (err) { 
      setError(err.message); 
    }
    finally { 
      setLoading(false); 
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm(`Decommission ${groupLabel} Infrastructure? This will remove the team standings node.`)) return;
    try {
      setLoading(true);
      await apiCall(`/api/competition/${competition._id}/groups/${groupId}`, { method: "DELETE" });
      setGroups(groups.filter(g => g._id !== groupId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", captain_name: "", captain_contact: "" });
    setLogoUrl(""); 
    setLogoPublicId("");
    setEditingGroupId(null);
    setError("");
  };

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (g.captain_name && g.captain_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div onPaste={handlePaste} className="space-y-10 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-100 dark:border-white/5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white font-heading">
              {groupLabelPlural} Registry
            </h2>
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-[0.3em] leading-none pl-7">
            {groupLabel} Management & Active Assets
          </p>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/5">
          {["manage", "add"].map(t => (
            <button
              key={t}
              onClick={() => { setActiveTab(t); if(t==='add') resetForm(); }}
              className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                activeTab === t 
                  ? 'bg-white dark:bg-[#0B1220] text-indigo-600 dark:text-indigo-400 shadow-xl shadow-indigo-500/10' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {t === 'manage' ? 'Directory' : editingGroupId ? `Edit ${groupLabel}` : `Initialize ${groupLabel}`}
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
        <FadeIn className="space-y-10">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative group w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Locate ${groupLabel.toLowerCase()} node...`} 
                className="w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
              />
            </div>
            <div className="text-xs font-black text-slate-400 underline decoration-indigo-500/20 underline-offset-8 decoration-2">
              {filteredGroups.length} {groupLabelPlural.toUpperCase()} ACTIVE
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group, idx) => (
              <FadeIn key={group._id} delay={idx * 0.05}>
                <div className="card-premium group bg-white dark:bg-[#111827] overflow-hidden flex flex-col h-full hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-500 hover:-translate-y-1 border-slate-200 dark:border-white/5">
                  <div className="relative h-48 bg-slate-50 dark:bg-white/5 overflow-hidden border-b border-slate-100 dark:border-white/5">
                    {group.logoUrl ? (
                      <img src={group.logoUrl} alt={group.name} className="w-full h-full object-contain p-8 transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center space-y-3 opacity-20">
                        <Camera className="w-12 h-12 text-slate-400" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Asset Missing</p>
                      </div>
                    )}
                  </div>

                  <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{group.name}</h3>
                      
                      <div className="space-y-1 bg-slate-50 dark:bg-white/[0.02] p-3 rounded-xl border border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-indigo-500" />
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {group.captain_name || "No Command Assigned"}
                          </p>
                        </div>
                        {group.captain_contact && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{group.captain_contact}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-white/5">
                      <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg">
                        {group.total_score || 0} PTS
                      </span>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => { 
                            setFormData({ 
                              name: group.name, 
                              captain_name: group.captain_name || "", 
                              captain_contact: group.captain_contact || "" 
                            }); 
                            setEditingGroupId(group._id); 
                            setLogoUrl(group.logoUrl || ""); 
                            setLogoPublicId(group.logoPublicId || "");
                            setActiveTab("add"); 
                          }}
                          className="p-2 rounded-xl bg-slate-50 hover:bg-white text-slate-400 hover:text-indigo-600 dark:bg-white/5 dark:hover:bg-white/10 dark:hover:text-indigo-400 border border-slate-200/50 dark:border-white/10 transition-all shadow-sm active:scale-95 cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteGroup(group._id)}
                          className="p-2 rounded-xl bg-slate-50 hover:bg-white text-slate-400 hover:text-rose-600 dark:bg-white/5 dark:hover:bg-white/10 dark:hover:text-rose-400 border border-slate-200/50 dark:border-white/10 transition-all shadow-sm active:scale-95 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
          {loading && <div className="p-20 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 animate-pulse">Syncing Registry...</div>}
        </FadeIn>
      ) : (
        <FadeIn className="max-w-4xl mx-auto">
          <div className="card-premium p-10 bg-white dark:bg-[#111827] grid grid-cols-1 lg:grid-cols-12 gap-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
              <PlusCircle className="w-48 h-48 text-indigo-500" />
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Visual Asset</h3>
                <p className="text-sm font-medium text-slate-500">Official {groupLabel.toLowerCase()} identification logo.</p>
              </div>

              <div 
                onClick={() => !uploading && fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`group relative cursor-pointer aspect-square rounded-3xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all duration-300
                  ${isDragOver 
                    ? "border-indigo-500 bg-indigo-500/10 scale-102 shadow-lg shadow-indigo-500/5" 
                    : "border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/[0.02]"
                  }`}
              >
                {uploading ? (
                  <div className="text-center p-6 space-y-4">
                    <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Uploading Asset...</p>
                  </div>
                ) : logoUrl ? (
                  <div className="relative w-full h-full p-4 flex items-center justify-center">
                    <img src={logoUrl} className="w-full h-full object-contain p-6 transition-transform group-hover:scale-105" alt="Logo Preview" />
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl">
                      <Camera className="w-8 h-8 text-white" />
                      <span className="absolute bottom-6 text-[10px] font-black uppercase tracking-widest text-white/80">Change Asset</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 shadow-xl flex items-center justify-center mx-auto transition-transform group-hover:scale-110">
                      <Upload className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Upload Visual</p>
                      <p className="text-[9px] font-medium text-slate-400 max-w-[150px] mx-auto leading-normal">
                        Browse, Drag & Drop, or paste screenshot directly here (Max 2MB)
                      </p>
                    </div>
                  </div>
                )}
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={onLogoFileChange} />
              </div>

              {logoUrl && (
                <button
                  type="button"
                  onClick={() => { setLogoUrl(""); setLogoPublicId(""); }}
                  className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 bg-rose-500/5 hover:bg-rose-500/10 rounded-xl transition-all active:scale-[0.98]"
                >
                  Clear Image Asset
                </button>
              )}
            </div>

            <div className="lg:col-span-8 flex flex-col justify-center">
              <form onSubmit={handleAddOrEditGroup} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Shield className="w-3 h-3 text-indigo-500" /> Designation Name
                  </label>
                  <input 
                    required 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder={`e.g. ${groupLabel === "Department" ? "Computer Science & Engineering" : "Phoenix Prime"}`}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 dark:text-white transition-all focus:ring-2 focus:ring-indigo-500/20 outline-none shadow-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <User className="w-3 h-3 text-indigo-500" /> Captain Name (Optional)
                    </label>
                    <input 
                      value={formData.captain_name} 
                      onChange={e => setFormData({...formData, captain_name: e.target.value})}
                      placeholder="e.g. Alan Turing"
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 dark:text-white transition-all focus:ring-2 focus:ring-indigo-500/20 outline-none shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <Phone className="w-3 h-3 text-indigo-500" /> Captain Contact (Optional)
                    </label>
                    <input 
                      value={formData.captain_contact} 
                      onChange={e => setFormData({...formData, captain_contact: e.target.value})}
                      placeholder="e.g. +91 9876543210"
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 dark:text-white transition-all focus:ring-2 focus:ring-indigo-500/20 outline-none shadow-sm"
                    />
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <button 
                    type="submit" 
                    disabled={loading || uploading}
                    className="w-full py-5 text-[11px] font-black uppercase tracking-[0.3em] text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 shadow-2xl shadow-indigo-500/20 transition-all hover:-translate-y-1 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? "Writing Strategy..." : editingGroupId ? `Update ${groupLabel} Node` : `Initialize ${groupLabel} System`}
                  </button>

                  <button 
                    type="button" 
                    onClick={() => setActiveTab("manage")}
                    className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-slate-600 transition-all cursor-pointer"
                  >
                    Abort Operation
                  </button>
                </div>
              </form>
            </div>
          </div>
        </FadeIn>
      )}
    </div>
  );
};

export default ManageHouse;
