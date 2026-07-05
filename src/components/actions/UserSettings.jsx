// src/components/actions/UserSettings.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { apiFetch } from "../../utils/apiClient";
import { User, Mail, Lock, Camera, Shield, CheckCircle } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

export default function UserSettings() {
  const { user, token, setUserData } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(user?.profile_image || null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPreviewUrl(user.profile_image || null);
    }
  }, [user]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("File size must be less than 2MB");
        return;
      }
      setProfileImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      if (password) {
        formData.append("password", password);
      }
      if (profileImage) {
        formData.append("profile_image", profileImage);
      }

      const response = await apiFetch(`${API_BASE_URL}/api/users/profile`, {
        method: "PUT",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update profile");
      }

      // Update AuthContext state
      setUserData({
        name: data.user.name,
        email: data.user.email,
        profile_image: data.user.profile_image,
      });

      setSuccess("Profile updated successfully!");
      setPassword(""); // Clear password field
      setProfileImage(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card-premium p-10 space-y-8 relative overflow-hidden" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}>
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <User className="w-32 h-32 text-indigo-500" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Profile Settings</h3>
          <p className="text-sm font-medium text-slate-500">Update your account information.</p>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-2xl flex items-center gap-4 text-rose-600 dark:text-rose-400 shadow-soft">
            <Shield className="w-5 h-5 shrink-0" />
            <p className="text-xs font-bold uppercase tracking-widest leading-none">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl flex items-center gap-4 text-emerald-600 dark:text-emerald-400 shadow-soft">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <p className="text-xs font-bold uppercase tracking-widest leading-none">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Image Upload */}
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative group">
              <div className="h-24 w-24 rounded-full border-2 flex items-center justify-center overflow-hidden shadow-xl shadow-indigo-500/5" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)' }}>
                {previewUrl ? (
                  <img src={previewUrl} alt="Avatar Preview" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-slate-400" />
                )}
              </div>
              <label 
                htmlFor="avatar-upload" 
                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-all duration-200"
              >
                <Camera className="w-6 h-6 text-white" />
              </label>
              <input 
                id="avatar-upload" 
                type="file" 
                accept="image/*" 
                onChange={handleImageChange} 
                className="hidden" 
              />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Change Node Avatar</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <User className="w-3.5 h-3.5" /> Name
              </label>
              <input 
                required 
                value={name} 
                onChange={e => setName(e.target.value)}
                placeholder="Full name"
                className="w-full border rounded-2xl px-5 py-3.5 text-sm font-bold transition-all focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" /> Email (Node Key)
              </label>
              <input 
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                type="email"
                className="w-full border rounded-2xl px-5 py-3.5 text-sm font-bold transition-all focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" /> Password (Leave blank to keep current)
            </label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              placeholder="New password (min 6 chars)"
              className="w-full border rounded-2xl px-5 py-3.5 text-sm font-bold transition-all focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
            />
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50"
            >
              {loading ? "Updating..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
