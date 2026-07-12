import React, { useState, useEffect } from "react";
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
                  <div className="space-y-2">
                    <Label htmlFor="house">{groupLabel || "Group"}</Label>
                    <Select name="house" value={formData.house} onValueChange={(value) => setFormData({...formData, house: value})}>
                      <SelectTrigger id="house">
                        <SelectValue placeholder={`Select ${groupLabel || "Group"}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {houses.map((h) => (
                          <SelectItem key={h._id} value={h._id}>{h.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
