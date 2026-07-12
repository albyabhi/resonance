import React, { useState, useEffect } from "react";
import { useCompetition } from "../../context/CompetitionContext";
import { FadeIn } from "../AnimateReveal";
import { Settings, Shield, Globe, Lock, AlertCircle, Copy, Check } from "lucide-react";
import { apiJson } from "../../utils/apiClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

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
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          No Active Competition Found
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-accent-blue" />
            <h2 className="text-3xl font-semibold tracking-tight text-card-foreground font-heading">
              Manage Competition
            </h2>
          </div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider leading-none pl-7">Update global parameters</p>
        </div>
      </header>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-4 text-destructive animate-in slide-in-from-top-2">
          <Shield className="w-5 h-5 shrink-0" />
          <p className="text-xs font-bold uppercase tracking-widest leading-none">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-4 text-emerald-600 dark:text-emerald-400 animate-in slide-in-from-top-2">
          <Globe className="w-5 h-5 shrink-0" />
          <p className="text-xs font-bold uppercase tracking-widest leading-none">{success}</p>
        </div>
      )}

      <FadeIn className="max-w-2xl mx-auto">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <Settings className="w-40 h-40 text-accent-blue" />
          </div>

          <CardHeader>
            <CardTitle>Competition Settings</CardTitle>
            <CardDescription>Modify global properties such as identifiers and visibility states.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="p-4 bg-muted border border-border rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-1">Share Public URL</p>
                <p className="text-xs font-bold text-card-foreground truncate">
                  {window.location.origin}/view/{competition.slug}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/view/${competition.slug}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span className="text-xs font-bold uppercase tracking-wider">{copied ? "Copied!" : "Copy Link"}</span>
              </Button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="comp-name" className="text-xs font-black uppercase tracking-wider text-muted-foreground">Competition Name</Label>
                  <Input
                    id="comp-name"
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Annual Sports Meet"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comp-slug" className="text-xs font-black uppercase tracking-wider text-muted-foreground">URL Slug</Label>
                  <Input
                    id="comp-slug"
                    required
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="e.g. annual-sports"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="comp-logo" className="text-xs font-black uppercase tracking-wider text-muted-foreground">Competition Logo</Label>
                  <Input
                    id="comp-logo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setFormData({ ...formData, logo: e.target.files[0], removeLogo: false });
                      }
                    }}
                  />
                </div>

                {competition?.logoUrl && (
                  <div className="space-y-2 flex flex-col justify-end">
                    <div className="flex items-center gap-4">
                      <img src={competition.logoUrl} alt="Logo Preview" className="h-12 w-12 object-contain rounded-lg border border-border" />
                      <Button
                        type="button"
                        variant={formData.removeLogo ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => setFormData({ ...formData, removeLogo: !formData.removeLogo, logo: null })}
                      >
                        {formData.removeLogo ? "Will be removed" : "Remove Logo"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="comp-year" className="text-xs font-black uppercase tracking-wider text-muted-foreground">Year</Label>
                  <Input
                    id="comp-year"
                    required
                    type="text"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    placeholder="e.g. 2026"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comp-type" className="text-xs font-black uppercase tracking-wider text-muted-foreground">Competition Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger id="comp-type">
                      <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                    <SelectContent>
                      {competitionTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.type === "custom" && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <Label htmlFor="group-label" className="text-xs font-black uppercase tracking-wider text-muted-foreground">Custom Group Label</Label>
                  <Input
                    id="group-label"
                    required
                    type="text"
                    value={formData.group_label}
                    onChange={(e) => setFormData({ ...formData, group_label: e.target.value })}
                    placeholder="e.g. Cluster"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Visibility</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant={formData.is_public ? "default" : "outline"}
                    onClick={() => setFormData({ ...formData, is_public: true })}
                    className="flex items-center justify-center gap-2"
                  >
                    <Globe className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wider">Public View</span>
                  </Button>
                  <Button
                    type="button"
                    variant={!formData.is_public ? "default" : "outline"}
                    onClick={() => setFormData({ ...formData, is_public: false })}
                    className="flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wider">Private Access</span>
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Participant Source</Label>
                <p className="text-xs text-muted-foreground -mt-1">Controls how participants are created and managed.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { value: "import", label: "Admin Only", desc: "Admin imports participants" },
                    { value: "captain", label: "Captain", desc: "Captains create participants" },
                    { value: "self", label: "Self Reg", desc: "Participants self-register" },
                    { value: "hybrid", label: "Hybrid", desc: "Admin + Claim + Captains" },
                  ].map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={formData.participant_source === opt.value ? "default" : "outline"}
                      onClick={() => setFormData({ ...formData, participant_source: opt.value })}
                      className="flex flex-col items-center justify-center gap-1 text-center h-auto py-3"
                    >
                      <span className="text-xs uppercase tracking-wider font-bold">{opt.label}</span>
                      <span className="text-[9px] opacity-70 leading-tight">{opt.desc}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="pt-8">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full text-xs font-black uppercase tracking-wider"
                >
                  {loading ? "Saving Changes..." : "Save Configuration"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
