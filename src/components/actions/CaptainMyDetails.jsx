import React, { useState, useEffect } from "react";
import { Upload, RotateCcw, Save, AlertCircle, CheckCircle } from "lucide-react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";
import usePermission from "../../hooks/usePermission";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

export default function CaptainMyDetails() {
  const { token } = useAuth();
  const { hasPermission } = usePermission();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneVisible, setPhoneVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [currentImage, setCurrentImage] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await apiJson(`${API_BASE_URL}/api/captain/me`, {
          headers: { "Content-Type": "application/json" },
        });

        const captain = data.captain;
        setName(captain.name || "");
        setPhone(captain.phone || "");
        setPhoneVisible(captain.phone_visible || false);
        setCurrentImage(captain.profile_image || null);
      } catch (err) {
        setError(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    if (token && hasPermission("manage_own_group_profile")) loadProfile();
  }, [token, hasPermission]);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image size must be less than 2MB");
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (event) => setImagePreview(event.target?.result);
    reader.readAsDataURL(file);
    setError("");
  };

  const handleResetImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("phone", phone.trim() || "");
      formData.append("phone_visible", phoneVisible);

      if (selectedImage) formData.append("profile_image", selectedImage);

      const data = await apiJson(`${API_BASE_URL}/api/captain/me`, {
        method: "PUT",
        body: formData,
      });

      const updatedCaptain = data.captain;
      setName(updatedCaptain.name);
      setPhone(updatedCaptain.phone || "");
      setPhoneVisible(updatedCaptain.phone_visible);
      setCurrentImage(updatedCaptain.profile_image || null);
      setSelectedImage(null);
      setImagePreview(null);
      setSuccess("Profile updated successfully.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token || !hasPermission("manage_own_group_profile")) {
    return (
      <div className="theme-card">
        <div className="text-center theme-text-secondary">Access denied. Only captains can view this page.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="theme-card">
        <div className="text-center theme-text-secondary">Loading your profile...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="theme-card">
        <h1 className="mb-6 text-3xl font-semibold theme-text-primary">My Details</h1>

        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium theme-text-secondary">
              Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              required
              className="theme-input px-4 py-2 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-900"
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label htmlFor="phone" className="mb-2 block text-sm font-medium theme-text-secondary">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={submitting}
              className="theme-input px-4 py-2 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-900"
              placeholder="Enter your phone number"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              id="phone_visible"
              type="checkbox"
              checked={phoneVisible}
              onChange={(e) => setPhoneVisible(e.target.checked)}
              disabled={submitting}
              className="h-4 w-4 rounded text-indigo-600 focus:ring-2 focus:ring-indigo-500"
            />
            <label htmlFor="phone_visible" className="text-sm font-medium theme-text-secondary">
              Make phone number visible to others
            </label>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium theme-text-secondary">Profile Picture</label>

            {(imagePreview || currentImage) && (
              <div className="mb-4">
                <div className="theme-panel relative mx-auto mb-4 h-32 w-32 overflow-hidden rounded-lg">
                  <img src={imagePreview || currentImage} alt="Profile preview" className="h-full w-full object-cover" />
                </div>
                {imagePreview && <p className="mb-3 text-center text-xs theme-text-secondary">New image selected (not saved yet)</p>}
              </div>
            )}

            <div className="flex gap-2">
              <label className="flex-1">
                <input type="file" accept="image/*" onChange={handleImageSelect} disabled={submitting} className="hidden" />
                <div className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20">
                  <Upload className="h-4 w-4" />
                  <span>Choose Image</span>
                </div>
              </label>

              {selectedImage && (
                <button
                  type="button"
                  onClick={handleResetImage}
                  disabled={submitting}
                  className="theme-panel flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium theme-text-secondary transition hover:bg-gray-200 dark:hover:bg-gray-800"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <p className="mt-2 text-xs theme-text-secondary">Supported formats: PNG, JPG, WebP. Max size: 2MB</p>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting || loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
