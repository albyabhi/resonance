import React, { useState, useEffect, useCallback } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useAuth } from "../AuthContext";
import { FadeIn } from "../AnimateReveal";
import { UserPlus, Users, Edit3, Trash2, Search, Copy, ExternalLink, X } from "lucide-react";
import { useCompetition } from "../../context/CompetitionContext";
import { apiJson } from "../../utils/apiClient";
import toast from "react-hot-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";
import { Label } from "../ui/label";
import { Dialog, DialogOverlay, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "../ui/alert-dialog";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const BASE_ROLE_OPTIONS = [
  { value: "super_admin", label: "Super Admin" },
  { value: "organizer", label: "Organizer" },
  { value: "event_coordinator", label: "Event Coordinator" },
  { value: "judge", label: "Judge" },
  { value: "house_captain", label: "Captain" },
];

const EMPTY_FORM = { name: "", username: "", password: "", role: "participant", house: "" };

const ManageUser = () => {
  const { token } = useAuth();
  const { competitionId, groupLabel, groupLabelPlural } = useCompetition();
  const [activeTab, setActiveTab] = useState("manage");
  const [users, setUsers] = useState([]);
  const [houses, setHouses] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingUserId, setEditingUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState(null);
  const [selectedCaptainParticipant, setSelectedCaptainParticipant] = useState(null);
  const [groupParticipants, setGroupParticipants] = useState([]);
  const [filteredGroupParticipants, setFilteredGroupParticipants] = useState([]);
  const [participantSearchQuery, setParticipantSearchQuery] = useState("");
  const [fetchingGroupParticipants, setFetchingGroupParticipants] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const roleOptions = BASE_ROLE_OPTIONS;

  const apiCall = useCallback(async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      body: options.body,
    });
  }, [token]);

  const fetchHouses = useCallback(async () => {
    try {
      if (!competitionId) return;
      const resp = await apiCall(`/api/competition/${competitionId}/groups`);
      setHouses(Array.isArray(resp) ? resp : []);
    } catch (err) {
      console.error("Failed to fetch houses:", err);
    }
  }, [competitionId, apiCall]);

  const fetchUsers = useCallback(async () => {
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
  }, [apiCall]);

  useEffect(() => {
    if (token) {
      fetchUsers();
      fetchHouses();
    }
  }, [token, competitionId, fetchUsers, fetchHouses]);

  useEffect(() => {
    if (houses.length === 0) {
      setFormData((prev) => ({ ...prev, house: "" }));
    }
  }, [houses.length]);

  const fetchGroupParticipants = useCallback(async (groupId) => {
    if (!groupId || !isCaptainRole(formData.role) || !competitionId) return;
    setFetchingGroupParticipants(true);
    try {
      const resp = await apiCall(`/api/competition/${competitionId}/groups/${groupId}/participants`);
      const participants = Array.isArray(resp) ? resp : [];
      setGroupParticipants(participants);
      setFilteredGroupParticipants(participants);
    } catch (err) {
      console.error("Failed to fetch group participants:", err);
    } finally {
      setFetchingGroupParticipants(false);
    }
  }, [apiCall, formData.role, competitionId]);

  useEffect(() => {
    if (formData.house && isCaptainRole(formData.role)) {
      fetchGroupParticipants(formData.house);
    } else {
      setGroupParticipants([]);
      setFilteredGroupParticipants([]);
      setSelectedCaptainParticipant(null);
      setParticipantSearchQuery("");
    }
  }, [formData.house, formData.role, fetchGroupParticipants]);

  useEffect(() => {
    const q = participantSearchQuery.toLowerCase().trim();
    if (!q) {
      setFilteredGroupParticipants(groupParticipants);
    } else {
      setFilteredGroupParticipants(groupParticipants.filter((p) =>
        p.name.toLowerCase().includes(q)
      ));
    }
  }, [participantSearchQuery, groupParticipants]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetFormState = () => {
    setFormData(EMPTY_FORM);
    setEditingUserId(null);
    setSelectedCaptainParticipant(null);
    setGroupParticipants([]);
    setFilteredGroupParticipants([]);
    setParticipantSearchQuery("");
  };

  const openAddForm = () => {
    resetFormState();
    setCredentials(null);
    setActiveTab("add");
  };

  const closeForm = () => {
    resetFormState();
    setActiveTab("manage");
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
      if (isCaptainRole(formData.role) && selectedCaptainParticipant) {
        body.captain_participant_id = selectedCaptainParticipant._id;
      }

      const resp = await apiCall(endpoint, {
        method,
        body: JSON.stringify(body),
      });

      const created = resp.credentials;
      resetFormState();

      if (!editingUserId && created) {
        setCredentials(created);
      }
      // Always land back on the list; the credentials card renders above it.
      setActiveTab("manage");

      await fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleParticipantSelect = (participant) => {
    setSelectedCaptainParticipant(participant);
    setFormData((prev) => ({
      ...prev,
      name: participant.name,
      username: participant.email || prev.username,
    }));
  };

  const clearParticipantSelection = () => {
    setSelectedCaptainParticipant(null);
    setParticipantSearchQuery("");
    // Keep form data - admin can manually edit
  };

  const handleEdit = (user) => {
    setCredentials(null);
    setSelectedCaptainParticipant(null);
    setGroupParticipants([]);
    setFilteredGroupParticipants([]);
    setParticipantSearchQuery("");
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
    try {
      await apiCall(`/api/users/${userId}`, { method: "DELETE" });
      await fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleResendLink = async (user) => {
    try {
      const resp = await apiCall(`/api/users/setup-link/${user._id}`, { method: "POST" });
      await navigator.clipboard.writeText(resp.setup_link);
      toast.success(`Setup link copied to clipboard for ${resp.email || user.name}`);
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

  const isCaptainRole = (role) => role === "house_captain";

  const isFormOpen = activeTab === "add" && !credentials;
  // Mount only one form presentation at a time: a CSS-only `sm:hidden`
  // bottom sheet would still trap focus inside the hidden dialog on desktop.
  const showInlineForm = isFormOpen && !isMobile;
  const showSheetForm = isFormOpen && isMobile;
  const userEmail = (user) => user.username || user.email || "-";

  const renderRowActions = (user) => (
    <div className="flex gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 shrink-0 sm:h-10 sm:w-10"
        onClick={() => handleResendLink(user)}
        title={`Generate setup link for ${user.name}`}
        aria-label={`Generate setup link for ${user.name}`}
      >
        <ExternalLink className="h-4 w-4 text-accent-green" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 shrink-0 sm:h-10 sm:w-10"
        onClick={() => handleEdit(user)}
        title={`Edit ${user.name}`}
        aria-label={`Edit ${user.name}`}
      >
        <Edit3 className="h-4 w-4" />
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0 sm:h-10 sm:w-10"
            title={`Remove ${user.name}`}
            aria-label={`Remove ${user.name}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[90dvh] overflow-y-auto p-4 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{user.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel className="mt-0 h-11 w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(user._id)} className="h-11 w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto">
              Remove
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  const renderUserForm = (idPrefix) => (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-name`}>Name</Label>
          <Input
            id={`${idPrefix}-name`}
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Full name"
            autoComplete="name"
            required
            className="h-11 text-base sm:h-10 sm:text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-username`}>Email</Label>
          <Input
            id={`${idPrefix}-username`}
            name="username"
            type="email"
            value={formData.username}
            onChange={handleChange}
            placeholder="email@example.com"
            autoComplete="email"
            required
            className="h-11 text-base sm:h-10 sm:text-sm"
          />
        </div>
        {!editingUserId && (
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-password`}>
              Password <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id={`${idPrefix}-password`}
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Leave blank to auto-generate"
              autoComplete="new-password"
              className="h-11 text-base sm:h-10 sm:text-sm"
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-role`}>Role</Label>
          <Select name="role" value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
            <SelectTrigger id={`${idPrefix}-role`} className="h-11 text-base sm:h-10 sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isCaptainRole(formData.role) && (
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Captain Setup
            </Label>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
              <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-house`}>{groupLabel || "Group"}</Label>
                <Select
                  name="house"
                  value={formData.house}
                  onValueChange={(value) => setFormData({ ...formData, house: value })}
                >
                  <SelectTrigger id={`${idPrefix}-house`} className="h-11 text-base sm:h-10 sm:text-sm">
                    <SelectValue
                      placeholder={
                        houses.length === 0
                          ? `No ${groupLabelPlural || "Groups"} available`
                          : `Select ${groupLabel || "Group"}`
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {houses.length === 0 ? (
                      <SelectItem disabled value="">
                        No {groupLabelPlural || "Groups"} available. Create one first.
                      </SelectItem>
                    ) : (
                      houses.map((h) => (
                        <SelectItem key={h._id} value={h._id}>
                          {h.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label id={`${idPrefix}-participant-label`}>Select Participant</Label>
                  <span className="text-xs text-muted-foreground">(Optional)</span>
                </div>
                <div className="rounded-lg border border-border bg-background">
                  <div className="border-b border-border p-2">
                    <Input
                      type="text"
                      placeholder="Search by name..."
                      value={participantSearchQuery}
                      onChange={(e) => setParticipantSearchQuery(e.target.value)}
                      aria-labelledby={`${idPrefix}-participant-label`}
                      className="h-11 text-base sm:h-10 sm:text-sm"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {fetchingGroupParticipants ? null : filteredGroupParticipants.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {groupParticipants.length === 0
                          ? `No participants in this ${groupLabel?.toLowerCase()}. Add participants first.`
                          : "No matching participants."}
                      </div>
                    ) : (
                      filteredGroupParticipants.map((p) => (
                        <button
                          key={p._id}
                          type="button"
                          onClick={() => handleParticipantSelect(p)}
                          aria-pressed={selectedCaptainParticipant?._id === p._id}
                          className={`min-h-[48px] w-full border-b border-border p-3 text-left transition-colors last:border-0 hover:bg-muted/50 ${
                            selectedCaptainParticipant?._id === p._id
                              ? "bg-accent-blue/10 text-accent-blue"
                              : ""
                          }`}
                        >
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.unique_id && `${p.unique_id} • `}{p.class}
                            {p.email && ` • ${p.email}`}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  {selectedCaptainParticipant && (
                    <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/50 p-2 pl-3">
                      <span className="truncate text-sm font-medium text-accent-green">
                        Selected: {selectedCaptainParticipant.name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearParticipantSelection}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {isCaptainRole(formData.role) && selectedCaptainParticipant && (
          <div className="space-y-2">
            <Label>Captain Participant</Label>
            <div className="rounded-lg border border-border bg-muted p-3">
              <div className="font-medium text-foreground">{selectedCaptainParticipant.name}</div>
              <div className="text-sm text-muted-foreground">
                {selectedCaptainParticipant.unique_id && `ID: ${selectedCaptainParticipant.unique_id} • `}Class: {selectedCaptainParticipant.class}
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedCaptainParticipant(null)} className="mt-2">
                Change
              </Button>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
        <Button type="submit" disabled={loading} className="h-11 w-full sm:w-auto">
          {loading ? "Saving..." : (editingUserId ? "Update User" : "Add User")}
        </Button>
        <Button variant="outline" type="button" onClick={closeForm} className="h-11 w-full sm:w-auto">
          Cancel
        </Button>
      </div>
    </form>
  );

  return (
    <FadeIn>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-foreground sm:text-xl">User Management</h2>
            <p className="text-xs text-muted-foreground sm:text-sm" aria-live="polite">
              {users.length} {users.length === 1 ? "user" : "users"}
              {searchQuery && ` • ${filteredUsers.length} shown`}
            </p>
          </div>
          <Button
            onClick={() => { isFormOpen ? closeForm() : openAddForm(); }}
            className="h-11 w-full shrink-0 sm:w-auto"
          >
            {isFormOpen ? <Users className="h-4 w-4 mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
            {isFormOpen ? "View All" : "Add User"}
          </Button>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-xl bg-destructive/10 p-4 text-sm text-destructive"
          >
            <span className="min-w-0">{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
              className="rounded p-1 hover:bg-destructive/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {credentials && (
          <Card className="border-2 border-accent-green/40">
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div className="min-w-0">
                <CardTitle className="text-accent-green">User Created — Share Setup Link</CardTitle>
                <CardDescription className="mt-1">
                  Share the setup link with the user. The link is one-time use and expires in 7 days.
                  The user sets their own password at the link and then signs in.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setCredentials(null)}
                aria-label="Dismiss setup link"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</p>
                <div className="flex items-center gap-2 rounded-lg bg-muted p-2 pl-3">
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground" title={credentials.email}>
                    {credentials.email}
                  </span>
                  <Button variant="ghost" size="sm" className="shrink-0" onClick={() => copyToClipboard(credentials.email, "Email")}>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Setup Link</p>
                <div className="flex items-center gap-2 rounded-lg bg-muted p-2 pl-3">
                  <span className="min-w-0 flex-1 break-all text-xs text-muted-foreground" title={credentials.setup_link}>
                    {credentials.setup_link}
                  </span>
                  <Button variant="ghost" size="sm" className="shrink-0" onClick={() => copyToClipboard(credentials.setup_link, "Setup link")}>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                <Button onClick={() => { setCredentials(null); setActiveTab("manage"); }} className="h-11 w-full sm:w-auto">
                  Done — View All Users
                </Button>
                <Button variant="secondary" onClick={() => { setCredentials(null); openAddForm(); }} className="h-11 w-full sm:w-auto">
                  Add Another User
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Desktop: inline form */}
        {showInlineForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingUserId ? "Edit User" : "Add New User"}</CardTitle>
              <CardDescription>
                Password is optional — leave blank to auto-generate a secure password and setup link.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderUserForm("desktop")}
            </CardContent>
          </Card>
        )}

        {/* Mobile: bottom-sheet form */}
        <Dialog
          open={showSheetForm}
          onOpenChange={(open) => { if (!open) closeForm(); }}
        >
          {showSheetForm && (
          <DialogPrimitive.Portal>
            <DialogOverlay className="sm:hidden" />
            <DialogPrimitive.Content
              className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-2xl border bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-soft duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom sm:hidden"
            >
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted" aria-hidden="true" />
              <DialogHeader className="text-left">
                <DialogTitle>{editingUserId ? "Edit User" : "Add New User"}</DialogTitle>
                <DialogDescription>
                  Password is optional — leave blank to auto-generate a secure password and setup link.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                {renderUserForm("mobile")}
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
          )}
        </Dialog>

        {activeTab === "manage" && (
          <div className="space-y-3 sm:space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users by name..."
                aria-label="Search users by name"
                className="h-11 pl-10 pr-10 text-base sm:h-10 sm:text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Mobile: stacked user cards */}
            {loading ? (
              <ul className="space-y-2 sm:hidden" aria-label="Users list">
                {[0, 1, 2].map((i) => (
                  <li key={i} className="animate-pulse rounded-xl border border-border bg-card p-3">
                    <div className="h-4 w-2/3 rounded bg-muted" />
                    <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
                  </li>
                ))}
              </ul>
            ) : filteredUsers.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center sm:hidden">
                <p className="text-sm font-medium text-foreground">
                  {searchQuery ? "No matching users" : "No users found"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {searchQuery ? "Try a different search." : "Add your first user to get started."}
                </p>
              </div>
            ) : (
              <ul className="space-y-2 sm:hidden" aria-label="Users list">
                {filteredUsers.map((user) => (
                  <li key={user._id} className="rounded-xl border border-border bg-card p-3 shadow-sm">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground"
                        aria-hidden="true"
                      >
                        {(user.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground" title={user.name}>
                          {user.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground" title={userEmail(user)}>
                          {userEmail(user)}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {roleLabel(user.role || user.membership_role)}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 border-t border-border pt-2">
                      <span className="min-w-0 truncate text-xs text-muted-foreground" title={user.house?.name || "-"}>
                        {groupLabel || "House"}: <span className="font-medium text-foreground">{user.house?.name || "-"}</span>
                      </span>
                      {renderRowActions(user)}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Desktop: table */}
            <Card className="hidden overflow-hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap px-3 sm:px-4">Name</TableHead>
                    <TableHead className="whitespace-nowrap px-3 sm:px-4">Email</TableHead>
                    <TableHead className="whitespace-nowrap px-3 sm:px-4">Role</TableHead>
                    <TableHead className="hidden whitespace-nowrap px-3 sm:px-4 lg:table-cell">{groupLabel || "House"}</TableHead>
                    <TableHead className="whitespace-nowrap px-3 text-right sm:px-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? null : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No users found</TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user._id}>
                        <TableCell className="max-w-[160px] truncate px-3 font-medium text-foreground sm:px-4" title={user.name}>
                          {user.name}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate px-3 text-muted-foreground sm:px-4 lg:max-w-none" title={userEmail(user)}>
                          {userEmail(user)}
                        </TableCell>
                        <TableCell className="px-3 sm:px-4">
                          <Badge variant="secondary">{roleLabel(user.role || user.membership_role)}</Badge>
                        </TableCell>
                        <TableCell className="hidden px-3 text-muted-foreground sm:px-4 lg:table-cell">
                          {user.house?.name || "-"}
                        </TableCell>
                        <TableCell className="px-3 sm:px-4">
                          <div className="flex justify-end gap-1">
                            {renderRowActions(user)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}
      </div>
    </FadeIn>
  );
};

export default ManageUser;
