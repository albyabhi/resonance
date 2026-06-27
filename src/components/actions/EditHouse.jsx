import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const EditHouse = () => {
  const { token, role, user, setUserHouse } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [groupId, setGroupId] = useState("");
  const [previewOk, setPreviewOk] = useState(true);

  const apiCall = async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body,
    });
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        setSuccess("");
        if (String(role || "").toLowerCase() !== "captain") throw new Error("Only captains can edit group details");

        // Use group data from auth context (user.house = captainGroup from login response)
        const groupData = user?.house;
        if (groupData?._id) {
          setGroupId(groupData._id);
          setName(groupData.name || "");
          setLogoUrl(groupData.logoUrl || "");
          setUserHouse(groupData);
        } else {
          throw new Error("No group assigned to this captain");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
  }, [token, role, user?.house?._id]);

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      if (!name.trim()) throw new Error("Group name is required");
      if (!groupId) throw new Error("Group ID not found");

      const payload = {
        name: name.trim(),
        logoUrl: typeof logoUrl === "string" ? logoUrl.trim() : "",
      };

      const updatedGroup = await apiCall(`/api/competition/groups/${groupId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setName(updatedGroup.name || "");
      setLogoUrl(updatedGroup.logoUrl || "");
      setUserHouse(updatedGroup);
      setSuccess("Group updated successfully.");
    } catch (err) {
      if (String(err.message || "").toLowerCase().includes("already exists")) {
        setError("Group name already exists. Choose a different name.");
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
        <h2 className="text-lg font-semibold theme-text-primary">Manage Group Logo</h2>
        <p className="text-sm theme-text-secondary">Update your group logo URL.</p>
      </div>

      {error && <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">{error}</div>}
      {success && <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">{success}</div>}

      {loading ? (
        <div className="text-sm theme-text-secondary">Loading...</div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="theme-panel mb-4 grid grid-cols-2 gap-4 rounded-lg p-3">
            <div>
              <p className="text-xs font-semibold uppercase theme-text-muted">Group Name</p>
              <p className="font-medium theme-text-primary">{name || "-"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase theme-text-muted">Group Code</p>
              <p className="font-medium theme-text-primary">{name ? name.substring(0, 3).toUpperCase() : "-"}</p>
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
                    alt="Group logo preview"
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
