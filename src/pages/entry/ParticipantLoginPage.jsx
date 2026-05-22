import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../components/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { 
  User, 
  KeyRound, 
  Ticket, 
  Lock, 
  Globe, 
  Sparkles, 
  Mail, 
  UserPlus, 
  LogIn, 
  Trophy, 
  ArrowRight,
  Layers,
  Calendar
} from "lucide-react";

export default function ParticipantLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, token, user } = useAuth();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  // Read URL parameters
  const queryParams = new URLSearchParams(location.search);
  const eventIdFromUrl = queryParams.get("eventId") || "";
  const initialSlug = queryParams.get("slug") || "";

  // Page UI state
  const [participantMode, setParticipantMode] = useState("login"); // "login" | "signup"
  const [loading, setLoading] = useState(false);
  const [selectionToken, setSelectionToken] = useState("");
  const [competitionOptions, setCompetitionOptions] = useState([]);
  
  // Input fields
  const [competitionSlug, setCompetitionSlug] = useState(initialSlug);
  const [pEmail, setPEmail] = useState("");
  const [pPassword, setPPassword] = useState("");
  const [pName, setPName] = useState("");
  const [pClass, setPClass] = useState("");
  const [pGroupId, setPGroupId] = useState("");

  // Contextual loaded data
  const [groups, setGroups] = useState([]);
  const [branding, setBranding] = useState(null);
  const [matchedCompetitionName, setMatchedCompetitionName] = useState("");
  const [eventData, setEventData] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(false);
  const [compType, setCompType] = useState("");
  const [groupLabel, setGroupLabel] = useState("Group");

  const isSlugLocked = !!eventIdFromUrl || !!initialSlug;

  const resolvedLabel = useMemo(() => {
    const typeLower = compType?.toLowerCase();
    if (typeLower === "college_departments" || typeLower === "inter_department" || typeLower === "inter-department") {
      return "Department";
    }
    return groupLabel || "Group";
  }, [compType, groupLabel]);

  const finishParticipantLogin = (data, successMessage) => {
    login(data.user, data.access_token, data.refresh_token, data.competition);
    toast.success(successMessage || `Welcome back, ${data.user?.name}!`);
    
    if (eventIdFromUrl) {
      navigate(`/dashboard/event-registration?eventId=${eventIdFromUrl}`, { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  };

  // 1. If user is already logged in, redirect immediately
  useEffect(() => {
    if (token && user) {
      if (user.role === "participant") {
        if (eventIdFromUrl) {
          navigate(`/dashboard/event-registration?eventId=${eventIdFromUrl}`, { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      } else {
        toast("You are logged in as Staff. Redirecting to Staff Panel.", { icon: "ℹ️" });
        navigate("/dashboard/manage-events", { replace: true });
      }
    }
  }, [token, user, eventIdFromUrl, navigate]);

  // 2. Fetch event context if eventId is provided
  useEffect(() => {
    if (!eventIdFromUrl) return;

    const fetchEventContext = async () => {
      setLoadingEvent(true);
      try {
        const res = await fetch(`${backendUrl}/api/public/event/${eventIdFromUrl}`);
        if (!res.ok) throw new Error("Event or Competition details not found");
        const data = await res.json();
        
        setEventData(data);
        if (data.competition) {
          setCompetitionSlug(data.competition.slug);
          setMatchedCompetitionName(data.competition.name);
          if (data.competition.type) setCompType(data.competition.type);
          if (data.competition.group_label) setGroupLabel(data.competition.group_label);
        }
        if (data.branding) {
          setBranding(data.branding);
        }
        if (data.groups) {
          setGroups(data.groups);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load event context. You can still login manually.");
      } finally {
        setLoadingEvent(false);
      }
    };

    fetchEventContext();
  }, [eventIdFromUrl, backendUrl]);

  // 3. Standalone mode: verify the competition slug and fetch groups + branding
  useEffect(() => {
    if (eventIdFromUrl || !competitionSlug.trim()) {
      // Skip if eventId loaded it or if slug is empty
      if (!competitionSlug.trim()) {
        setBranding(null);
        setMatchedCompetitionName("");
        setGroups([]);
        setCompType("");
        setGroupLabel("Group");
      }
      return;
    }

    const controller = new AbortController();
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetch(
          `${backendUrl}/api/public/verify?slug=${encodeURIComponent(competitionSlug.trim())}`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.branding) setBranding(data.branding);
          if (data.name) setMatchedCompetitionName(data.name);
          if (data.groups) setGroups(data.groups);
          if (data.type) setCompType(data.type);
          if (data.group_label) setGroupLabel(data.group_label);
        } else {
          setBranding(null);
          setMatchedCompetitionName("");
          setGroups([]);
          setCompType("");
          setGroupLabel("Group");
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setBranding(null);
          setMatchedCompetitionName("");
          setGroups([]);
          setCompType("");
          setGroupLabel("Group");
        }
      }
    }, 350);

    return () => {
      clearTimeout(delayDebounceFn);
      controller.abort();
    };
  }, [competitionSlug, eventIdFromUrl, backendUrl]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!pEmail.trim() || !pPassword.trim()) {
      toast.error("Please enter your email and password");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch(`${backendUrl}/api/auth/participant-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: pEmail.trim(),
          password: pPassword.trim()
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Login failed");

      if (data?.requires_competition_selection) {
        const eventCompetitionId = eventData?.competition?._id || eventData?.competition?.id;
        const eventCompetitionSlug = eventData?.competition?.slug;
        const sortedOptions = [...(data.competitions || [])].sort((a, b) => {
          const aMatch = a._id === eventCompetitionId || a.id === eventCompetitionId || a.slug === eventCompetitionSlug;
          const bMatch = b._id === eventCompetitionId || b.id === eventCompetitionId || b.slug === eventCompetitionSlug;
          return Number(bMatch) - Number(aMatch);
        });
        setSelectionToken(data.selection_token || "");
        setCompetitionOptions(sortedOptions);
        toast.success("Select the competition you want to enter");
        return;
      }

      finishParticipantLogin(data, `Welcome back, ${data.user?.name}!`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompetitionSelection = async (competitionId) => {
    if (!selectionToken || !competitionId) {
      toast.error("Please select a competition");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch(`${backendUrl}/api/auth/participant-select-competition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selection_token: selectionToken,
          competition_id: competitionId
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Competition selection failed");

      finishParticipantLogin(data, `Entered ${data.competition?.name || "competition"}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!competitionSlug.trim()) {
      toast.error("Please enter the Competition Slug");
      return;
    }
    if (!pName.trim() || !pEmail.trim() || !pPassword.trim() || !pClass.trim() || !pGroupId) {
      toast.error("Please fill in all required fields");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch(`${backendUrl}/api/auth/participant-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pName.trim(),
          email: pEmail.trim(),
          password: pPassword.trim(),
          class: pClass.trim(),
          group_id: pGroupId,
          competition_slug: competitionSlug.trim()
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Signup failed");

      finishParticipantLogin(data, `Welcome, ${data.user?.name}! Account created.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const primaryColor = branding?.primary_color || "#4F46E5";
  const inputClass = "w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm";
  const labelClass = "block text-xs font-semibold mb-1 text-neutral-600 dark:text-neutral-400";
  const iconSpan = "absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-400";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1220] text-neutral-900 dark:text-neutral-100 flex flex-col items-center justify-center p-4">
      {/* Top micro banner for branding */}
      {matchedCompetitionName && (
        <div 
          className="w-full max-w-lg mb-6 py-2.5 px-4 text-center text-xs font-semibold tracking-wider uppercase rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-4 duration-300 flex items-center justify-center gap-1.5"
          style={{ backgroundColor: `${primaryColor}15`, color: primaryColor, border: `1px solid ${primaryColor}30` }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {matchedCompetitionName} • Participant Portal
        </div>
      )}

      {/* Main card */}
      <div className="max-w-md w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-850 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden transition-all duration-300">
        
        {/* Glow effect at the top */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent blur-sm"
          style={{ backgroundImage: `linear-gradient(to right, transparent, ${primaryColor}, transparent)` }}
        />

        {/* Brand header */}
        <div className="text-center mb-6">
          {branding?.logo_url ? (
            <img 
              src={branding.logo_url} 
              alt={matchedCompetitionName} 
              className="h-14 w-auto mx-auto mb-3 object-contain rounded-2xl animate-in zoom-in-95 duration-300"
            />
          ) : (
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mx-auto mb-3 border border-indigo-100 dark:border-indigo-900/40">
              <Trophy className="h-6 w-6 text-indigo-500" style={{ color: primaryColor }} />
            </div>
          )}
          
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {matchedCompetitionName || "Resonance"}
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {eventData ? "Access the event registration portal" : "Join or log in to your participant dashboard"}
          </p>
        </div>

        {/* Dynamic Context Event Card */}
        {eventData && eventData.event && (
          <div className="mb-5 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800/80 animate-in fade-in zoom-in-95 duration-300">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1" style={{ color: primaryColor }}>
              You are registering for
            </p>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
              {eventData.event.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              {eventData.event.description || "No description provided."}
            </p>
            <div className="flex gap-3 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/40 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {eventData.event.event_type}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {eventData.event.mode}</span>
            </div>
          </div>
        )}

        {/* Loading state indicator */}
        {loadingEvent && (
          <div className="flex items-center justify-center py-6 gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${primaryColor} transparent` }} />
            Loading event context...
          </div>
        )}

        {!loadingEvent && (
          <>
            {/* Login / Signup Selector Tabs */}
            <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-900 p-0.5 mb-6">
              <button
                type="button"
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  participantMode === "login"
                    ? "bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-250"
                }`}
                style={participantMode === "login" ? { color: primaryColor } : {}}
                onClick={() => {
                  setParticipantMode("login");
                  setSelectionToken("");
                  setCompetitionOptions([]);
                }}
              >
                <LogIn className="h-3.5 w-3.5" />
                Log In
              </button>
              <button
                type="button"
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  participantMode === "signup"
                    ? "bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-250"
                }`}
                style={participantMode === "signup" ? { color: primaryColor } : {}}
                onClick={() => {
                  setParticipantMode("signup");
                  setSelectionToken("");
                  setCompetitionOptions([]);
                }}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Sign Up
              </button>
            </div>

            {/* Inputs & Forms */}
            <div className="space-y-4">
              
              {participantMode === "signup" && (
              <div>
                <label className={labelClass}>Competition URL Slug</label>
                <div className="relative">
                  <span className={iconSpan}>
                    {isSlugLocked ? <Lock className="h-4.5 w-4.5 text-indigo-500" style={{ color: primaryColor }} /> : <Globe className="h-4.5 w-4.5" />}
                  </span>
                  <input 
                    type="text" 
                    required 
                    disabled={isSlugLocked}
                    placeholder="e.g. annual-sports-2026"
                    className={`${inputClass} ${isSlugLocked ? "opacity-70 cursor-not-allowed font-medium text-slate-600 dark:text-slate-400" : ""}`}
                    value={competitionSlug}
                    onChange={(e) => setCompetitionSlug(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                {isSlugLocked && (
                  <p className="text-[10px] text-indigo-500 dark:text-indigo-400 mt-1 ml-1 flex items-center gap-1 font-medium" style={{ color: primaryColor }}>
                    <Sparkles className="h-2.5 w-2.5" /> Auto-detected and locked
                  </p>
                )}
                {matchedCompetitionName && !isSlugLocked && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 ml-1 font-medium flex items-center gap-0.5">
                    ✓ Connected: {matchedCompetitionName}
                  </p>
                )}
              </div>
              )}

              {participantMode === "login" ? (
                competitionOptions.length > 0 ? (
                  <div className="space-y-3">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">Select Competition</h2>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        Your account is registered in more than one competition.
                      </p>
                    </div>
                    <div className="space-y-2">
                      {competitionOptions.map((competition) => {
                        const eventMatch = eventData?.competition && (
                          competition._id === eventData.competition._id ||
                          competition.id === eventData.competition._id ||
                          competition.slug === eventData.competition.slug
                        );
                        return (
                          <button
                            key={competition._id || competition.id}
                            type="button"
                            disabled={loading}
                            onClick={() => handleCompetitionSelection(competition._id || competition.id)}
                            className="w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 hover:border-indigo-300 dark:hover:border-indigo-700 text-left transition-all disabled:opacity-60"
                          >
                            {competition.logoUrl ? (
                              <img src={competition.logoUrl} alt="" className="h-10 w-10 rounded-xl object-contain bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800" />
                            ) : (
                              <span className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
                                <Trophy className="h-5 w-5" style={{ color: primaryColor }} />
                              </span>
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-bold text-slate-900 dark:text-white truncate">{competition.name}</span>
                              <span className="block text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                                {competition.slug}{competition.year ? ` • ${competition.year}` : ""}
                              </span>
                              {eventMatch && (
                                <span className="mt-1 inline-flex text-[10px] font-bold uppercase tracking-wide" style={{ color: primaryColor }}>
                                  Event match
                                </span>
                              )}
                            </span>
                            <ArrowRight className="h-4 w-4 text-neutral-400 shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectionToken("");
                        setCompetitionOptions([]);
                      }}
                      className="w-full text-xs font-bold text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                    >
                      Back to login
                    </button>
                  </div>
                ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className={labelClass}>Email Address</label>
                    <div className="relative">
                      <span className={iconSpan}><Mail className="h-4.5 w-4.5" /></span>
                      <input 
                        type="email" 
                        required 
                        placeholder="your@email.com" 
                        className={inputClass} 
                        value={pEmail} 
                        onChange={(e) => setPEmail(e.target.value)} 
                        autoComplete="email" 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className={labelClass}>Password</label>
                    <div className="relative">
                      <span className={iconSpan}><KeyRound className="h-4.5 w-4.5" /></span>
                      <input 
                        type="password" 
                        required 
                        placeholder="••••••••" 
                        className={inputClass} 
                        value={pPassword} 
                        onChange={(e) => setPPassword(e.target.value)} 
                        autoComplete="current-password" 
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full py-3 text-white font-bold rounded-xl transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-6" 
                    style={{ backgroundColor: primaryColor }}
                  >
                    {loading ? 'Authenticating...' : <><span>Log In & Enter</span><ArrowRight className="h-4 w-4" /></>}
                  </button>
                </form>
                )
              ) : (
                /* Signup Form */
                <form onSubmit={handleSignup} className="space-y-3.5">
                  <div>
                    <label className={labelClass}>Full Name</label>
                    <div className="relative">
                      <span className={iconSpan}><User className="h-4.5 w-4.5" /></span>
                      <input 
                        type="text" 
                        required 
                        placeholder="Your full name" 
                        className={inputClass} 
                        value={pName} 
                        onChange={(e) => setPName(e.target.value)} 
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Email Address</label>
                    <div className="relative">
                      <span className={iconSpan}><Mail className="h-4.5 w-4.5" /></span>
                      <input 
                        type="email" 
                        required 
                        placeholder="your@email.com" 
                        className={inputClass} 
                        value={pEmail} 
                        onChange={(e) => setPEmail(e.target.value)} 
                        autoComplete="email" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Password</label>
                    <div className="relative">
                      <span className={iconSpan}><KeyRound className="h-4.5 w-4.5" /></span>
                      <input 
                        type="password" 
                        required 
                        minLength={6} 
                        placeholder="Min 6 characters" 
                        className={inputClass} 
                        value={pPassword} 
                        onChange={(e) => setPPassword(e.target.value)} 
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Class / Section</label>
                    <div className="relative">
                      <span className={iconSpan}><Ticket className="h-4.5 w-4.5" /></span>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. 10-A or Section B" 
                        className={inputClass} 
                        value={pClass} 
                        onChange={(e) => setPClass(e.target.value)} 
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>
                      {!competitionSlug.trim() ? `${resolvedLabel} (enter slug first)` : `Select ${resolvedLabel}`}
                    </label>
                    <select
                      required
                      disabled={groups.length === 0}
                      className={`${inputClass} pl-4 ${groups.length === 0 ? "opacity-60 cursor-not-allowed" : ""}`}
                      value={pGroupId}
                      onChange={(e) => setPGroupId(e.target.value)}
                    >
                      <option value="">
                        {groups.length === 0 ? "Enter valid slug above first" : `Select your ${resolvedLabel.toLowerCase()}`}
                      </option>
                      {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
                    </select>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full py-3 text-white font-bold rounded-xl transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-6" 
                    style={{ backgroundColor: primaryColor }}
                  >
                    {loading ? 'Creating Account...' : <><span>Sign Up & Enter</span><ArrowRight className="h-4 w-4" /></>}
                  </button>
                </form>
              )}
            </div>

            {/* Form footer text toggler */}
            <p className="text-xs text-center text-neutral-400 dark:text-neutral-500 mt-5">
              {participantMode === "login" 
                ? <>Don't have an account? <button type="button" onClick={() => {
                  setParticipantMode("signup");
                  setSelectionToken("");
                  setCompetitionOptions([]);
                }} className="text-indigo-500 hover:underline cursor-pointer font-bold" style={{ color: primaryColor }}>Sign up</button></>
                : <>Already registered? <button type="button" onClick={() => {
                  setParticipantMode("login");
                  setSelectionToken("");
                  setCompetitionOptions([]);
                }} className="text-indigo-500 hover:underline cursor-pointer font-bold" style={{ color: primaryColor }}>Log in</button></>
              }
            </p>
          </>
        )}

        {/* Back to general Staff options link */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/40 text-center text-xs text-neutral-400 dark:text-neutral-500">
          Staff / Captain?{" "}
          <button 
            type="button" 
            onClick={() => navigate("/login")} 
            className="text-indigo-500 hover:underline font-bold cursor-pointer"
            style={{ color: primaryColor }}
          >
            Go to Staff Login
          </button>
        </div>
      </div>
    </div>
  );
}
