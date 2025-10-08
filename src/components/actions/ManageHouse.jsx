// src/components/ManageHouse.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import Select from "react-select";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const ManageHouse = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("manage");
  const [houses, setHouses] = useState([]);
  const [captainOptions, setCaptainOptions] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    captainUserId: "",
    logoUrl: "",
  });
  const [editingHouseId, setEditingHouseId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Unified API call function
  const apiCall = async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");

    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
      ...options,
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

  // Fetch all houses
  const fetchHouses = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await apiCall("/api/house");
      setHouses(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchHouses();
  }, [token]);

  // Add or edit house
  const handleAddOrEditHouse = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");

      if (editingHouseId) {
        const updated = await apiCall(`/api/house/${editingHouseId}`, {
          method: "PUT",
          body: JSON.stringify(formData),
        });
        setHouses(houses.map((h) => (h._id === editingHouseId ? updated : h)));
        setEditingHouseId(null);
      } else {
        const created = await apiCall("/api/house", {
          method: "POST",
          body: JSON.stringify(formData),
        });
        setHouses([created, ...houses]);
      }

      setFormData({ name: "", code: "", captainUserId: "", logoUrl: "" });
      setActiveTab("manage");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCaptainOptions = async (input) => {
    if (!input || !token) return setCaptainOptions([]);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/users/search?name=${encodeURIComponent(input)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        console.error("Fetch error", res.status, await res.text());
        return setCaptainOptions([]);
      }
      const data = await res.json();
      setCaptainOptions(
        Array.isArray(data.users)
          ? data.users.map((u) => ({ value: u._id, label: u.name }))
          : []
      );
    } catch (err) {
      console.error(err);
      setCaptainOptions([]);
    }
  };

  // Edit form
  const handleEdit = (house) => {
    setFormData({
      name: house.name,
      code: house.code,
      captainUserId: house.captain?._id || "",
      logoUrl: house.logoUrl || "",
    });
    setEditingHouseId(house._id);
    setActiveTab("add");
  };

  // Delete house
  const handleDelete = async (houseId) => {
    if (!window.confirm("Are you sure you want to delete this house?")) return;
    try {
      setLoading(true);
      await apiCall(`/api/house/${houseId}`, { method: "DELETE" });
      setHouses(houses.filter((h) => h._id !== houseId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (inputValue) => {
    if (inputValue.length >= 3) fetchCaptainOptions(inputValue);
    else setCaptainOptions([]);
    return inputValue; // react-select expects this
    // Note: react-select handles its own ARIA; keep the visual height large enough for touch.
  };

  return (
    <div className="min-h-dvh bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
            House Management
          </h1>
          <p className="text-gray-600 text-sm md:text-base">Manage houses and captains</p>
        </div>

        {/* Error */}
        {error && (
          <div
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4"
            role="alert"
            aria-live="polite"
          >
            {error}
            <button
              onClick={() => setError("")}
              className="ml-2 text-red-500 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded"
            >
              ×
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm mb-4 p-1 flex" role="tablist" aria-label="House management views">
          <button
            role="tab"
            aria-selected={activeTab === "manage"}
            aria-controls="panel-manage"
            id="tab-manage"
            className={`flex-1 min-h-[44px] px-4 py-3 text-sm md:text-base font-medium rounded-lg transition ${
              activeTab === "manage"
                ? "bg-blue-600 text-white shadow"
                : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            } focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400`}
            onClick={() => {
              setActiveTab("manage");
              setEditingHouseId(null);
              setFormData({
                name: "",
                code: "",
                captainUserId: "",
                logoUrl: "",
              });
            }}
          >
            Manage Houses
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "add"}
            aria-controls="panel-add"
            id="tab-add"
            className={`flex-1 min-h-[44px] px-4 py-3 text-sm md:text-base font-medium rounded-lg transition ${
              activeTab === "add"
                ? "bg-blue-600 text-white shadow"
                : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            } focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400`}
            onClick={() => {
              setActiveTab("add");
              setEditingHouseId(null);
              setFormData({
                name: "",
                code: "",
                captainUserId: "",
                logoUrl: "",
              });
            }}
          >
            {editingHouseId ? "Edit House" : "Add House"}
          </button>
        </div>

        {/* Manage Houses */}
        {activeTab === "manage" && (
          <section id="panel-manage" role="tabpanel" aria-labelledby="tab-manage" className="space-y-3">
            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {houses.length === 0 ? (
                <div className="text-gray-600">No houses found</div>
              ) : (
                houses.map((house) => (
                  <div key={house._id} className="bg-white rounded-xl shadow-sm p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-500">Name</p>
                        <h3 className="text-base font-semibold text-gray-900 break-words">
                          {house.name}
                        </h3>
                        <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500">Code</p>
                            <p className="font-medium">{house.code}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Captain</p>
                            <p className="font-medium">{house.captain?.name || "-"}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-gray-500">Logo URL</p>
                            <p className="font-medium break-all">{house.logoUrl || "-"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleEdit(house)}
                        className="flex-1 px-3 py-2 min-h-[44px] bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(house._id)}
                        className="flex-1 px-3 py-2 min-h-[44px] bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop/table view */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700">Name</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700">Code</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700">Captain</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700">Logo URL</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {houses.map((house) => (
                      <tr key={house._id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4 text-gray-900">{house.name}</td>
                        <td className="p-4 text-gray-900">{house.code}</td>
                        <td className="p-4 text-gray-900">{house.captain?.name || "-"}</td>
                        <td className="p-4 text-gray-900">{house.logoUrl || "-"}</td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(house)}
                              className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(house._id)}
                              className="px-3 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {houses.length === 0 && (
                      <tr>
                        <td className="p-4 text-gray-600">No houses found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Add/Edit House Form */}
        {activeTab === "add" && (
          <section id="panel-add" role="tabpanel" aria-labelledby="tab-add" className="bg-white rounded-xl shadow-sm p-4 md:p-6 max-w-md mx-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingHouseId ? "Edit House" : "Add New House"}
            </h2>
            <form onSubmit={handleAddOrEditHouse} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">House Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 min-h-[44px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Atlas"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Code</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-4 py-3 min-h-[44px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., ATL"
                />
              </div>

              {editingHouseId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assign Captain</label>
                  <Select
                    options={captainOptions}
                    onInputChange={handleInputChange}
                    onChange={(selectedOption) =>
                      setFormData({
                        ...formData,
                        captainUserId: selectedOption?.value || "",
                      })
                    }
                    value={
                      formData.captainUserId
                        ? captainOptions.find((c) => c.value === formData.captainUserId) || {
                            value: formData.captainUserId,
                            label: "Loading...",
                          }
                        : null
                    }
                    placeholder="Assign Captain"
                    isClearable
                    // Make react-select more touch friendly via styles prop if desired
                    styles={{
                      control: (base) => ({
                        ...base,
                        minHeight: 44,
                        borderColor: "#e5e7eb",
                        boxShadow: "none",
                      }),
                      valueContainer: (base) => ({ ...base, padding: "4px 8px" }),
                    }}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo URL <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  className="w-full px-4 py-3 min-h-[44px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("manage");
                    setEditingHouseId(null);
                    setFormData({ name: "", code: "", captainUserId: "", logoUrl: "" });
                  }}
                  className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  {loading ? "Saving..." : editingHouseId ? "Update House" : "Add House"}
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    </div>
  );
};

export default ManageHouse;
