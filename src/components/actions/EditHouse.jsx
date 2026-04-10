import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const EditHouse = () => {
  const { token, role, setUserHouse } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        setSuccess("");
        if (String(role || "").toLowerCase() !== "captain") throw new Error("Only captains can edit house details");
        const { house } = await apiCall("/api/house/me");
        setName(house.name || "");
        setCode(house.code || "");
        setUserHouse(house);
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
      if (!name.trim()) throw new Error("House name is required");
      if (!code.trim()) throw new Error("House code is required");

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
      setSuccess("House updated successfully.");
    } catch (err) {
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
    <div className="theme-card p-4">
      <div className="mb-3">
        <h2 className="text-lg font-semibold theme-text-primary">Manage House Logo</h2>
        <p className="text-sm theme-text-secondary">Update your house logo URL.</p>
      </div>

      {error && <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">{error}</div>}
      {success && <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">{success}</div>}

      {loading ? (
        <div className="text-sm theme-text-secondary">Loading...</div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="theme-panel mb-4 grid grid-cols-2 gap-4 rounded-lg p-3">
            <div>
              <p className="text-xs font-semibold uppercase theme-text-muted">House Name</p>
              <p className="font-medium theme-text-primary">{name || "-"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase theme-text-muted">House Code</p>
              <p className="font-medium theme-text-primary">{code || "-"}</p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium theme-text-secondary">
              Logo URL <span className="theme-text-muted">(optional)</span>
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="theme-input px-3 py-2"
            />
            {logoUrl ? (
              <div className="mt-2">
                <div className="mb-1 text-xs theme-text-secondary">Preview</div>
                <div className={`theme-panel flex h-28 w-28 items-center justify-center overflow-hidden rounded-lg border ${previewOk ? "" : "border-rose-300 dark:border-rose-500/30"}`}>
                  <img
                    src={logoUrl}
                    alt="House logo preview"
                    className="h-full w-full object-contain"
                    onError={() => setPreviewOk(false)}
                    onLoad={() => setPreviewOk(true)}
                  />
                </div>
                {!previewOk && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">Failed to load image. Check the URL.</p>}
              </div>
            ) : null}
          </div>

          <div className="pt-2">
            <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default EditHouse;
