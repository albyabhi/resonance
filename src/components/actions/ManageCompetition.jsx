import React, { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { useCompetition } from "../../context/CompetitionContext";
import { FadeIn } from "../AnimateReveal";
import { Settings, Shield, Edit3, Globe, Lock, AlertCircle, Copy, Check } from "lucide-react";
import { apiJson } from "../../utils/apiClient";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const competitionTypes = [
  { value: "school_houses", label: "School Houses" },
  { value: "college_departments", label: "College Departments" },
  { value: "inter_school", label: "Inter-School" },
  { value: "inter_college", label: "Inter-College" },
  { value: "sports_meet", label: "Sports Meet" },
  { value: "custom", label: "Custom Group Type" },
];

export default function ManageCompetition() {
  const { token } = useAuth();
  const { competition, setCompetition } = useCompetition();
  
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    year: "",
    is_public: false,
    participant_source: "import",
    type: "school_houses",
    group_label: "",
    logo: null,
    removeLogo: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (competition) {
      setFormData({
        name: competition.name || "",
        slug: competition.slug || "",
        year: competition.year || "",
        is_public: competition.is_public || false,
        participant_source: competition.participant_source || "import",
        type: competition.type || "school_houses",
        group_label: competition.group_label || ""
      });
    }
  }, [competition]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (!competition?._id) throw new Error("No active competition");
      
      const fd = new FormData();
      fd.append('name', formData.name);
      fd.append('slug', formData.slug);
      fd.append('year', formData.year);
      fd.append('is_public', formData.is_public);
      fd.append('participant_source', formData.participant_source);
      fd.append('type', formData.type);
      if (formData.type === "custom") {
        fd.append('group_label', formData.group_label);
      }
      if (formData.logo) {
        fd.append('logo', formData.logo);
      }
      if (formData.removeLogo) {
        fd.append('removeLogo', 'true');
      }

      const response = await apiJson(`${API_BASE_URL}/api/competition/${competition._id}`, {
        method: "PATCH",
        body: fd
      });

      if (response && response.competition) {
        setCompetition(response.competition);
        setSuccess("Competition setup successfully updated!");
      } else {
        throw new Error("Failed to receive updated state");
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!competition) {
    return (
      <div className="p-10 text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-slate-400">
          No Active Competition Found
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-100 dark:border-white/5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white font-heading">
              Manage Competition
            </h2>
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-[0.3em] leading-none pl-7">Update global parameters</p>
        </div>
      </header>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-2xl flex items-center gap-4 text-rose-600 dark:text-rose-400 shadow-soft animate-in slide-in-from-top-2">
          <Shield className="w-5 h-5 shrink-0" />
          <p className="text-xs font-bold uppercase tracking-widest leading-none">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl flex items-center gap-4 text-emerald-600 dark:text-emerald-400 shadow-soft animate-in slide-in-from-top-2">
          <Globe className="w-5 h-5 shrink-0" />
          <p className="text-xs font-bold uppercase tracking-widest leading-none">{success}</p>
        </div>
      )}

      <FadeIn className="max-w-2xl mx-auto">
        <div className="card-premium p-10 bg-white dark:bg-[#111827] space-y-8 relative overflow-hidden shadow-2xl border border-slate-100 dark:border-white/5 rounded-3xl">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <Settings className="w-40 h-40 text-indigo-500" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Competition Settings</h3>
            <p className="text-sm font-medium text-slate-500">Modify global properties such as identifiers and visibility states.</p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-300">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Share Public URL</p>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">
                {window.location.origin}/view/{competition.slug}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/view/${competition.slug}`);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 shadow-sm transition-all cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span className="text-xs font-bold uppercase tracking-wider">{copied ? "Copied!" : "Copy Link"}</span>
            </button>
          </div>

          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Competition Name</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Annual Sports Meet"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-900 dark:text-white transition-all focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">URL Slug</label>
                <input
                  required
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="e.g. annual-sports"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-900 dark:text-white transition-all focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Competition Logo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFormData({ ...formData, logo: e.target.files[0], removeLogo: false });
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-900 dark:text-white transition-all focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>

              {competition?.logoUrl && (
                <div className="space-y-2 flex flex-col justify-end">
                  <div className="flex items-center gap-4">
                    <img src={competition.logoUrl} alt="Logo Preview" className="h-12 w-12 object-contain rounded-lg border border-slate-200 dark:border-white/10" />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, removeLogo: !formData.removeLogo, logo: null })}
                      className={`py-2 px-4 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        formData.removeLogo
                          ? "bg-rose-500 text-white border-rose-500"
                          : "border-rose-200 dark:border-rose-500/30 bg-rose-50/50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-50"
                      }`}
                    >
                      {formData.removeLogo ? "Will be removed" : "Remove Logo"}
                    </button>
                  </div>
                </div>
              )}
            </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Year</label>
                <input
                  required
                  type="text"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  placeholder="e.g. 2026"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-900 dark:text-white transition-all focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Competition Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full appearance-none bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-900 dark:text-white transition-all focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                >
                  {competitionTypes.map((type) => (
                    <option key={type.value} value={type.value} className="bg-white dark:bg-[#0B1220]">{type.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {formData.type === "custom" && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Custom Group Label</label>
                <input
                  required={formData.type === "custom"}
                  type="text"
                  value={formData.group_label}
                  onChange={(e) => setFormData({ ...formData, group_label: e.target.value })}
                  placeholder="e.g. Cluster"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-900 dark:text-white transition-all focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Visibility</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_public: true })}
                  className={`flex items-center justify-center gap-2 py-4 px-5 rounded-2xl border transition-all ${
                    formData.is_public
                      ? "bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-md font-bold"
                      : "border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#111827] text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-white/5"
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wider">Public View</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_public: false })}
                  className={`flex items-center justify-center gap-2 py-4 px-5 rounded-2xl border transition-all ${
                    !formData.is_public
                      ? "bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-md font-bold"
                      : "border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#111827] text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-white/5"
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wider">Private Access</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Participant Source</label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-1">Controls how participants are created and managed.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { value: "import", label: "Admin Only", desc: "Admin imports participants" },
                  { value: "captain", label: "Captain", desc: "Captains create participants" },
                  { value: "self", label: "Self Reg", desc: "Participants self-register" },
                  { value: "hybrid", label: "Hybrid", desc: "Admin + Claim + Captains" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, participant_source: opt.value })}
                    className={`flex flex-col items-center justify-center gap-1 py-3 px-3 rounded-2xl border transition-all text-center ${
                      formData.participant_source === opt.value
                        ? "bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-md font-bold"
                        : "border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#111827] text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <span className="text-xs uppercase tracking-wider font-bold">{opt.label}</span>
                    <span className="text-[9px] opacity-70 leading-tight">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-8 flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50"
              >
                {loading ? "Saving Changes..." : "Save Configuration"}
              </button>
            </div>
          </form>
        </div>
      </FadeIn>
    </div>
  );
}
