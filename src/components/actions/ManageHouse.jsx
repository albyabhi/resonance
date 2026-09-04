import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../AuthContext";
import { useCompetition } from "../../context/CompetitionContext";
import { apiJson, apiFetch } from "../../utils/apiClient";
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
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "../ui/alert-dialog";

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

  const apiCall = useCallback(async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: { 
        "Content-Type": "application/json", 
        ...(options.headers || {}) 
      }
    });
  }, [token]);

  const fetchGroups = useCallback(async () => {
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
  }, [competition, apiCall]);

  useEffect(() => { 
    if (token && competition?._id) {
      fetchGroups(); 
    }
  }, [token, competition?._id, fetchGroups]);

  const fetchGroupParticipants = useCallback(async (groupId) => {
    if (!competition?._id) return;
    try {
      setParticipantsLoading(true);
      const data = await apiCall(`/api/competition/${competition._id}/groups/${groupId}/participants`);
      const list = Array.isArray(data) ? data : [];
      setParticipants(list);

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
  }, [competition, apiCall, groups]);

  useEffect(() => {
    if (editingGroupId) {
      fetchGroupParticipants(editingGroupId);
    } else {
      setParticipants([]);
      setCaptainParticipant(null);
      setParticipantSearch("");
      setShowParticipantPicker(false);
    }
  }, [editingGroupId, fetchGroupParticipants]);

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

      const response = await apiFetch(`${API_BASE_URL}/api/competition/upload`, {
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

        if (formData.captain_participant_id) {
          await apiCall(`/api/competition/${competition._id}/groups/${editingGroupId}/captain`, {
            method: "PUT",
            body: JSON.stringify({ participant_id: formData.captain_participant_id })
          });
        } else if (formData.captain_participant_id === "" && captainParticipant === null) {
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
    <div onPaste={handlePaste} className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              {groupLabelPlural} Registry
            </h2>
          </div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.3em] leading-none pl-7">
            {groupLabel} Management & Active Assets
          </p>
        </div>
        
        <div className="flex p-1 rounded-2xl border bg-muted border-border">
          {["manage", "add"].map(t => (
            <Button
              key={t}
              variant={activeTab === t ? "default" : "ghost"}
              onClick={() => { setActiveTab(t); if(t==='add') resetForm(); }}
              className="px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl"
            >
              {t === 'manage' ? 'Directory' : editingGroupId ? `Edit ${groupLabel}` : `Initialize ${groupLabel}`}
            </Button>
          ))}
        </div>
      </header>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-center gap-4 text-destructive">
          <Shield className="w-5 h-5 shrink-0" />
          <p className="text-xs font-bold uppercase tracking-widest leading-none">{error}</p>
        </div>
      )}

      {activeTab === "manage" ? (
        <FadeIn className="space-y-10">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Locate ${groupLabel.toLowerCase()} node...`} 
                className="pl-12 py-3.5 rounded-2xl"
              />
            </div>
            <Badge variant="outline" className="text-xs font-black">
              {filteredGroups.length} {groupLabelPlural.toUpperCase()} ACTIVE
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group, idx) => (
              <FadeIn key={group._id} delay={idx * 0.05}>
                <Card className="overflow-hidden flex flex-col h-full hover:shadow-lg transition-all duration-500 hover:-translate-y-1">
                  <div className="relative h-48 bg-muted border-b border-border overflow-hidden">
                    {group.logoUrl ? (
                      <img src={group.logoUrl} alt={group.name} className="w-full h-full object-contain p-8 transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center space-y-3 opacity-20">
                        <Camera className="w-12 h-12 text-muted-foreground" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Asset Missing</p>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-xl">{group.name}</CardTitle>
                      
                      <div className="space-y-1 p-3 rounded-xl bg-muted border border-border">
                        <div className="flex items-center gap-2">
                          {group.captain?.profile_image ? (
                            <img src={group.captain.profile_image} alt="" className="w-5 h-5 rounded-full object-cover" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-primary" />
                          )}
                          <p className="text-xs font-semibold text-muted-foreground">
                            {group.captain?.name || group.captain_name || "No Command Assigned"}
                          </p>
                        </div>
                        {(group.captain?.phone || group.captain_contact) && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                            <p className="text-[11px] font-medium text-muted-foreground">
                              {group.captain?.phone || group.captain_contact}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <Badge variant="secondary">{group.total_score || 0} PTS</Badge>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
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
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Decommission {groupLabel} Infrastructure</AlertDialogTitle>
                              <AlertDialogDescription>This will remove the team standings node.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteGroup(group._id)}>Decommission</AlertDialogAction>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            ))}
          </div>
          {loading && <div className="p-20 text-center text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">Syncing Registry...</div>}
        </FadeIn>
      ) : (
        <FadeIn className="max-w-4xl mx-auto">
          <Card className="p-10 grid grid-cols-1 lg:grid-cols-12 gap-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
              <PlusCircle className="w-48 h-48 text-primary" />
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-foreground">Visual Asset</h3>
                <p className="text-sm font-medium text-muted-foreground">Official {groupLabel.toLowerCase()} identification logo.</p>
              </div>

              <div 
                onClick={() => !uploading && fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative cursor-pointer aspect-square rounded-3xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all duration-300
                  ${isDragOver 
                    ? "border-primary bg-primary/10" 
                    : "bg-muted border-border hover:border-primary/50 hover:bg-primary/[0.02]"
                  }`}
              >
                {uploading ? (
                  <div className="text-center p-6 space-y-4">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Uploading Asset...</p>
                  </div>
                ) : logoUrl ? (
                  <div className="relative w-full h-full p-4 flex items-center justify-center">
                    <img src={logoUrl} className="w-full h-full object-contain p-6 transition-transform group-hover:scale-105" alt="Logo Preview" />
                    <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl">
                      <Camera className="w-8 h-8 text-background" />
                      <span className="absolute bottom-6 text-[10px] font-black uppercase tracking-widest text-background/80">Change Asset</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 space-y-4">
                    <div className="w-16 h-16 rounded-2xl shadow-xl flex items-center justify-center mx-auto transition-transform group-hover:scale-110 bg-card">
                      <Upload className="w-6 h-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Upload Visual</p>
                      <p className="text-[9px] font-medium text-muted-foreground max-w-[150px] mx-auto leading-normal">
                        Browse, Drag & Drop, or paste screenshot directly here (Max 2MB)
                      </p>
                    </div>
                  </div>
                )}
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={onLogoFileChange} />
              </div>

              {logoUrl && (
                <Button
                  variant="ghost"
                  onClick={() => { setLogoUrl(""); setLogoPublicId(""); }}
                  className="w-full text-[10px] font-black uppercase tracking-widest text-destructive hover:text-destructive bg-destructive/5 hover:bg-destructive/10 rounded-xl"
                >
                  Clear Image Asset
                </Button>
              )}
            </div>

            <div className="lg:col-span-8 flex flex-col justify-center">
              <form onSubmit={handleAddOrEditGroup} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Shield className="w-3 h-3 text-primary" /> Designation Name
                  </Label>
                  <Input 
                    required 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder={`e.g. ${groupLabel === "Department" ? "Computer Science & Engineering" : "Phoenix Prime"}`}
                    className="rounded-2xl px-6 py-4 text-sm font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Star className="w-3 h-3 text-accent-amber" /> Captain Assignment
                  </Label>

                  {editingGroupId ? (
                    <div className="space-y-3">
                      {captainParticipant ? (
                        <div className="flex items-center justify-between p-4 rounded-2xl border bg-accent-amber/5 border-accent-amber/20">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-accent-amber/10 flex items-center justify-center shrink-0">
                              <Star className="w-5 h-5 text-accent-amber" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-accent-amber truncate">{captainParticipant.name}</p>
                              <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                                <span>{captainParticipant.class}</span>
                                {captainParticipant.email && <><span>·</span><span className="truncate">{captainParticipant.email}</span></>}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setCaptainParticipant(null);
                              setFormData(prev => ({ ...prev, captain_name: "", captain_contact: "", captain_participant_id: "" }));
                            }}
                          >
                            <X className="w-4 h-4 text-accent-amber" />
                          </Button>
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl border border-dashed bg-muted border-border text-center">
                          <p className="text-xs font-semibold text-muted-foreground">No captain assigned</p>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        onClick={() => setShowParticipantPicker(!showParticipantPicker)}
                        className="w-full py-3 text-[10px] font-black uppercase tracking-widest rounded-xl"
                      >
                        {showParticipantPicker ? "Cancel Selection" : captainParticipant ? "Change Captain" : "Assign Captain from Participants"}
                      </Button>

                      {showParticipantPicker && (
                        <div className="rounded-2xl border border-border overflow-hidden bg-card">
                          <div className="p-3 border-b border-border">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                              <Input
                                value={participantSearch}
                                onChange={e => setParticipantSearch(e.target.value)}
                                placeholder="Search participants..."
                                className="pl-9 py-2 rounded-xl"
                              />
                            </div>
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                            {participantsLoading ? null : participants.length === 0 ? (
                              <div className="p-6 text-center">
                                <Users className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                                <p className="text-xs font-semibold text-muted-foreground">No participants in this {groupLabel.toLowerCase()}</p>
                                <p className="text-[10px] text-muted-foreground mt-1">Add participants first via Manage Participants</p>
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
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-primary/5 border-b last:border-0 border-border cursor-pointer ${
                                      captainParticipant?._id === p._id ? 'bg-primary/10' : ''
                                    }`}
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                      <User className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-semibold truncate text-card-foreground">{p.name}</p>
                                      <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                                        <GraduationCap className="w-3 h-3" />
                                        <span>{p.class}</span>
                                        {p.email && <><span>·</span><Mail className="w-3 h-3" /><span className="truncate">{p.email}</span></>}
                                      </div>
                                    </div>
                                    {captainParticipant?._id === p._id && (
                                      <Star className="w-4 h-4 text-accent-amber shrink-0" />
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
                      <Input 
                        value={formData.captain_name} 
                        onChange={e => setFormData({...formData, captain_name: e.target.value})}
                        placeholder="Captain name"
                        className="rounded-2xl px-6 py-4 text-sm font-bold"
                      />
                      <Input 
                        value={formData.captain_contact} 
                        onChange={e => setFormData({...formData, captain_contact: e.target.value})}
                        placeholder="Captain contact"
                        className="rounded-2xl px-6 py-4 text-sm font-bold"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-4 space-y-3">
                  <Button 
                    type="submit" 
                    disabled={loading || uploading}
                    className="w-full py-5 text-[11px] font-black uppercase tracking-[0.3em] rounded-2xl"
                  >
                    {loading ? "Writing Strategy..." : editingGroupId ? `Update ${groupLabel} Node` : `Initialize ${groupLabel} System`}
                  </Button>

                  <Button 
                    variant="ghost"
                    onClick={() => setActiveTab("manage")}
                    className="w-full py-4 text-[10px] font-black uppercase tracking-widest"
                  >
                    Abort Operation
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </FadeIn>
      )}
    </div>
  );
};

export default ManageHouse;
