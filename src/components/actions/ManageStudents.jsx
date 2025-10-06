import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../AuthContext";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

function ManageStudents() {
  const { token } = useAuth();

  // UI states
  const [activeTab, setActiveTab] = useState("all"); // all | add | update
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Cached data
  const [houses, setHouses] = useState([]);
  const [students, setStudents] = useState([]);
  const [editingStudent, setEditingStudent] = useState(null);

  // Filter controls
  const [filterHouse, setFilterHouse] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [search, setSearch] = useState("");

  // Selection/bulk controls
  const [selectedIds, setSelectedIds] = useState([]);

  // Add single
  const [addForm, setAddForm] = useState({ name: "", class: "", house_id: "" });

  // Add bulk JSON
  const [bulkJson, setBulkJson] = useState(""); // textarea value
  const [bulkHouse, setBulkHouse] = useState(""); // house for bulk json

  // Unified API call
  const apiCall = async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    const config = {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
      body: options.body || undefined,
    };
    const res = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Invalid JSON response from server");
    }
    if (!res.ok) throw new Error(data.message || "API call failed");
    return data;
  };

  // Initial: load houses
  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      setError("");
      try {
        // GET /api/house returns array
        const housesResp = await apiCall("/api/house");
        setHouses(Array.isArray(housesResp) ? housesResp : housesResp.houses || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  // Load students when filters/search change
  const fetchStudents = async () => {
    setLoading(true);
    setError("");
    try {
      let url = "/api/students?";
      if (filterHouse) url += `house_id=${filterHouse}&`;
      if (filterClass) url += `class=${encodeURIComponent(filterClass)}&`;
      if (search) url += `search=${encodeURIComponent(search)}&`;
      const { students } = await apiCall(url);
      setStudents(students || []);
      setSelectedIds([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && activeTab === "all") fetchStudents();
    // eslint-disable-next-line
  }, [token, activeTab, filterHouse, filterClass, search]);

  // Tab actions
  const switchTab = (tab) => {
    setActiveTab(tab);
    setError("");
    setEditingStudent(null);
    setAddForm({ name: "", class: "", house_id: "" });
    setBulkJson("");
    setBulkHouse("");
    if (tab === "all" && token) fetchStudents();
  };

  // Add single
  const handleAddSingle = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { student } = await apiCall("/api/students", {
        method: "POST",
        body: JSON.stringify(addForm),
      });
      setAddForm({ name: "", class: "", house_id: "" });
      setStudents((prev) => [student, ...prev]);
      setActiveTab("all");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add bulk (JSON format)
  const handleBulkJson = async (e) => {
    e.preventDefault();
    if (!bulkJson.trim() || !bulkHouse) {
      setError("Paste JSON and select a house");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { inserted } = await apiCall("/api/students/bulkJson", {
        method: "POST",
        body: JSON.stringify({ house_id: bulkHouse, json_text: bulkJson }),
      });
      setBulkJson("");
      setBulkHouse("");
      setActiveTab("all");
      fetchStudents();
      alert(`Bulk added ${inserted} students`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update
  const handleEditStart = (stu) => {
    setEditingStudent({
      ...stu,
      house_id: stu.house_id?._id || stu.house_id,
    });
    setActiveTab("update");
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { student } = await apiCall(`/api/students/${editingStudent._id}`, {
        method: "PUT",
        body: JSON.stringify(editingStudent),
      });
      setActiveTab("all");
      fetchStudents();
      setEditingStudent(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete actions
  const handleDeleteSingle = async (id) => {
    if (!window.confirm("Delete this student?")) return;
    setLoading(true);
    setError("");
    try {
      await apiCall(`/api/students/${id}`, { method: "DELETE" });
      setStudents((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBulk = async () => {
    if (!selectedIds.length || !window.confirm("Delete selected students?")) return;
    setLoading(true);
    setError("");
    try {
      await apiCall("/api/students/bulk/remove", {
        method: "DELETE",
        body: JSON.stringify({ ids: selectedIds }),
      });
      fetchStudents();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (sid) => {
    setSelectedIds((prev) =>
      prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(students.map((s) => s._id));
  };

  const handleDeselectAll = () => setSelectedIds([]);

  // Helpers
  const getHouseName = (id) =>
    (houses.find((h) => h._id === id) || {}).name || "";

  // Render
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
            Student Management
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Manage all students, classes, and house mapping
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-4">
            {error}
            <button onClick={() => setError("")} className="ml-2 text-red-500">×</button>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-4 p-1 flex">
          <button
            className={`flex-1 px-4 py-3 font-medium rounded-lg transition-all duration-200 ${
              activeTab === "all"
                ? "bg-blue-500 text-white shadow-md"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
            onClick={() => switchTab("all")}
          >All Students</button>
          <button
            className={`flex-1 px-4 py-3 font-medium rounded-lg transition-all duration-200 ${
              activeTab === "add"
                ? "bg-blue-500 text-white shadow-md"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
            onClick={() => switchTab("add")}
          >Add</button>
          <button
            className={`flex-1 px-4 py-3 font-medium rounded-lg transition-all duration-200 ${
              activeTab === "update"
                ? "bg-blue-500 text-white shadow-md"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
            disabled={!editingStudent}
          >Update</button>
        </div>

        {/* ALL STUDENTS */}
        {activeTab === "all" && (
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              <select
                value={filterHouse}
                onChange={(e) => setFilterHouse(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"
              >
                <option value="">Filter by house</option>
                {houses.map((h) => (
                  <option key={h._id} value={h._id}>{h.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                placeholder="Filter by class"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <button
                className="px-3 py-2 bg-gray-200 rounded-lg text-sm"
                onClick={handleDeselectAll}
                type="button"
              >Clear Selection</button>
              <button
                className="px-3 py-2 bg-gray-200 rounded-lg text-sm"
                onClick={handleSelectAll}
                type="button"
              >Select All</button>
              <button
                className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm"
                disabled={!selectedIds.length}
                onClick={handleDeleteBulk}
                type="button"
              >Bulk Delete</button>
            </div>

            <div className="overflow-x-auto bg-white rounded-lg shadow border">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th />
                    <th className="text-left p-3 text-xs uppercase text-gray-500">Name</th>
                    <th className="text-left p-3 text-xs uppercase text-gray-500">Class</th>
                    <th className="text-left p-3 text-xs uppercase text-gray-500">House</th>
                    <th className="text-left p-3 text-xs uppercase text-gray-500">Student ID</th>
                    <th className="text-left p-3 text-xs uppercase text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((stu) => (
                    <tr key={stu._id} className="border-b">
                      <td className="px-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(stu._id)}
                          onChange={() => handleSelect(stu._id)}
                        />
                      </td>
                      <td className="p-3">{stu.name}</td>
                      <td className="p-3">{stu.class}</td>
                      <td className="p-3">{getHouseName(stu.house_id?._id || stu.house_id)}</td>
                      <td className="p-3">{stu.unique_id}</td>
                      <td className="p-3 flex gap-2">
                        <button
                          className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs"
                          onClick={() => handleEditStart(stu)}
                        >Edit</button>
                        <button
                          className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs"
                          onClick={() => handleDeleteSingle(stu._id)}
                        >Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {loading && (
                <div className="px-3 py-2 text-gray-500 text-center text-sm">Loading…</div>
              )}
            </div>
          </div>
        )}

        {/* ADD STUDENTS */}
        {activeTab === "add" && (
          <div className="space-y-8 max-w-2xl bg-white p-6 rounded-lg shadow-sm">
            {/* Add single */}
            <form className="space-y-3" onSubmit={handleAddSingle}>
              <h3 className="font-semibold">Add Single Student</h3>
              <select
                required
                value={addForm.house_id}
                onChange={e => setAddForm(f => ({ ...f, house_id: e.target.value }))}
                className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"
              >
                <option value="">Select house</option>
                {houses.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}
              </select>
              <input
                required
                type="text"
                placeholder="Name"
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-full"
              />
              <input
                required
                type="text"
                placeholder="Class"
                value={addForm.class}
                onChange={e => setAddForm(f => ({ ...f, class: e.target.value }))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-full"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-3 py-2 rounded w-full"
                disabled={loading}
              >Add Student</button>
            </form>
            {/* Add bulk */}
            <form className="space-y-3" onSubmit={handleBulkJson}>
              <h3 className="font-semibold">Bulk Add via JSON Paste</h3>
              <select
                required
                value={bulkHouse}
                onChange={e => setBulkHouse(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"
              >
                <option value="">Select house for this bulk</option>
                {houses.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}
              </select>
              <textarea
                required
                rows={7}
                placeholder='Paste students as JSON array, e.g. [{"NAME":"...","CLASS":"..."}]'
                value={bulkJson}
                onChange={e => setBulkJson(e.target.value)}
                className="block w-full border border-gray-200 rounded p-2 font-mono"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-3 py-2 rounded w-full"
                disabled={loading}
              >Bulk Add</button>
            </form>
          </div>
        )}

        {/* UPDATE STUDENT */}
        {activeTab === "update" && editingStudent && (
          <form className="max-w-xl bg-white p-6 rounded-lg shadow space-y-3" onSubmit={handleEditSave}>
            <h3 className="font-semibold mb-2">Edit Student</h3>
            <select
              required
              value={editingStudent.house_id}
              onChange={e => setEditingStudent(stu => ({ ...stu, house_id: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"
            >
              <option value="">House</option>
              {houses.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}
            </select>
            <input
              required
              type="text"
              value={editingStudent.name || ""}
              onChange={e => setEditingStudent(stu => ({ ...stu, name: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-full"
              placeholder="Name"
            />
            <input
              required
              type="text"
              value={editingStudent.class || ""}
              onChange={e => setEditingStudent(stu => ({ ...stu, class: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-full"
              placeholder="Class"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-3 py-2 rounded w-full"
              disabled={loading}
            >Save Changes</button>
            <button
              type="button"
              className="mt-2 w-full border px-3 py-2 rounded text-gray-600"
              onClick={() => { setEditingStudent(null); setActiveTab("all"); }}
            >Cancel</button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ManageStudents;
