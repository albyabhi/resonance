// src/components/ManageUser.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const roles = ["admin", "captain", "student_coordinator", "faculty", "guest"];

const ManageUser = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("manage");
  const [users, setUsers] = useState([]);
  const [houses, setHouses] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    role: "guest",
    house: "", // holds house_id for captain/student_coordinator
  });
  const [editingUserId, setEditingUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const apiCall = async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");

    const config = {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
      body: options.body,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Failed to parse JSON, response text:", text);
      throw new Error("Invalid JSON response from server");
    }

    if (!response.ok) throw new Error(data.message || "API call failed");
    return data;
  };

  // Fetch houses for role-based selection
  const fetchHouses = async () => {
    try {
      const resp = await apiCall("/api/house");
      setHouses(Array.isArray(resp) ? resp : resp.houses || []);
    } catch (err) {
      console.warn("Failed to load houses:", err.message);
      setHouses([]);
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const resp = await apiCall("/api/users");
      const list = Array.isArray(resp) ? resp : Array.isArray(resp.users) ? resp.users : [];
      setUsers(list);
    } catch (err) {
      setError(err.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUsers();
      fetchHouses();
    }
  }, [token]);

  // Add or edit user
  const handleAddOrEditUser = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");

      const requiresHouse = formData.role === "captain" || formData.role === "student_coordinator";

      // Build payload; for captain or student_coordinator, house must be ObjectId string in formData.house
      const payload = requiresHouse
        ? {
            name: formData.name,
            username: formData.username,
            password: formData.password,
            role: formData.role,
            house: formData.house || null,
          }
        : { ...formData };

      if (editingUserId) {
        const { user } = await apiCall(`/api/users/${editingUserId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setUsers((prev) => prev.map((u) => (u._id === editingUserId ? user : u)));
        setEditingUserId(null);
      } else {
        const { user } = await apiCall("/api/users/add", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setUsers((prev) => [user, ...prev]);
      }

      setFormData({
        name: "",
        username: "",
        password: "",
        role: "guest",
        house: "",
      });
      setActiveTab("manage");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Edit form
  const handleEdit = (user) => {
    setFormData({
      name: user.name || "",
      username: user.username || "",
      password: "",
      role: user.role || "guest",
      house: user.house?._id || "", // preselect existing house for captain/student_coordinator
    });
    setEditingUserId(user._id);
    setActiveTab("add");
  };

  // Delete user
  const handleDelete = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      setLoading(true);
      await apiCall(`/api/users/${userId}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u._id !== userId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: "bg-red-50 text-red-700 border-red-200",
      captain: "bg-blue-50 text-blue-700 border-blue-200",
      student_coordinator: "bg-green-50 text-green-700 border-green-200",
      faculty: "bg-purple-50 text-purple-700 border-purple-200",
      guest: "bg-gray-50 text-gray-700 border-gray-200",
    };
    return colors[role] || colors.guest;
  };

  const houseLabel = (u) => {
    if (u?.house && typeof u.house === "object" && u.house.name) return u.house.name;
    return "-";
  };
  const createdLabel = (u) => {
    const d = u?.createdAt || u?.created_at;
    try {
      return d ? new Date(d).toLocaleDateString() : "-";
    } catch {
      return "-";
    }
  };

  const requiresHouseSelect = (role) => role === "captain" || role === "student_coordinator";

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">User Management</h1>
          <p className="text-gray-600 text-sm md:text-base">Manage users, roles, and permissions</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
            <button onClick={() => setError("")} className="ml-2 text-red-500 hover:text-red-700">
              ×
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6 p-1">
          <div className="flex">
            <button
              className={`flex-1 px-4 py-3 text-sm md:text-base font-medium rounded-lg transition-all duration-200 ${
                activeTab === "manage"
                  ? "bg-blue-500 text-white shadow-md"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
              onClick={() => {
                setActiveTab("manage");
                setEditingUserId(null);
                setFormData({ name: "", username: "", password: "", role: "guest", house: "" });
                fetchUsers();
              }}
            >
              Manage Users
            </button>
            <button
              className={`flex-1 px-4 py-3 text-sm md:text-base font-medium rounded-lg transition-all duration-200 ${
                activeTab === "add"
                  ? "bg-blue-500 text-white shadow-md"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
              onClick={() => {
                setActiveTab("add");
                setEditingUserId(null);
                setFormData({ name: "", username: "", password: "", role: "guest", house: "" });
              }}
            >
              {editingUserId ? "Edit User" : "Add User"}
            </button>
          </div>
        </div>

        {/* Manage Users */}
        {activeTab === "manage" && (
          <div>
            {/* Mobile: no wrapper card */}
            <div className="block md:hidden">
              {Array.isArray(users) && users.length === 0 && !loading ? (
                <div className="p-4 text-gray-600">No users found</div>
              ) : null}
              {users.map((user) => (
                <div key={user._id} className="p-4 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{user.name}</h3>
                      <p className="text-sm text-gray-500">@{user.username}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getRoleColor(user.role)}`}>
                      {user.role.replace("_", " ")}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                    <div>
                      <span className="text-gray-500">House:</span>
                      <p className="font-medium">{houseLabel(user)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <p className="font-medium">{createdLabel(user)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(user)}
                      className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(user._id)}
                      className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {loading ? <div className="p-4 text-gray-600">Loading…</div> : null}
            </div>

            {/* Desktop: with wrapper card */}
            <div className="hidden md:block">
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left p-4 text-sm font-semibold text-gray-700">User</th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-700">Role</th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-700">House</th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-700">Created</th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(users) && users.length === 0 && !loading ? (
                        <tr>
                          <td className="p-4 text-gray-600" colSpan={5}>
                            No users found
                          </td>
                        </tr>
                      ) : null}
                      {users.map((user) => (
                        <tr key={user._id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-4">
                            <div>
                              <div className="font-semibold text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">@{user.username}</div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-3 py-1 text-xs font-medium rounded-full border ${getRoleColor(user.role)}`}
                            >
                              {user.role.replace("_", " ")}
                            </span>
                          </td>
                          <td className="p-4 text-gray-600">{houseLabel(user)}</td>
                          <td className="p-4 text-gray-600">{createdLabel(user)}</td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(user)}
                                className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(user._id)}
                                className="px-3 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {loading ? (
                        <tr>
                          <td className="p-4 text-gray-600" colSpan={5}>
                            Loading…
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit User Form */}
        {activeTab === "add" && (
          <div>
            {/* Mobile: no wrapper card */}
            <div className="block md:hidden">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {editingUserId ? "Edit User" : "Add New User"}
                </h2>
                <p className="text-gray-600 text-sm">
                  {editingUserId ? "Update user information" : "Fill in the details to create a new user"}
                </p>
              </div>
              <form onSubmit={handleAddOrEditUser} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter full name"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Enter username"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                {!editingUserId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter password"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      setFormData({
                        ...formData,
                        role: newRole,
                        house: requiresHouseSelect(newRole) ? formData.house : "",
                      });
                    }}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white"
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {r.replace("_", " ").toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                {/* House selection behavior */}
                {requiresHouseSelect(formData.role) ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assign House</label>
                    <select
                      required
                      value={formData.house}
                      onChange={(e) => setFormData({ ...formData, house: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      <option value="">Select house</option>
                      {houses.map((h) => (
                        <option key={h._id} value={h._id}>
                          {h.name} ({h.code})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">This user will be linked to the selected house.</p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      House <span className="text-gray-400 text-xs">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.house}
                      onChange={(e) => setFormData({ ...formData, house: e.target.value })}
                      placeholder="Enter house name or ID"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("manage");
                      setEditingUserId(null);
                      setFormData({ name: "", username: "", password: "", role: "guest", house: "" });
                    }}
                    className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 font-medium rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {loading ? "Saving..." : editingUserId ? "Update User" : "Add User"}
                  </button>
                </div>
              </form>
            </div>

            {/* Desktop: with wrapper card */}
            <div className="hidden md:block">
              <div className= "bg-white rounded-xl shadow-sm p-6 max-w-md mx-auto">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {editingUserId ? "Edit User" : "Add New User"}
                  </h2>
                  <p className="text-gray-600 text-sm">
                    {editingUserId ? "Update user information" : "Fill in the details to create a new user"}
                  </p>
                </div>
                <form onSubmit={handleAddOrEditUser} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter full name"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="Enter username"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  {!editingUserId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                      <input
                        type="password"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Enter password"
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => {
                        const newRole = e.target.value;
                        setFormData({
                          ...formData,
                          role: newRole,
                          house: requiresHouseSelect(newRole) ? formData.house : "",
                        });
                      }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white"
                    >
                      {roles.map((r) => (
                        <option key={r} value={r}>
                          {r.replace("_", " ").toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* House selection behavior */}
                  {requiresHouseSelect(formData.role) ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Assign House</label>
                      <select
                        required
                        value={formData.house}
                        onChange={(e) => setFormData({ ...formData, house: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      >
                        <option value="">Select house</option>
                        {houses.map((h) => (
                          <option key={h._id} value={h._id}>
                            {h.name} ({h.code})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">This user will be linked to the selected house.</p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        House <span className="text-gray-400 text-xs">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.house}
                        onChange={(e) => setFormData({ ...formData, house: e.target.value })}
                        placeholder="Enter house name or ID"
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("manage");
                        setEditingUserId(null);
                        setFormData({ name: "", username: "", password: "", role: "guest", house: "" });
                      }}
                      className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 font-medium rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {loading ? "Saving..." : editingUserId ? "Update User" : "Add User"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageUser;
