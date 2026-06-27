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
  Loader2,
  Star,
  Mail,
  GraduationCap,
  X
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
    captain_contact: "",
    captain_participant_id: ""
  });
  
  const [participants, setParticipants] = useState([]);
  const [captainParticipant, setCaptainParticipant] = useState(null);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantSearch, setParticipantSearch] = useState("");
  const [showParticipantPicker, setShowParticipantPicker] = useState(false);
  
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

  useEffect(() => {
    if (editingGroupId) {
      fetchGroupParticipants(editingGroupId);
    } else {
      setParticipants([]);
      setCaptainParticipant(null);
      setParticipantSearch("");
      setShowParticipantPicker(false);
    }
  }, [editingGroupId]);

  const fetchGroupParticipants = async (groupId) => {
    if (!competition?._id) return;
    try {
      setParticipantsLoading(true);
      const data = await apiCall(`/api/competition/${competition._id}/groups/${groupId}/participants`);
      const list = Array.isArray(data) ? data : [];
      setParticipants(list);

      // Match current captain (User) to a participant by email
      const currentGroup = groups.find(g => g._id === groupId);
      const captainUser = currentGroup?.captain;
      if (captainUser?.email) {
        const match = list.find(p => p.email?.toLowerCase() === captainUser.email.toLowerCase());
        if (match) {
          setCaptainParticipant(match);
          setFormData(prev => ({
            ...prev,
            captain_name: match.name,
            captain_contact: match.phone || "",
            captain_participant_id: match._id
          }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch participants:", err);
    } finally {
      setParticipantsLoading(false);
    }
  };

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
        await apiCall(`/api/competition/${competition._id}/groups/${editingGroupId}`, { 
          method: "PUT", 
          body: JSON.stringify(payload) 
        });

        // Assign captain from participants if selected
        if (formData.captain_participant_id) {
          await apiCall(`/api/competition/${competition._id}/groups/${editingGroupId}/captain`, {
            method: "PUT",
            body: JSON.stringify({ participant_id: formData.captain_participant_id })
          });
        } else if (formData.captain_participant_id === "" && captainParticipant === null) {
          // Explicitly remove captain
          await apiCall(`/api/competition/${competition._id}/groups/${editingGroupId}/captain`, {
            method: "PUT",
            body: JSON.stringify({ participant_id: null })
          });
        }

        await fetchGroups();
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
    setFormData({ name: "", captain_name: "", captain_contact: "", captain_participant_id: "" });
    setLogoUrl(""); 
    setLogoPublicId("");
    setEditingGroupId(null);
    setCaptainParticipant(null);
    setParticipants([]);
    setParticipantSearch("");
    setShowParticipantPicker(false);
    setError("");
  };

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (g.captain?.name && g.captain.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
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
        
        <div className="flex p-1 rounded-2xl border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)' }}>
          {["manage", "add"].map(t => (
            <button
              key={t}
              onClick={() => { setActiveTab(t); if(t==='add') resetForm(); }}
              className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                activeTab === t 
                  ? 'text-indigo-600 dark:text-indigo-400 shadow-xl' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              style={activeTab === t ? { backgroundColor: 'var(--card)' } : {}}
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
                className="w-full border rounded-2xl pl-12 pr-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
                style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
              />
            </div>
            <div className="text-xs font-black text-slate-400 underline decoration-indigo-500/20 underline-offset-8 decoration-2">
              {filteredGroups.length} {groupLabelPlural.toUpperCase()} ACTIVE
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group, idx) => (
              <FadeIn key={group._id} delay={idx * 0.05}>
                <div className="card-premium group overflow-hidden flex flex-col h-full hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-500 hover:-translate-y-1 border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}>
                  <div className="relative h-48 overflow-hidden border-b" style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border-divider)' }}>
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
                      
                       <div className="space-y-1 p-3 rounded-xl border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)' }}>
                         <div className="flex items-center gap-2">
                           {group.captain?.profile_image ? (
                             <img src={group.captain.profile_image} alt="" className="w-5 h-5 rounded-full object-cover" />
                           ) : (
                             <User className="w-3.5 h-3.5 text-indigo-500" />
                           )}
                           <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                             {group.captain?.name || group.captain_name || "No Command Assigned"}
                           </p>
                         </div>
                         {(group.captain?.phone || group.captain_contact) && (
                           <div className="flex items-center gap-2">
                             <Phone className="w-3.5 h-3.5 text-slate-400" />
                             <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                               {group.captain?.phone || group.captain_contact}
                             </p>
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
                              captain_name: group.captain?.name || group.captain_name || "", 
                              captain_contact: group.captain?.phone || group.captain_contact || "",
                              captain_participant_id: ""
                            }); 
                            setCaptainParticipant(null);
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
          <div className="card-premium p-10 grid grid-cols-1 lg:grid-cols-12 gap-12 relative overflow-hidden" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}>
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
                    : "hover:border-indigo-500/50 hover:bg-indigo-500/[0.02]"
                  }`}
                style={!isDragOver ? { backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)' } : {}}
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
                    <div className="w-16 h-16 rounded-2xl shadow-xl flex items-center justify-center mx-auto transition-transform group-hover:scale-110" style={{ backgroundColor: 'var(--card)' }}>
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
                    className="w-full border rounded-2xl px-6 py-4 text-sm font-bold transition-all focus:ring-2 focus:ring-indigo-500/20 outline-none shadow-sm"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Star className="w-3 h-3 text-amber-500" /> Captain Assignment
                  </label>

                  {editingGroupId ? (
                    <div className="space-y-3">
                      {/* Current captain display */}
                      {captainParticipant ? (
                        <div className="flex items-center justify-between p-4 rounded-2xl border bg-amber-50/50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                              <Star className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-amber-800 dark:text-amber-200 truncate">{captainParticipant.name}</p>
                              <div className="flex items-center gap-2 text-[11px] font-medium text-amber-600/70 dark:text-amber-400/70">
                                <span>{captainParticipant.class}</span>
                                {captainParticipant.email && <><span>·</span><span className="truncate">{captainParticipant.email}</span></>}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setCaptainParticipant(null);
                              setFormData(prev => ({ ...prev, captain_name: "", captain_contact: "", captain_participant_id: "" }));
                            }}
                            className="p-1.5 rounded-lg hover:bg-amber-200/50 dark:hover:bg-amber-500/10 transition-colors shrink-0"
                          >
                            <X className="w-4 h-4 text-amber-500" />
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl border border-dashed text-center" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)' }}>
                          <p className="text-xs font-semibold text-slate-400">No captain assigned</p>
                        </div>
                      )}

                      {/* Participant picker toggle */}
                      <button
                        type="button"
                        onClick={() => setShowParticipantPicker(!showParticipantPicker)}
                        className="w-full py-3 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all cursor-pointer"
                        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--accent)' }}
                      >
                        {showParticipantPicker ? "Cancel Selection" : captainParticipant ? "Change Captain" : "Assign Captain from Participants"}
                      </button>

                      {/* Participant picker dropdown */}
                      {showParticipantPicker && (
                        <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-divider)' }}>
                          <div className="p-3 border-b" style={{ borderColor: 'var(--border-divider)' }}>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                              <input
                                value={participantSearch}
                                onChange={e => setParticipantSearch(e.target.value)}
                                placeholder="Search participants..."
                                className="w-full border rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                              />
                            </div>
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                            {participantsLoading ? (
                              <div className="p-6 text-center">
                                <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Loading...</p>
                              </div>
                            ) : participants.length === 0 ? (
                              <div className="p-6 text-center">
                                <Users className="w-6 h-6 text-slate-200 dark:text-white/5 mx-auto mb-2" />
                                <p className="text-xs font-semibold text-slate-400">No participants in this {groupLabel.toLowerCase()}</p>
                                <p className="text-[10px] text-slate-400 mt-1">Add participants first via Manage Participants</p>
                              </div>
                            ) : (
                              participants
                                .filter(p => 
                                  !participantSearch || 
                                  p.name.toLowerCase().includes(participantSearch.toLowerCase()) ||
                                  p.class.toLowerCase().includes(participantSearch.toLowerCase()) ||
                                  (p.email && p.email.toLowerCase().includes(participantSearch.toLowerCase()))
                                )
                                .map(p => (
                                  <button
                                    key={p._id}
                                    type="button"
                                    onClick={() => {
                                      setCaptainParticipant(p);
                                      setFormData(prev => ({
                                        ...prev,
                                        captain_name: p.name,
                                        captain_contact: p.phone || "",
                                        captain_participant_id: p._id
                                      }));
                                      setShowParticipantPicker(false);
                                      setParticipantSearch("");
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-indigo-500/5 border-b last:border-0 cursor-pointer ${
                                      captainParticipant?._id === p._id ? 'bg-indigo-500/10' : ''
                                    }`}
                                    style={{ borderColor: 'var(--border-divider)' }}
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                                      <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--card-fg)' }}>{p.name}</p>
                                      <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
                                        <GraduationCap className="w-3 h-3" />
                                        <span>{p.class}</span>
                                        {p.email && <><span>·</span><Mail className="w-3 h-3" /><span className="truncate">{p.email}</span></>}
                                      </div>
                                    </div>
                                    {captainParticipant?._id === p._id && (
                                      <Star className="w-4 h-4 text-amber-500 shrink-0" />
                                    )}
                                  </button>
                                ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <input 
                          value={formData.captain_name} 
                          onChange={e => setFormData({...formData, captain_name: e.target.value})}
                          placeholder="Captain name"
                          className="w-full border rounded-2xl px-6 py-4 text-sm font-bold transition-all focus:ring-2 focus:ring-indigo-500/20 outline-none shadow-sm"
                          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                        />
                      </div>
                      <div>
                        <input 
                          value={formData.captain_contact} 
                          onChange={e => setFormData({...formData, captain_contact: e.target.value})}
                          placeholder="Captain contact"
                          className="w-full border rounded-2xl px-6 py-4 text-sm font-bold transition-all focus:ring-2 focus:ring-indigo-500/20 outline-none shadow-sm"
                          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
                        />
                      </div>
                    </div>
                  )}
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
