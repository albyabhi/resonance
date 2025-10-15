// src/components/ManageHouse.jsx
import React, { useState, useEffect, useRef } from "react";
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
    logoUrl: "", // fallback/manual URL
  });

  // Local file state for uploads
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const fileInputRef = useRef(null);

  const [editingHouseId, setEditingHouseId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Unified API call (JSON by default)
  const apiCall = async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");

    const isFormData = options.body instanceof FormData;
    const headers = {
      Authorization: `Bearer ${token}`,
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    };

    const config = { ...options, headers };
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

  // Build request payload depending on whether a file is selected
  const buildPayload = () => {
    if (logoFile) {
      const fd = new FormData();
      fd.append("name", formData.name);
      fd.append("code", formData.code);
      if (formData.captainUserId)
        fd.append("captainUserId", formData.captainUserId);
      // File field name must match Multer .single("logo") on the server
      fd.append("logo", logoFile);
      return fd;
    }
    // JSON fallback (also used for explicit logo removal)
    return JSON.stringify({
      name: formData.name,
      code: formData.code,
      captainUserId: formData.captainUserId || undefined,
      logoUrl: formData.logoUrl, // "" will instruct server to remove logo
    });
  };

  // Add or edit house
  const handleAddOrEditHouse = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");

      const body = buildPayload();
      const isFormData = body instanceof FormData;

      if (editingHouseId) {
        const updated = await apiCall(`/api/house/${editingHouseId}`, {
          method: "PUT",
          body,
        });
        setHouses(houses.map((h) => (h._id === editingHouseId ? updated : h)));
        setEditingHouseId(null);
      } else {
        const created = await apiCall("/api/house", {
          method: "POST",
          body,
        });
        setHouses([created, ...houses]);
      }

      resetForm();
      setActiveTab("manage");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", code: "", captainUserId: "", logoUrl: "" });
    setLogoFile(null);
    setLogoPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = null; // allow re-selecting same file
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

  const handleInputChange = (inputValue) => {
    if (inputValue.length >= 3) fetchCaptainOptions(inputValue);
    else setCaptainOptions([]);
    return inputValue;
  };

  const handleEdit = (house) => {
    setFormData({
      name: house.name,
      code: house.code,
      captainUserId: house.captain?._id || "",
      logoUrl: house.logoUrl || "",
    });
    setLogoFile(null);
    setLogoPreview(house.logoUrl || "");
    if (fileInputRef.current) fileInputRef.current.value = null;
    setEditingHouseId(house._id);
    setActiveTab("add");
  };

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

  // File selection handlers
  const onLogoFileChange = (e) => {
    const file = e.target.files?.[0];
    setLogoFile(file || null);
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoPreview(url);
      // When a file is chosen, ignore manual URL
      setFormData((prev) => ({ ...prev, logoUrl: "" }));
    } else {
      setLogoPreview("");
    }
  };

  const removeSelectedLogo = () => {
    setLogoFile(null);
    setLogoPreview("");
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  // Explicitly request server-side logo removal
  const markLogoForRemoval = () => {
    removeSelectedLogo();
    setFormData((prev) => ({ ...prev, logoUrl: "" })); // server interprets "" as delete
  };

  return (
    <div className="min-h-dvh bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
            House Management
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Manage houses and captains
          </p>
        </div>

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

        <div
          className="bg-white rounded-xl shadow-sm mb-4 p-1 flex"
          role="tablist"
          aria-label="House management views"
        >
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
              resetForm();
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
              resetForm();
            }}
          >
            {editingHouseId ? "Edit House" : "Add House"}
          </button>
        </div>

        {activeTab === "manage" && (
          <section
            id="panel-manage"
            role="tabpanel"
            aria-labelledby="tab-manage"
            className="space-y-3"
          >
            <div className="md:hidden space-y-3">
              {houses.length === 0 ? (
                <div className="text-gray-600">No houses found</div>
              ) : (
                houses.map((house) => (
                  <div
                    key={house._id}
                    className="bg-white rounded-xl shadow-sm p-4"
                  >
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
                            <p className="font-medium">
                              {house.captain?.name || "-"}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-gray-500">Logo</p>
                            {house.logoUrl ? (
                              <img
                                src={house.logoUrl}
                                alt={`${house.name} logo`}
                                className="mt-1 h-12 w-12 rounded object-cover border border-gray-200"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <p className="font-medium">-</p>
                            )}
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

            <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700">
                        Name
                      </th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700">
                        Code
                      </th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700">
                        Captain
                      </th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700">
                        Logo URL
                      </th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {houses.map((house) => (
                      <tr
                        key={house._id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="p-4 text-gray-900">{house.name}</td>
                        <td className="p-4 text-gray-900">{house.code}</td>
                        <td className="p-4 text-gray-900">
                          {house.captain?.name || "-"}
                        </td>
                        <td className="p-4 text-gray-900">
                          {house.logoUrl ? (
                            <img
                              src={house.logoUrl}
                              alt={`${house.name} logo`}
                              className="h-10 w-10 rounded object-cover border border-gray-200"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            "-"
                          )}
                        </td>
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

        {activeTab === "add" && (
          <section
            id="panel-add"
            role="tabpanel"
            aria-labelledby="tab-add"
            className="bg-white rounded-xl shadow-sm p-4 md:p-6 max-w-md mx-auto"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingHouseId ? "Edit House" : "Add New House"}
            </h2>
            <form onSubmit={handleAddOrEditHouse} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  House Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 min-h-[44px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Atlas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Code
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  className="w-full px-4 py-3 min-h-[44px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., ATL"
                />
              </div>

              {editingHouseId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign Captain
                  </label>
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
                        ? captainOptions.find(
                            (c) => c.value === formData.captainUserId
                          ) || {
                            value: formData.captainUserId,
                            label: "Loading...",
                          }
                        : null
                    }
                    placeholder="Assign Captain"
                    isClearable
                    styles={{
                      control: (base) => ({
                        ...base,
                        minHeight: 44,
                        borderColor: "#e5e7eb",
                        boxShadow: "none",
                      }),
                      valueContainer: (base) => ({
                        ...base,
                        padding: "4px 8px",
                      }),
                    }}
                  />
                </div>
              )}

              {/* Logo controls */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Logo
                </label>

                {/* File picker */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  onChange={onLogoFileChange}
                  className="block w-full text-sm text-gray-900 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />

                {/* Preview + actions */}
                {(logoPreview || formData.logoUrl) && (
                  <div className="flex items-center gap-3">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-12 w-12 rounded object-cover border border-gray-200"
                      />
                    ) : formData.logoUrl ? (
                      <img
                        src={formData.logoUrl}
                        alt="Current logo"
                        className="h-12 w-12 rounded object-cover border border-gray-200"
                      />
                    ) : null}

                    <div className="flex gap-2">
                      {logoFile && (
                        <button
                          type="button"
                          onClick={removeSelectedLogo}
                          className="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                        >
                          Clear selected
                        </button>
                      )}
                      {(formData.logoUrl || logoPreview) && (
                        <button
                          type="button"
                          onClick={markLogoForRemoval}
                          className="px-3 py-2 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          Remove logo
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Manual URL fallback when no file selected */}
                {!logoFile && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Or paste a logo URL
                    </label>
                    <input
                      type="text"
                      value={formData.logoUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, logoUrl: e.target.value })
                      }
                      className="w-full px-4 py-3 min-h-[44px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/logo.png"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      If a file is selected, the URL will be ignored.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("manage");
                    setEditingHouseId(null);
                    resetForm();
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
                  {loading
                    ? "Saving..."
                    : editingHouseId
                    ? "Update House"
                    : "Add House"}
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
