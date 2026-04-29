import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

function ManageParticipants() {
  const { token } = useAuth();

  // UI states
  const [activeTab, setActiveTab] = useState("all"); // all | add | update
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Cached data
  const [houses, setHouses] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [editingParticipant, setEditingParticipant] = useState(null);

  // Filters
  const [filterHouse, setFilterHouse] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [search, setSearch] = useState("");

  // Selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Add single
  const [addForm, setAddForm] = useState({ name: "", class: "", house_id: "" });

  // Add bulk JSON
  const [bulkJson, setBulkJson] = useState("");
  const [bulkHouse, setBulkHouse] = useState("");

  // Unified API call
  const apiCall = async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body || undefined,
    });
  };

  // Initial: load houses
  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      setError("");
      try {
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

  // Load participants when filters/search change
  const fetchParticipants = async () => {
    setLoading(true);
    setError("");
    try {
      let url = "/api/participants?";
      if (filterHouse) url += `house_id=${filterHouse}&`;
      if (filterClass) url += `class=${encodeURIComponent(filterClass)}&`;
      if (search) url += `search=${encodeURIComponent(search)}&`;
      const { participants } = await apiCall(url);
      setParticipants(participants || []);
      setSelectedIds([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && activeTab === "all") fetchParticipants();
    // eslint-disable-next-line
  }, [token, activeTab, filterHouse, filterClass, search]);

  // Tabs
  const switchTab = (tab) => {
    setActiveTab(tab);
    setError("");
    setEditingParticipant(null);
    setAddForm({ name: "", class: "", house_id: "" });
    setBulkJson("");
    setBulkHouse("");
    if (tab === "all" && token) fetchParticipants();
  };

  // Add single
  const handleAddSingle = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { participant } = await apiCall("/api/participants", {
        method: "POST",
        body: JSON.stringify(addForm),
      });
      setAddForm({ name: "", class: "", house_id: "" });
      setParticipants((prev) => [participant, ...prev]);
      setActiveTab("all");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add bulk
  const handleBulkJson = async (e) => {
    e.preventDefault();
    if (!bulkJson.trim() || !bulkHouse) {
      setError("Paste JSON and select a house");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { inserted } = await apiCall("/api/participants/bulkJson", {
        method: "POST",
        body: JSON.stringify({ house_id: bulkHouse, json_text: bulkJson }),
      });
      setBulkJson("");
      setBulkHouse("");
      setActiveTab("all");
      fetchParticipants();
      alert(`Bulk added ${inserted} participants`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update
  const handleEditStart = (stu) => {
    setEditingParticipant({
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
      await apiCall(`/api/participants/${editingParticipant._id}`, {
        method: "PUT",
        body: JSON.stringify(editingParticipant),
      });
      setActiveTab("all");
      fetchParticipants();
      setEditingParticipant(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete
  const handleDeleteSingle = async (id) => {
    if (!window.confirm("Delete this participant?")) return;
    setLoading(true);
    setError("");
    try {
      await apiCall(`/api/participants/${id}`, { method: "DELETE" });
      setParticipants((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBulk = async () => {
    if (!selectedIds.length || !window.confirm("Delete selected participants?")) return;
    setLoading(true);
    setError("");
    try {
      await apiCall("/api/participants/bulk/remove", {
        method: "DELETE",
        body: JSON.stringify({ ids: selectedIds }),
      });
      fetchParticipants();
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
    setSelectedIds(participants.map((s) => s._id));
  };

  const handleDeselectAll = () => setSelectedIds([]);

  // Helpers
  const getHouseName = (id) =>
    (houses.find((h) => h._id === id) || {}).name || "";

  // Render
  return (
    <div className="min-h-dvh bg-gray-50 p-4">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
            Participant Management
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Manage all participants, classes, and house mapping
          </p>
        </div>

        {error && (
          <div
            className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-4"
            role="alert"
            aria-live="polite"
          >
            {error}
            <button
              onClick={() => setError("")}
              className="ml-2 text-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded"
            >
              ×
            </button>
          </div>
        )}

        {/* Tabs */}
        <div
          className="bg-white rounded-xl shadow-sm mb-4 p-1 flex"
          role="tablist"
          aria-label="Participant management views"
        >
          <button
            role="tab"
            aria-selected={activeTab === "all"}
            aria-controls="panel-all"
            id="tab-all"
            className={`flex-1 min-h-[44px] px-4 py-3 text-sm font-medium rounded-lg transition ${
              activeTab === "all"
                ? "bg-orange-600 text-white shadow"
                : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            } focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400`}
            onClick={() => switchTab("all")}
          >
            All Participants
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "add"}
            aria-controls="panel-add"
            id="tab-add"
            className={`flex-1 min-h-[44px] px-4 py-3 text-sm font-medium rounded-lg transition ${
              activeTab === "add"
                ? "bg-orange-600 text-white shadow"
                : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            } focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400`}
            onClick={() => switchTab("add")}
          >
            Add
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "update"}
            aria-controls="panel-update"
            id="tab-update"
            className={`flex-1 min-h-[44px] px-4 py-3 text-sm font-medium rounded-lg transition ${
              activeTab === "update"
                ? "bg-orange-600 text-white shadow"
                : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            } focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400`}
            disabled={!editingParticipant}
          >
            Update
          </button>
        </div>

        {/* ALL PARTICIPANTS */}
        {activeTab === "all" && (
          <section
            id="panel-all"
            role="tabpanel"
            aria-labelledby="tab-all"
            className="space-y-3"
          >
            {/* Filters / actions */}
            <div className="flex flex-wrap gap-2 mb-3">
              <label className="sr-only" htmlFor="filter-house">
                Filter by house
              </label>
              <select
                id="filter-house"
                value={filterHouse}
                onChange={(e) => setFilterHouse(e.target.value)}
                className="px-3 py-2 min-h-[44px] border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                <option value="">Filter by house</option>
                {houses.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.name}
                  </option>
                ))}
              </select>

              <label className="sr-only" htmlFor="filter-class">
                Filter by class
              </label>
              <input
                id="filter-class"
                type="text"
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                placeholder="Filter by class"
                className="px-3 py-2 min-h-[44px] border border-gray-200 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              />

              <label className="sr-only" htmlFor="search">
                Search participants
              </label>
              <input
                id="search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="px-3 py-2 min-h-[44px] border border-gray-200 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              />

              <button
                className="px-3 py-2 min-h-[44px] bg-gray-100 border border-gray-200 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                onClick={handleDeselectAll}
                type="button"
              >
                Clear Selection
              </button>
              <button
                className="px-3 py-2 min-h-[44px] bg-gray-100 border border-gray-200 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                onClick={handleSelectAll}
                type="button"
              >
                Select All
              </button>
              <button
                className="px-3 py-2 min-h-[44px] bg-red-600 text-white rounded-lg text-sm disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                disabled={!selectedIds.length}
                onClick={handleDeleteBulk}
                type="button"
              >
                Bulk Delete
              </button>
            </div>

            {/* Mobile-first list (cards) */}
            <ul className="space-y-2 sm:hidden" aria-label="Participants list">
              {participants.map((stu) => (
                <li
                  key={stu._id}
                  className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 break-words">
                        {stu.name}
                      </p>
                      <p className="text-xs text-gray-600">
                        Class:{" "}
                        <span className="font-medium">{stu.class}</span>
                      </p>
                      <p className="text-xs text-gray-600">
                        House:{" "}
                        <span className="font-medium">
                          {getHouseName(stu.house_id?._id || stu.house_id)}
                        </span>
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1">
                        ID: {stu.unique_id}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <input
                        aria-label={`Select ${stu.name}`}
                        type="checkbox"
                        className="h-5 w-5"
                        checked={selectedIds.includes(stu._id)}
                        onChange={() => handleSelect(stu._id)}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      className="flex-1 px-3 py-2 min-h-[44px] bg-orange-50 text-orange-700 border border-orange-200 rounded text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                      onClick={() => handleEditStart(stu)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="flex-1 px-3 py-2 min-h-[44px] bg-red-50 text-red-700 border border-red-200 rounded text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                      onClick={() => handleDeleteSingle(stu._id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
              {loading && (
                <li className="text-center text-sm text-gray-500 py-2">
                  Loading…
                </li>
              )}
            </ul>

            {/* Desktop/tablet table view */}
            <div className="hidden sm:block overflow-x-auto bg-white rounded-lg shadow border">
              <table className="min-w-full table-auto">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="w-10" />
                    <th scope="col" className="text-left p-3 text-xs uppercase text-gray-500">
                      Name
                    </th>
                    <th scope="col" className="text-left p-3 text-xs uppercase text-gray-500">
                      Class
                    </th>
                    <th scope="col" className="text-left p-3 text-xs uppercase text-gray-500">
                      House
                    </th>
                    <th scope="col" className="text-left p-3 text-xs uppercase text-gray-500">
                      Participant ID
                    </th>
                    <th scope="col" className="text-left p-3 text-xs uppercase text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((stu) => (
                    <tr key={stu._id} className="border-b">
                      <td className="px-3 align-middle">
                        <input
                          aria-label={`Select ${stu.name}`}
                          type="checkbox"
                          className="h-5 w-5"
                          checked={selectedIds.includes(stu._id)}
                          onChange={() => handleSelect(stu._id)}
                        />
                      </td>
                      <td className="p-3 align-middle">{stu.name}</td>
                      <td className="p-3 align-middle">{stu.class}</td>
                      <td className="p-3 align-middle">
                        {getHouseName(stu.house_id?._id || stu.house_id)}
                      </td>
                      <td className="p-3 align-middle">{stu.unique_id}</td>
                      <td className="p-3 align-middle">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="px-3 py-2 min-h-[40px] bg-orange-50 text-orange-700 border border-orange-200 rounded text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                            onClick={() => handleEditStart(stu)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="px-3 py-2 min-h-[40px] bg-red-50 text-red-700 border border-red-200 rounded text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                            onClick={() => handleDeleteSingle(stu._id)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {loading && (
                <div className="px-3 py-2 text-gray-500 text-center text-sm">
                  Loading…
                </div>
              )}
            </div>
          </section>
        )}

        {/* ADD PARTICIPANTS */}
        {activeTab === "add" && (
          <section
            id="panel-add"
            role="tabpanel"
            aria-labelledby="tab-add"
            className="space-y-8 max-w-2xl bg-white p-4 sm:p-6 rounded-lg shadow-sm"
          >
            {/* Add single */}
            <form className="space-y-3" onSubmit={handleAddSingle}>
              <h3 className="font-semibold">Add Single Participant</h3>
              <label className="sr-only" htmlFor="add-house">
                Select house
              </label>
              <select
                id="add-house"
                required
                value={addForm.house_id}
                onChange={(e) => setAddForm((f) => ({ ...f, house_id: e.target.value }))}
                className="px-3 py-2 min-h-[44px] border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                <option value="">Select house</option>
                {houses.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.name}
                  </option>
                ))}
              </select>
              <label className="sr-only" htmlFor="add-name">
                Name
              </label>
              <input
                id="add-name"
                required
                type="text"
                placeholder="Name"
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                className="px-3 py-2 min-h-[44px] border border-gray-200 rounded-lg text-sm w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              />
              <label className="sr-only" htmlFor="add-class">
                Class
              </label>
              <input
                id="add-class"
                required
                type="text"
                placeholder="Class"
                value={addForm.class}
                onChange={(e) => setAddForm((f) => ({ ...f, class: e.target.value }))}
                className="px-3 py-2 min-h-[44px] border border-gray-200 rounded-lg text-sm w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              />
              <button
                type="submit"
                className="bg-orange-600 text-white px-3 py-2 min-h-[44px] rounded w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:opacity-60"
                disabled={loading}
              >
                Add Participant
              </button>
            </form>

            {/* Add bulk */}
            <form className="space-y-3" onSubmit={handleBulkJson}>
              <h3 className="font-semibold">Bulk Add via JSON Paste</h3>
              <label className="sr-only" htmlFor="bulk-house">
                Select house for this bulk
              </label>
              <select
                id="bulk-house"
                required
                value={bulkHouse}
                onChange={(e) => setBulkHouse(e.target.value)}
                className="px-3 py-2 min-h-[44px] border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                <option value="">Select house for this bulk</option>
                {houses.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.name}
                  </option>
                ))}
              </select>
              <label className="sr-only" htmlFor="bulk-json">
                Paste participants as JSON array
              </label>
              <textarea
                id="bulk-json"
                required
                rows={7}
                placeholder='Paste participants as JSON array, e.g. [{"NAME":"...","CLASS":"..."}]'
                value={bulkJson}
                onChange={(e) => setBulkJson(e.target.value)}
                className="block w-full border border-gray-200 rounded p-2 font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              />
              <button
                type="submit"
                className="bg-orange-600 text-white px-3 py-2 min-h-[44px] rounded w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:opacity-60"
                disabled={loading}
              >
                Bulk Add
              </button>
            </form>
          </section>
        )}

        {/* UPDATE PARTICIPANT */}
        {activeTab === "update" && editingParticipant && (
          <section
            id="panel-update"
            role="tabpanel"
            aria-labelledby="tab-update"
            className="max-w-xl bg-white p-4 sm:p-6 rounded-lg shadow space-y-3"
          >
            <h3 className="font-semibold mb-2">Edit Participant</h3>
            <label className="sr-only" htmlFor="edit-house">
              House
            </label>
            <select
              id="edit-house"
              required
              value={editingParticipant.house_id}
              onChange={(e) =>
                setEditingParticipant((participant) => ({ ...participant, house_id: e.target.value }))
              }
              className="px-3 py-2 min-h-[44px] border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              <option value="">House</option>
              {houses.map((h) => (
                <option key={h._id} value={h._id}>
                  {h.name}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="edit-name">
              Name
            </label>
            <input
              id="edit-name"
              required
              type="text"
              value={editingParticipant.name || ""}
              onChange={(e) =>
                setEditingParticipant((participant) => ({ ...participant, name: e.target.value }))
              }
              className="px-3 py-2 min-h-[44px] border border-gray-200 rounded-lg text-sm w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              placeholder="Name"
            />
            <label className="sr-only" htmlFor="edit-class">
              Class
            </label>
            <input
              id="edit-class"
              required
              type="text"
              value={editingParticipant.class || ""}
              onChange={(e) =>
                setEditingParticipant((participant) => ({ ...participant, class: e.target.value }))
              }
              className="px-3 py-2 min-h-[44px] border border-gray-200 rounded-lg text-sm w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              placeholder="Class"
            />
            <button
              type="submit"
              onClick={handleEditSave}
              className="bg-orange-600 text-white px-3 py-2 min-h-[44px] rounded w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:opacity-60"
              disabled={loading}
            >
              Save Changes
            </button>
            <button
              type="button"
              className="mt-2 w-full border px-3 py-2 min-h-[44px] rounded text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              onClick={() => {
                setEditingParticipant(null);
                setActiveTab("all");
              }}
            >
              Cancel
            </button>
          </section>
        )}
      </div>
    </div>
  );
}

export default ManageParticipants;
