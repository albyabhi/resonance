// src/components/actions/EditHouse.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const EditHouse = () => {
  const { token, role ,setUserHouse  } = useAuth(); // should be "captain"
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [houseId, setHouseId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const [previewOk, setPreviewOk] = useState(true);

  const apiCall = async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
      body: options.body,
    });
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

  // Load current house
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        setSuccess("");
        if (String(role || "").toLowerCase() !== "captain") {
          throw new Error("Only captains can edit house details");
        }
        const { house } = await apiCall("/api/house/me");
        setHouseId(house._id);
        setName(house.name || "");
        setCode(house.code || "");
        
       setUserHouse(house); // update AuthContext user.house


        setLogoUrl(house.logoUrl || "");
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
  }, [token, role]);

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (!name.trim()) {
        throw new Error("House name is required");
      }
      if (!code.trim()) {
        throw new Error("House code is required");
      }

      const payload = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        logoUrl: typeof logoUrl === "string" ? logoUrl.trim() : "",
      };

      const { house } = await apiCall("/api/house/me", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setName(house.name || "");
      setCode(house.code || "");
      setLogoUrl(house.logoUrl || "");
      setSuccess("House updated successfully");
    } catch (err) {
      // Show specific conflict message if any
      if (String(err.message || "").toLowerCase().includes("code already exists")) {
        setError("House code already exists. Choose a different code.");
      } else {
        setError(err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-gray-900">Edit House</h2>
        <p className="text-sm text-gray-600">
          Update house name, code, and optional logo URL
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-3">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg mb-3">
          {success}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-600">Loading…</div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              House Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter house name"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              House Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter house code (unique)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
            />
            <p className="text-xs text-gray-500 mt-1">
              Code must be unique (e.g., PHX, AQL).
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Logo URL <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {logoUrl ? (
              <div className="mt-2">
                <div className="text-xs text-gray-500 mb-1">Preview</div>
                <div className={`w-28 h-28 border rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center ${previewOk ? "" : "border-red-300"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoUrl}
                    alt="House logo preview"
                    className="object-contain w-full h-full"
                    onError={() => setPreviewOk(false)}
                    onLoad={() => setPreviewOk(true)}
                  />
                </div>
                {!previewOk && (
                  <p className="text-xs text-red-600 mt-1">
                    Failed to load image. Check the URL.
                  </p>
                )}
              </div>
            ) : null}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default EditHouse;
