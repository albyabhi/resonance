import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../AuthContext";
import { useCompetition } from "../../context/CompetitionContext";
import { api, apiFetch, API_ROUTES } from "../../utils/apiClient";
import toast from "react-hot-toast";
import { FadeIn } from "../AnimateReveal";
import { 
  Users, 
  PlusCircle, 
  Plus,
  ArrowLeft,
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
  const { token, login } = useAuth();
  const { competition, competitionId, groupLabel = "Group", groupLabelPlural = "Groups" } = useCompetition();
  const groupLower = groupLabel.toLowerCase();
  const groupsLower = groupLabelPlural.toLowerCase();

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
  const [captainTouched, setCaptainTouched] = useState(false);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantSearch, setParticipantSearch] = useState("");
  const [showParticipantPicker, setShowParticipantPicker] = useState(false);
  
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPublicId, setLogoPublicId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const [editingGroupId, setEditingGroupId] = useState(null);
  const [listLoading, setListLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [needsSwitch, setNeedsSwitch] = useState(false);
  const abortRef = useRef(null);

  // Map coded backend errors to actionable UI states. Returns true when handled.
  const handleGroupError = useCallback((err, context = "save") => {
    const code = err?.payload?.code || err?.code;
    if (code === "COMPETITION_MISMATCH") {
      setNeedsSwitch(true);
      setError(err.message || "This belongs to a different competition. Switch competition to continue.");
      return true;
    }
    if (code === "ORG_MISMATCH") {
      setNeedsSwitch(false);
      setError(err.message || "Session is out of sync. Please log out and back in, then retry.");
      return true;
    }
    if (code === "GROUP_EXISTS" || err?.status === 409) {
      if (context === "save") {
        setFieldError(err.message || `A ${groupLower} with this name already exists.`);
      } else {
        setError(err.message);
      }
      return true;
    }
    setError(err.message);
    return true;
  }, [groupLower]);

  // Group API always goes through apiFetch (localStorage token + transparent
  // refresh). Never gate on React token state — it can lag behind storage
  // after a competition switch or token refresh and falsely block creates.
  const fetchGroups = useCallback(async () => {
    if (!competitionId) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try { 
      setListLoading(true); 
      setError("");
      setNeedsSwitch(false);
      const data = await api.get(API_ROUTES.COMPETITIONS.GROUPS(competitionId));
      if (controller.signal.aborted) return;
      setGroups(Array.isArray(data) ? data : []); 
    }
    catch (err) { 
      if (controller.signal.aborted || err?.name === "AbortError") return;
      handleGroupError(err, "load");
    }
    finally { 
      if (!controller.signal.aborted) setListLoading(false); 
    }
  }, [competitionId, handleGroupError]);

  useEffect(() => { 
    if (token && competitionId) {
      fetchGroups(); 
    }
    return () => abortRef.current?.abort();
  }, [token, competitionId, fetchGroups]);

  const handleSwitchAndRetry = async (retryFn) => {
    try {
      const data = await api.post(API_ROUTES.AUTH.SELECT_COMPETITION, {
        competition_id: competitionId,
      });
      if (data?.access_token && data?.competition) {
        login(data.user, data.access_token, data.refresh_token, data.competition);
        setNeedsSwitch(false);
        setError("");
        toast.success("Competition switched. Retrying…");
        await retryFn();
      }
    } catch (switchErr) {
      toast.error(switchErr.message || "Could not switch competition");
    }
  };

  const fetchGroupParticipants = useCallback(async (groupId) => {
    if (!competitionId) return;
    try {
      setParticipantsLoading(true);
      const data = await api.get(`${API_ROUTES.COMPETITIONS.GROUPS(competitionId)}/${groupId}/participants`);
      const list = Array.isArray(data) ? data : [];
      setParticipants(list);

      const currentGroup = groups.find(g => g._id === groupId);
      const captainUser = currentGroup?.captain;
      if (captainUser?.email) {
        const match = list.find(p => p.email?.toLowerCase() === captainUser.email.toLowerCase());
        if (match) {
          setCaptainParticipant(match);
          setCaptainTouched(false);
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
  }, [competitionId, groups]);

  useEffect(() => {
    if (editingGroupId) {
      fetchGroupParticipants(editingGroupId);
    } else {
      setParticipants([]);
      setCaptainParticipant(null);
      setCaptainTouched(false);
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

      // apiFetch attaches the fresh token from storage automatically
      const response = await apiFetch(`${API_BASE_URL}/api/competition/upload`, {
        method: "POST",
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
    e?.preventDefault?.();
    if (!competitionId) {
      setError("Select a competition first, then add your group.");
      return;
    }
    const trimmedName = String(formData.name || "").trim();
    if (!trimmedName) {
      setFieldError(`Please enter a ${groupLower} name.`);
      return;
    }
    const nameTaken = groups.some(
      (g) => g?._id !== editingGroupId && String(g?.name || "").trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (nameTaken) {
      setFieldError(`A ${groupLower} with this name already exists.`);
      return;
    }
    const doSave = async () => {
      const base = API_ROUTES.COMPETITIONS.GROUPS(competitionId);

      if (editingGroupId) {
        const payload = {
          name: trimmedName,
          logoUrl: logoUrl || null,
          logoPublicId: logoPublicId || null,
          captain_name: String(formData.captain_name || "").trim() || null,
          captain_contact: String(formData.captain_contact || "").trim() || null
        };
        await api.put(`${base}/${editingGroupId}`, payload);

        // Captain linkage is opt-in: only touch PUT .../captain when the user
        // explicitly picked or removed a captain in this edit session.
        // Untouched saves (name/logo only, or failed email recovery) skip it
        // so we never clear a valid captain by accident.
        if (captainTouched && formData.captain_participant_id) {
          await api.put(`${base}/${editingGroupId}/captain`, { participant_id: formData.captain_participant_id });
        } else if (captainTouched && formData.captain_participant_id === null && captainParticipant === null) {
          await api.put(`${base}/${editingGroupId}/captain`, { participant_id: null });
        }

        await fetchGroups();
        toast.success(`${groupLabel} updated.`);
      } else {
        // Create is name + logo only. No captain step here: a new group has
        // no participants yet, so participant search would always be empty
        // (and backend rejects cross-group links). Assign via Edit or
        // Manage Users → Captain Setup after adding participants.
        await api.post(base, {
          name: trimmedName,
          logoUrl: logoUrl || null,
          logoPublicId: logoPublicId || null
        });
        // Refetch so the new group always appears under the active competition,
        // even if the list was filtered or scoped differently before.
        await fetchGroups();
        toast.success(`${groupLabel} created.`);
      }
      resetForm();
      setActiveTab("manage");
    };

    try {
      setSaving(true);
      setFieldError("");
      setError("");
      setNeedsSwitch(false);
      await doSave();
    } catch (err) {
      const code = err?.payload?.code || err?.code;
      if (code === "COMPETITION_MISMATCH") {
        setNeedsSwitch(true);
        setError(err.message);
        toast.error("Competition out of sync — switch and retry.");
      } else {
        handleGroupError(err, "save");
        if ((err?.payload?.code || err?.code) !== "GROUP_EXISTS" && err?.status !== 409) {
          toast.error(err.message || "Could not save. Please try again.");
        }
      }
      // Switch & Retry button re-invokes this handler after switching,
      // so no stashed retry is needed here.
    }
    finally { 
      setSaving(false); 
    }
  };

  const handleDeleteGroup = async (groupId) => {
    try {
      setDeletingId(groupId);
      await api.delete(`${API_ROUTES.COMPETITIONS.GROUPS(competitionId)}/${groupId}`);
      setGroups((prev) => prev.filter(g => g._id !== groupId));
      toast.success(`${groupLabel} deleted.`);
    } catch (err) {
      handleGroupError(err, "delete");
      toast.error(err.message || "Could not delete. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", captain_name: "", captain_contact: "", captain_participant_id: "" });
    setLogoUrl(""); 
    setLogoPublicId("");
    setEditingGroupId(null);
    setCaptainParticipant(null);
    setCaptainTouched(false);
    setParticipants([]);
    setParticipantSearch("");
    setShowParticipantPicker(false);
    setError("");
    setFieldError("");
    setNeedsSwitch(false);
  };

  const filteredGroups = groups.filter(g => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      String(g?.name || "").toLowerCase().includes(q) || 
      (g?.captain?.name && g.captain.name.toLowerCase().includes(q)) ||
      (g?.captain_name && g.captain_name.toLowerCase().includes(q))
    );
  });

  return (
    <div onPaste={handlePaste} className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              {groupLabelPlural}
            </h2>
          </div>
          <p className="text-sm font-medium text-muted-foreground leading-none pl-7">
            Create and manage {groupsLower} for {competition?.name || "this competition"}
          </p>
        </div>
        
        {activeTab === "manage" ? (
          <Button
            onClick={() => { resetForm(); setActiveTab("add"); }}
            className="min-h-[44px] rounded-2xl px-6 text-xs font-black uppercase tracking-widest"
            aria-label={`Add ${groupLower}`}
          >
            <Plus className="w-4 h-4 mr-2" /> Add {groupLabel}
          </Button>
        ) : (
          <Badge variant="outline" className="self-start md:self-auto text-xs font-black px-4 py-2">
            {editingGroupId ? `EDIT ${groupLabel.toUpperCase()}` : `NEW ${groupLabel.toUpperCase()}`}
          </Badge>
        )}
      </header>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-3 text-destructive">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Shield className="w-5 h-5 shrink-0" />
            <p className="text-sm font-semibold leading-snug">{error}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {needsSwitch && (
              <Button
                variant="outline"
                onClick={() => handleSwitchAndRetry(() => handleAddOrEditGroup())}
                className="text-xs font-bold rounded-xl"
              >
                Switch &amp; retry
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => { setError(""); setNeedsSwitch(false); }} aria-label="Dismiss error">
              <X className="w-4 h-4" />
            </Button>
          </div>
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
                placeholder={`Search ${groupsLower} or captains...`} 
                className="pl-12 pr-10 py-3.5 rounded-2xl"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Badge variant="outline" className="text-xs font-black">
              {filteredGroups.length} OF {groups.length} {groupLabelPlural.toUpperCase()}
            </Badge>
          </div>

          {listLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-label="Loading groups">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="h-48 bg-muted animate-pulse" />
                  <CardContent className="p-6 space-y-3">
                    <div className="h-5 w-2/3 rounded-lg bg-muted animate-pulse" />
                    <div className="h-14 rounded-xl bg-muted animate-pulse" />
                    <div className="h-8 rounded-xl bg-muted animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredGroups.length === 0 ? (
            <Card className="p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-bold text-foreground">
                  {groups.length === 0 ? `No ${groupsLower} yet` : "No matches found"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {groups.length === 0
                    ? `Add your first ${groupLower} to get started.`
                    : "Try a different search, or clear the search to see everything."}
                </p>
              </div>
              {groups.length === 0 ? (
                <Button onClick={() => { resetForm(); setActiveTab("add"); }} className="rounded-2xl">
                  <PlusCircle className="w-4 h-4 mr-2" /> Add {groupLabel}
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setSearchQuery("")} className="rounded-2xl">
                  Clear search
                </Button>
              )}
            </Card>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group, idx) => (
              <FadeIn key={group._id} delay={idx * 0.05}>
                <Card className="overflow-hidden flex flex-col h-full hover:shadow-lg transition-all duration-500 hover:-translate-y-1">
                  <div className="relative h-48 bg-muted border-b border-border overflow-hidden">
                    {group.logoUrl ? (
                      <img src={group.logoUrl} alt={`${group.name} logo`} className="w-full h-full object-contain p-8 transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center space-y-3 opacity-20">
                        <Camera className="w-12 h-12 text-muted-foreground" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">No logo yet</p>
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
                            {group.captain?.name || group.captain_name || "No captain assigned"}
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
                      <Badge variant="secondary">{group.total_score || 0} pts</Badge>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          title={`Edit ${groupLower}`}
                          aria-label={`Edit ${group?.name || groupLower}`}
                          onClick={() => { 
                            setFormData({ 
                              name: group.name, 
                              captain_name: group.captain?.name || group.captain_name || "", 
                              captain_contact: group.captain?.phone || group.captain_contact || "",
                              captain_participant_id: ""
                            }); 
                            setCaptainParticipant(null);
                            setCaptainTouched(false);
                            setEditingGroupId(group._id); 
                            setLogoUrl(group.logoUrl || ""); 
                            setLogoPublicId(group.logoPublicId || "");
                            setError("");
                            setFieldError("");
                            setNeedsSwitch(false);
                            setActiveTab("add"); 
                          }}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" title={`Delete ${groupLower}`} aria-label={`Delete ${group?.name || groupLower}`}>
                              {deletingId === group._id
                                ? <Loader2 className="w-4 h-4 animate-spin text-destructive" />
                                : <Trash2 className="w-4 h-4 text-destructive" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete “{group.name}”?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This removes the {groupLower} from {competition?.name || "this competition"}. Members keep their profiles. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteGroup(group._id)}>Delete</AlertDialogAction>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            ))}
          </div>
          )}
        </FadeIn>
      ) : (
        <FadeIn className="max-w-4xl mx-auto">
          <Button
            variant="outline"
            onClick={() => { resetForm(); setActiveTab("manage"); }}
            className="mb-4 min-h-[44px] rounded-full"
            aria-label={`Back to all ${groupsLower}`}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to All {groupLabelPlural}
          </Button>
          <Card className="p-10 grid grid-cols-1 lg:grid-cols-12 gap-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
              <PlusCircle className="w-48 h-48 text-primary" />
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-foreground">{groupLabel} logo</h3>
                <p className="text-sm font-medium text-muted-foreground">Shown on cards, standings and public views. Optional.</p>
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
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Uploading logo...</p>
                  </div>
                ) : logoUrl ? (
                  <div className="relative w-full h-full p-4 flex items-center justify-center">
                    <img src={logoUrl} className="w-full h-full object-contain p-6 transition-transform group-hover:scale-105" alt={`${groupLower} logo preview`} />
                    <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl">
                      <Camera className="w-8 h-8 text-background" />
                      <span className="absolute bottom-6 text-[10px] font-black uppercase tracking-widest text-background/80">Change logo</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 space-y-4">
                    <div className="w-16 h-16 rounded-2xl shadow-xl flex items-center justify-center mx-auto transition-transform group-hover:scale-110 bg-card">
                      <Upload className="w-6 h-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Upload logo</p>
                      <p className="text-[9px] font-medium text-muted-foreground max-w-[150px] mx-auto leading-normal">
                        Click to browse, drag &amp; drop, or paste an image (max 2MB)
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
                  Remove logo
                </Button>
              )}
            </div>

            <div className="lg:col-span-8 flex flex-col justify-center">
              <form onSubmit={handleAddOrEditGroup} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Shield className="w-3 h-3 text-primary" /> {groupLabel} name
                  </Label>
                  <Input 
                    required 
                    value={formData.name} 
                    onChange={e => { setFormData({...formData, name: e.target.value}); if (fieldError) setFieldError(""); }}
                    placeholder={`e.g. ${groupLabel === "Department" ? "Computer Science & Engineering" : "Phoenix Prime"}`}
                    className="rounded-2xl px-6 py-4 text-sm font-bold"
                    aria-invalid={!!fieldError}
                  />
                  {fieldError && (
                    <p className="text-xs font-semibold text-destructive" role="alert">{fieldError}</p>
                  )}
                </div>

                  {editingGroupId && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Star className="w-3 h-3 text-accent-amber" /> Captain (optional)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {`Pick a captain from this ${groupLower}'s participants, or leave it empty.`}
                  </p>

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
                            type="button"
                            onClick={() => {
                              setCaptainParticipant(null);
                              setCaptainTouched(true);
                              setFormData(prev => ({ ...prev, captain_name: "", captain_contact: "", captain_participant_id: null }));
                            }}
                          >
                            <X className="w-4 h-4 text-accent-amber" />
                          </Button>
                        </div>
                      ) : formData.captain_name && formData.captain_participant_id !== null ? (
                        <div className="p-4 rounded-2xl border bg-muted border-border">
                          <p className="text-xs font-bold text-foreground truncate">{formData.captain_name}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">Current captain kept. Choose below to change, or clear to remove on save.</p>
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl border border-dashed bg-muted border-border text-center">
                          <p className="text-xs font-semibold text-muted-foreground">No captain assigned</p>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => setShowParticipantPicker(!showParticipantPicker)}
                        className="w-full py-3 text-[10px] font-black uppercase tracking-widest rounded-xl"
                      >
                        {showParticipantPicker ? "Close" : captainParticipant ? "Change captain" : "Choose captain from participants"}
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
                                <p className="text-xs font-semibold text-muted-foreground">No participants in this {groupLower} yet</p>
                                <p className="text-[10px] text-muted-foreground mt-1">Add participants first via Manage Participants, then pick a captain</p>
                              </div>
                            ) : (
                              participants
                                .filter(p => {
                                  const pq = participantSearch.trim().toLowerCase();
                                  if (!pq) return true;
                                  return (
                                    String(p?.name || "").toLowerCase().includes(pq) ||
                                    String(p?.class || "").toLowerCase().includes(pq) ||
                                    (p?.email && p.email.toLowerCase().includes(pq))
                                  );
                                })
                                .map(p => (
                                  <button
                                    key={p._id}
                                    type="button"
                                    onClick={() => {
                                      setCaptainParticipant(p);
                                      setCaptainTouched(true);
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
                </div>
                )}

                <div className="pt-4 space-y-3">
                  <Button 
                    type="submit" 
                    disabled={saving || uploading}
                    className="w-full py-5 text-[11px] font-black uppercase tracking-[0.3em] rounded-2xl"
                  >
                    {saving ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                      </span>
                    ) : editingGroupId ? `Save ${groupLabel}` : `Create ${groupLabel}`}
                  </Button>

                  <Button 
                    variant="ghost"
                    type="button"
                    onClick={() => { resetForm(); setActiveTab("manage"); }}
                    className="w-full py-4 text-[10px] font-black uppercase tracking-widest"
                  >
                    Cancel
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
