import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCompetition } from "../../context/CompetitionContext";
import { FadeIn } from "../AnimateReveal";
import {
  Settings,
  Shield,
  Globe,
  Lock,
  Copy,
  Check,
  Eye,
  RefreshCw,
  Trophy,
  Link2,
  ChevronDown,
  X,
} from "lucide-react";
import { apiJson } from "../../utils/apiClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "../ui/collapsible";
import { Checkbox } from "../ui/checkbox";
import { Separator } from "../ui/separator";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const competitionTypes = [
  { value: "school_houses", label: "School Houses" },
  { value: "college_departments", label: "College Departments" },
  { value: "inter_school", label: "Inter-School" },
  { value: "inter_college", label: "Inter-College" },
  { value: "sports_meet", label: "Sports Meet" },
  { value: "custom", label: "Custom Group Type" },
];

const participantSources = [
  { value: "import", label: "Admin Only", desc: "Only admins import and manage participants." },
  { value: "captain", label: "Captain Managed", desc: "Captains create and manage their group members." },
  { value: "self", label: "Self Registration", desc: "Participants register themselves via public link." },
  { value: "hybrid", label: "Hybrid", desc: "Admin import + account claim + captains." },
];

const visibilityOptions = [
  { value: "public", label: "Public View", desc: "Anyone with the link can view.", icon: Globe },
  { value: "private", label: "Private Access", desc: "Only dashboard members can view.", icon: Lock },
];

export default function ManageCompetition() {
  const { competition, setCompetition } = useCompetition();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    year: "",
    is_public: false,
    participant_source: "import",
    captain_as_participant: true,
    type: "school_houses",
    group_label: "",
    logo: null,
    removeLogo: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    if (competition) {
      setFormData({
        name: competition.name || "",
        slug: competition.slug || "",
        year: competition.year || "",
        is_public: competition.is_public || false,
        participant_source: competition.participant_source || "import",
        captain_as_participant: competition.captain_as_participant !== false,
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
      fd.append('captain_as_participant', formData.captain_as_participant);
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

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError("");
    setSuccess("");
    try {
      if (!competition?._id) throw new Error("No active competition");

      const response = await apiJson(`${API_BASE_URL}/api/competition/${competition._id}/regenerate-slug`, {
        method: "POST",
      });

      if (response && response.slug) {
        setFormData((prev) => ({ ...prev, slug: response.slug }));
        setCompetition({ ...competition, slug: response.slug });
        setSuccess("Public link regenerated! Share the new URL.");
      } else {
        throw new Error("Failed to regenerate link");
      }
    } catch (err) {
      setError(err.message || "Failed to regenerate link");
    } finally {
      setRegenerating(false);
    }
  };

  if (!competition) {
    return (
      <div className="p-10">
        <div className="card-premium max-w-md mx-auto p-8 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <Trophy className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-card-foreground">No Active Competition</h3>
          <p className="text-sm text-muted-foreground">
            Select a competition workspace from the header switcher or the home page to manage its
            settings, share its public link, and update visibility.
          </p>
          <Button type="button" onClick={() => navigate("/")} className="text-xs font-black uppercase tracking-wider">
            Choose Workspace
          </Button>
        </div>
      </div>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = `${origin}/view/${formData.slug}`;
  const selectedSource = participantSources.find((s) => s.value === formData.participant_source);
  const visibilityValue = formData.is_public ? "public" : "private";
  const selectedVisibility = visibilityOptions.find((v) => v.value === visibilityValue);

  const isDirty =
    formData.name !== (competition.name || "") ||
    formData.slug !== (competition.slug || "") ||
    formData.year !== String(competition.year || "") ||
    formData.is_public !== !!competition.is_public ||
    formData.participant_source !== (competition.participant_source || "import") ||
    formData.captain_as_participant !== (competition.captain_as_participant !== false) ||
    formData.type !== (competition.type || "school_houses") ||
    formData.group_label !== (competition.group_label || "") ||
    !!formData.logo ||
    !!formData.removeLogo;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openPreview = () => window.open(`/view/${formData.slug}`, "_blank", "noopener,noreferrer");

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4 pb-5 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <Settings className="w-5 h-5 text-accent-blue shrink-0" />
          <h2 className="text-2xl font-semibold tracking-tight text-card-foreground font-heading truncate">
            Manage Competition
          </h2>
          {isDirty && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Unsaved
            </span>
          )}
        </div>
        <p className="hidden md:block text-xs text-muted-foreground truncate max-w-[280px]">
          {competition.name} {competition.year ? `· ${competition.year}` : ""}
        </p>
      </header>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3 text-destructive animate-in slide-in-from-top-2">
          <Shield className="w-4 h-4 shrink-0" />
          <p className="text-xs font-bold uppercase tracking-widest leading-none flex-1">{error}</p>
          <button type="button" onClick={() => setError("")} className="opacity-60 hover:opacity-100" aria-label="Dismiss error">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-3 bg-accent-green-tint border border-accent-green/20 rounded-lg flex items-center gap-3 text-accent-green animate-in slide-in-from-top-2">
          <Globe className="w-4 h-4 shrink-0" />
          <p className="text-xs font-bold uppercase tracking-widest leading-none flex-1">{success}</p>
          <button type="button" onClick={() => setSuccess("")} className="opacity-60 hover:opacity-100" aria-label="Dismiss message">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <FadeIn className="max-w-3xl mx-auto w-full">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <Settings className="w-40 h-40 text-accent-blue" />
          </div>

          <CardHeader className="pb-2">
            <CardTitle>Competition Settings</CardTitle>
            <CardDescription>Update details, sharing and participant rules. Nothing is saved until you press Save.</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-5">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="sharing">Sharing</TabsTrigger>
                  <TabsTrigger value="participants">Participants</TabsTrigger>
                </TabsList>

                {/* ---- GENERAL ---- */}
                <TabsContent value="general" className="space-y-5 pt-5">
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

                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="comp-year" className="text-xs font-black uppercase tracking-wider text-muted-foreground">Year</Label>
                      <Input
                        id="comp-year"
                        required
                        type="text"
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                        placeholder="2026"
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

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="comp-logo" className="text-xs font-black uppercase tracking-wider text-muted-foreground">Logo</Label>
                    <div className="flex items-center gap-3">
                      {competition?.logoUrl && !formData.removeLogo ? (
                        <img src={competition.logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded-lg border border-border shrink-0" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg border border-dashed border-border flex items-center justify-center shrink-0 text-muted-foreground">
                          <Trophy className="w-4 h-4" />
                        </div>
                      )}
                      <Input
                        id="comp-logo"
                        type="file"
                        accept="image/*"
                        className="flex-1"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setFormData({ ...formData, logo: e.target.files[0], removeLogo: false });
                          }
                        }}
                      />
                      {competition?.logoUrl && (
                        <Button
                          type="button"
                          variant={formData.removeLogo ? "destructive" : "ghost"}
                          size="sm"
                          onClick={() => setFormData({ ...formData, removeLogo: !formData.removeLogo, logo: null })}
                        >
                          {formData.removeLogo ? "Undo" : "Remove"}
                        </Button>
                      )}
                    </div>
                    {formData.logo && (
                      <p className="text-xs text-muted-foreground">New file: {formData.logo.name}</p>
                    )}
                    {formData.removeLogo && (
                      <p className="text-xs text-destructive">Logo will be removed on save.</p>
                    )}
                  </div>
                </TabsContent>

                {/* ---- SHARING & VISIBILITY ---- */}
                <TabsContent value="sharing" className="space-y-5 pt-5">
                  <div className="p-3 bg-muted border border-border rounded-lg flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                          formData.is_public
                            ? "text-accent-green border-accent-green/30 bg-accent-green-tint"
                            : "text-muted-foreground border-border bg-background"
                        }`}>
                          {formData.is_public ? "Public" : "Private"}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-card-foreground truncate" title={publicUrl}>
                        {publicUrl}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button type="button" variant="ghost" size="sm" onClick={handleCopy} className="h-8 w-8 p-0">
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{copied ? "Copied!" : "Copy link"}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button type="button" variant="ghost" size="sm" onClick={openPreview} className="h-8 w-8 p-0">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Preview public page</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={regenerating}
                            onClick={handleRegenerate}
                            className="h-8 w-8 p-0"
                          >
                            <RefreshCw className={`w-4 h-4 ${regenerating ? "animate-spin" : ""}`} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Regenerate link (old link stops working)</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="comp-visibility" className="text-xs font-black uppercase tracking-wider text-muted-foreground">Visibility</Label>
                      <Select
                        value={visibilityValue}
                        onValueChange={(value) => setFormData({ ...formData, is_public: value === "public" })}
                      >
                        <SelectTrigger id="comp-visibility">
                          <SelectValue placeholder="Select visibility" />
                        </SelectTrigger>
                        <SelectContent>
                          {visibilityOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground sm:pt-7">{selectedVisibility?.desc}</p>
                  </div>

                  <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="border border-border rounded-lg">
                    <CollapsibleTrigger asChild>
                      <button type="button" className="flex w-full items-center justify-between p-3 text-left">
                        <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Advanced URL settings</span>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-3 pb-3 space-y-2">
                      <Label htmlFor="comp-slug" className="text-xs font-black uppercase tracking-wider text-muted-foreground">URL Slug</Label>
                      <Input
                        id="comp-slug"
                        required
                        type="text"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        placeholder="e.g. annual-sports"
                      />
                      <p className="text-xs text-muted-foreground">Changing the slug changes the public URL above. Use Regenerate for a random secure link.</p>
                    </CollapsibleContent>
                  </Collapsible>
                </TabsContent>

                {/* ---- PARTICIPANTS ---- */}
                <TabsContent value="participants" className="space-y-5 pt-5">
                  <div className="space-y-2">
                    <Label htmlFor="comp-source" className="text-xs font-black uppercase tracking-wider text-muted-foreground">Participant Source</Label>
                    <Select
                      value={formData.participant_source}
                      onValueChange={(value) => setFormData({ ...formData, participant_source: value })}
                    >
                      <SelectTrigger id="comp-source">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        {participantSources.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedSource && (
                      <p className="text-xs text-muted-foreground">{selectedSource.desc}</p>
                    )}
                  </div>

                  <Separator />

                  <div className="flex items-start gap-3 p-3 border border-border rounded-lg">
                    <Checkbox
                      id="captain-participant"
                      checked={formData.captain_as_participant}
                      onCheckedChange={(checked) => setFormData({ ...formData, captain_as_participant: checked === true })}
                      className="mt-0.5"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="captain-participant" className="text-sm font-medium text-card-foreground cursor-pointer leading-none">
                        Captain can also participate in events
                      </Label>
                      <p className="text-xs text-muted-foreground">When enabled, captains get a participant record and can register themselves.</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground flex-1">
                  {isDirty ? "You have unsaved changes." : "All changes saved."}
                </p>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto sm:min-w-[200px] text-xs font-black uppercase tracking-wider"
                >
                  {loading ? "Saving..." : "Save Configuration"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
