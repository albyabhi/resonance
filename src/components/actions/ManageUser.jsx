import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../AuthContext";
import { FadeIn } from "../AnimateReveal";
import { UserPlus, Users, Edit3, Trash2, Search, Copy, ExternalLink } from "lucide-react";
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
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "../ui/alert-dialog";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const BASE_ROLE_OPTIONS = [
  { value: "super_admin", label: "Super Admin" },
  { value: "organizer", label: "Organizer" },
  { value: "event_coordinator", label: "Event Coordinator" },
  { value: "judge", label: "Judge" },
  { value: "house_captain", label: "Captain" },
];

const ManageUser = () => {
  const { token } = useAuth();
  const { competition, groupLabel, groupLabelPlural } = useCompetition();
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
  const [selectedCaptainParticipant, setSelectedCaptainParticipant] = useState(null);
  const [groupParticipants, setGroupParticipants] = useState([]);
  const [filteredGroupParticipants, setFilteredGroupParticipants] = useState([]);
  const [participantSearchQuery, setParticipantSearchQuery] = useState("");
  const [fetchingGroupParticipants, setFetchingGroupParticipants] = useState(false);

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
      if (!competition?._id) return;
      const resp = await apiCall(`/api/competition/${competition._id}/groups`);
      setHouses(Array.isArray(resp) ? resp : []);
    } catch (err) {
      console.error("Failed to fetch houses:", err);
    }
  }, [competition, apiCall]);

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
  }, [token, competition?._id, fetchUsers, fetchHouses]);

  useEffect(() => {
    if (houses.length === 0) {
      setFormData((prev) => ({ ...prev, house: "" }));
    }
  }, [houses.length]);

  const fetchGroupParticipants = useCallback(async (groupId) => {
    if (!groupId || !isCaptainRole(formData.role) || !competition?._id) return;
    setFetchingGroupParticipants(true);
    try {
      const resp = await apiCall(`/api/competition/${competition._id}/groups/${groupId}/participants`);
      const participants = Array.isArray(resp) ? resp : [];
      setGroupParticipants(participants);
      setFilteredGroupParticipants(participants);
    } catch (err) {
      console.error("Failed to fetch group participants:", err);
    } finally {
      setFetchingGroupParticipants(false);
    }
  }, [apiCall, formData.role, competition]);

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

      setFormData({ name: "", username: "", password: "", role: "participant", house: "" });
      setEditingUserId(null);
      setSelectedCaptainParticipant(null);
      setGroupParticipants([]);
      setFilteredGroupParticipants([]);
      setParticipantSearchQuery("");

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

  const isCaptainRole = (role) => role === "house_captain";

  return (
    <FadeIn>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">User Management</h2>
          <Button
            onClick={() => { setActiveTab(activeTab === "manage" ? "add" : "manage"); setEditingUserId(null); setCredentials(null); setFormData({ name: "", username: "", password: "", role: "participant", house: "" }); }}
          >
            {activeTab === "manage" ? <UserPlus className="h-4 w-4 mr-2" /> : <Users className="h-4 w-4 mr-2" />}
            {activeTab === "manage" ? "Add User" : "View All"}
          </Button>
        </div>

        {error && (
          <div className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {credentials && (
          <Card className="border-2 border-accent-green/40">
            <CardHeader>
              <CardTitle className="text-accent-green">User Created — Share Credentials</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-border mb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium text-foreground">Email</TableCell>
                      <TableCell className="text-muted-foreground">{credentials.email}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(credentials.email, "Email")}>
                          <Copy className="h-3 w-3 mr-1" /> Copy
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-foreground">Password</TableCell>
                      <TableCell className="font-mono text-accent-amber">{credentials.password}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(credentials.password, "Password")}>
                          <Copy className="h-3 w-3 mr-1" /> Copy
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-foreground">Setup Link</TableCell>
                      <TableCell className="text-xs break-all text-muted-foreground">{credentials.setup_link}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(credentials.setup_link, "Setup link")}>
                          <Copy className="h-3 w-3 mr-1" /> Copy Link
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Share the password or the setup link with the user. The link expires in 7 days.
                The user can set their password at the link and then sign in.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => { setCredentials(null); setActiveTab("manage"); }}>
                  Done — View All Users
                </Button>
                <Button variant="secondary" onClick={() => { setCredentials(null); }}>
                  Add Another User
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "add" && !credentials && (
          <Card>
            <CardHeader>
              <CardTitle>{editingUserId ? "Edit User" : "Add New User"}</CardTitle>
              <CardDescription>
                Password is optional — leave blank to auto-generate a secure password and setup link.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Full name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Email</Label>
                    <Input id="username" name="username" type="email" value={formData.username} onChange={handleChange} placeholder="email@example.com" required />
                  </div>
                  {!editingUserId && (
                    <div className="space-y-2">
                      <Label htmlFor="password">Password <span className="font-normal text-muted-foreground">(optional)</span></Label>
                      <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Leave blank to auto-generate" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select name="role" value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                      <SelectTrigger id="role">
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
                    <div className="space-y-2 lg:col-span-2">
                      <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                        Captain Setup
                      </Label>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Left: Group Dropdown */}
                        <div className="space-y-2">
                          <Label htmlFor="house">{groupLabel || "Group"}</Label>
                          <Select
                            name="house"
                            value={formData.house}
                            onValueChange={(value) => setFormData({ ...formData, house: value })}
                          >
                            <SelectTrigger id="house">
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

                        {/* Right: Participant Selector */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Select Participant</Label>
                            <span className="text-xs text-muted-foreground">(Optional)</span>
                          </div>
                          <div className="border rounded-lg bg-background">
                            <div className="p-2 border-b">
                              <Input
                                type="text"
                                placeholder="Search by name..."
                                value={participantSearchQuery}
                                onChange={(e) => setParticipantSearchQuery(e.target.value)}
                                className="text-sm"
                              />
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              {fetchingGroupParticipants ? (
                                <div className="p-4 text-center text-muted-foreground">Loading...</div>
                              ) : filteredGroupParticipants.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                  {groupParticipants.length === 0
                                    ? `No participants in this ${groupLabel?.toLowerCase()}. `
                                    : "No matching participants."}
                                  {groupParticipants.length === 0 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="mt-2"
                                      onClick={() => {}}
                                    >
                                      Add participants first
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                filteredGroupParticipants.map((p) => (
                                  <button
                                    key={p._id}
                                    type="button"
                                    onClick={() => handleParticipantSelect(p)}
                                    className={`w-full text-left p-3 hover:bg-accent-blue/5 border-b last:border-0 transition-colors ${
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
                              <div className="p-2 border-t flex justify-between items-center bg-muted/50">
                                <span className="text-sm font-medium text-accent-green">
                                  Selected: {selectedCaptainParticipant.name}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={clearParticipantSelection}
                                >
                                  × Clear
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
                      <div className="p-3 rounded-lg border border-border bg-muted">
                        <div className="font-medium text-foreground">{selectedCaptainParticipant.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {selectedCaptainParticipant.unique_id && `ID: ${selectedCaptainParticipant.unique_id} • `}Class: {selectedCaptainParticipant.class}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedCaptainParticipant(null)} className="mt-2">
                          Change
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={loading}>
                    {loading ? "Saving..." : (editingUserId ? "Update User" : "Add User")}
                  </Button>
                  {editingUserId && (
                    <Button variant="secondary" type="button" onClick={() => { setEditingUserId(null); setFormData({ name: "", username: "", password: "", role: "participant", house: "" }); }}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {activeTab === "manage" && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users by name..."
                className="pl-10"
              />
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>{groupLabel || "House"}</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Loading...</TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No users found</TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user._id}>
                        <TableCell className="font-medium text-foreground">{user.name}</TableCell>
                        <TableCell className="text-muted-foreground">{user.username || user.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{roleLabel(user.role || user.membership_role)}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{user.house?.name || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleResendLink(user._id)} title="Generate setup link">
                              <ExternalLink className="h-4 w-4 text-accent-green" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove User</AlertDialogTitle>
                                  <AlertDialogDescription>Are you sure you want to remove this user? This action cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(user._id)}>Remove</AlertDialogAction>
                              </AlertDialogContent>
                            </AlertDialog>
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
