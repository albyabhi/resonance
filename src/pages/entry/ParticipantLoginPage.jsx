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
  Mail, 
  UserPlus, 
  LogIn, 
  ArrowRight,
  Layers,
  Calendar,
  Fingerprint,
  Shield
} from "lucide-react";
import { apiJson } from "../../utils/apiClient";

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
  const [participantMode, setParticipantMode] = useState("login"); // "login" | "signup" | "claim"
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

  // Claim account fields
  const [claimAdmissionNo, setClaimAdmissionNo] = useState("");
  const [claimOtp, setClaimOtp] = useState("");
  const [claimEmail, setClaimEmail] = useState("");
  const [claimPassword, setClaimPassword] = useState("");
  const [claimParticipantId, setClaimParticipantId] = useState("");
  const [claimStep, setClaimStep] = useState("admission"); // "admission" | "otp" | "password"
  const [claimMaskedPhone, setClaimMaskedPhone] = useState("");

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
      navigate("/", { replace: true });
    }
  };

  // 1. If user is already logged in, redirect immediately
  useEffect(() => {
    if (token && user) {
      if (user.role === "participant") {
        if (eventIdFromUrl) {
          navigate(`/dashboard/event-registration?eventId=${eventIdFromUrl}`, { replace: true });
        } else {
          navigate("/", { replace: true });
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
        const data = await apiJson(`${backendUrl}/api/public/event/${eventIdFromUrl}`);
        
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
        const data = await apiJson(
          `${backendUrl}/api/public/verify?slug=${encodeURIComponent(competitionSlug.trim())}`,
          { signal: controller.signal }
        );
        if (data.branding) setBranding(data.branding);
        if (data.name) setMatchedCompetitionName(data.name);
        if (data.groups) setGroups(data.groups);
        if (data.type) setCompType(data.type);
        if (data.group_label) setGroupLabel(data.group_label);
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
      const data = await apiJson(`${backendUrl}/api/auth/participant-login`, {
        method: "POST",
        body: JSON.stringify({ 
          email: pEmail.trim(),
          password: pPassword.trim()
        }),
      });

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
      const data = await apiJson(`${backendUrl}/api/auth/participant-select-competition`, {
        method: "POST",
        body: JSON.stringify({
          selection_token: selectionToken,
          competition_id: competitionId
        }),
      });

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
      const data = await apiJson(`${backendUrl}/api/auth/participant-signup`, {
        method: "POST",
        body: JSON.stringify({
          name: pName.trim(),
          email: pEmail.trim(),
          password: pPassword.trim(),
          class: pClass.trim(),
          group_id: pGroupId,
          competition_slug: competitionSlug.trim()
        }),
      });

      finishParticipantLogin(data, `Welcome, ${data.user?.name}! Account created.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const primaryColor = branding?.primary_color || "#B68A32";
  const inputClass = "w-full pl-11 pr-4 py-3 bg-input-bg border border-input rounded-xl focus:ring-2 focus:ring-ring outline-none transition-all text-sm text-foreground placeholder:text-muted-foreground";
  const labelClass = "block text-xs font-semibold mb-1 text-foreground";
  const iconSpan = "absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted-foreground";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
      {/* Top micro banner for branding */}
      {matchedCompetitionName && (
        <div 
          className="w-full max-w-lg mb-6 py-2.5 px-4 text-center text-xs font-semibold tracking-wider uppercase rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-4 duration-300 flex items-center justify-center gap-1.5"
          style={{ backgroundColor: `${primaryColor}15`, color: primaryColor, border: `1px solid ${primaryColor}30` }}
        >
          {matchedCompetitionName} • Participant Portal
        </div>
      )}

      {/* Main card */}
      <div className="max-w-md w-full bg-card border border-border rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden transition-all duration-300">
        
        {/* Glow effect at the top */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-secondary to-transparent blur-sm"
          style={{ backgroundImage: `linear-gradient(to right, transparent, ${primaryColor}, transparent)` }}
        />

        {/* Brand header */}
        <div className="text-center mb-6">
          {branding?.logo_url && (
            <img 
              src={branding.logo_url} 
              alt={matchedCompetitionName} 
              className="h-14 w-auto mx-auto mb-3 object-contain rounded-2xl animate-in zoom-in-95 duration-300"
            />
          )}
          
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            {matchedCompetitionName || "Resonance"}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {eventData ? "Access the event registration portal" : "Join or log in to your participant dashboard"}
          </p>
        </div>

        {/* Dynamic Context Event Card */}
        {eventData && eventData.event && (
          <div className="mb-5 p-3.5 bg-muted rounded-2xl border border-border animate-in fade-in zoom-in-95 duration-300">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: primaryColor }}>
              You are registering for
            </p>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              {eventData.event.title || eventData.event.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {eventData.event.description || "No description provided."}
            </p>
            <div className="flex gap-3 mt-2 pt-2 border-t border-border text-[10px] font-semibold text-muted-foreground">
              <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {eventData.event.event_type}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {eventData.event.mode}</span>
            </div>
          </div>
        )}

        {/* Loading state indicator */}
        {loadingEvent && (
          <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
            <span className="h-4 w-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${primaryColor} transparent` }} />
            Loading event context...
          </div>
        )}

        {!loadingEvent && (
          <>
            {/* Login / Signup / Claim Selector Tabs */}
            <div className="flex rounded-2xl bg-muted p-0.5 mb-6">
              <button
                type="button"
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  participantMode === "login"
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
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
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
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
              <button
                type="button"
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  participantMode === "claim"
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                style={participantMode === "claim" ? { color: primaryColor } : {}}
                onClick={() => {
                  setParticipantMode("claim");
                  setClaimStep("admission");
                  setClaimAdmissionNo("");
                  setClaimOtp("");
                  setClaimEmail("");
                  setClaimPassword("");
                  setClaimParticipantId("");
                  setClaimMaskedPhone("");
                }}
              >
                <Fingerprint className="h-3.5 w-3.5" />
                Claim
              </button>
            </div>

            {/* Inputs & Forms */}
            <div className="space-y-4">
              
              {participantMode === "signup" && (
              <div>
                <label className={labelClass}>Competition URL Slug</label>
                <div className="relative">
                  <span className={iconSpan}>
                    {isSlugLocked ? <Lock className="h-4.5 w-4.5" style={{ color: primaryColor }} /> : <Globe className="h-4.5 w-4.5" />}
                  </span>
                  <input 
                    type="text" 
                    required 
                    disabled={isSlugLocked}
                    placeholder="e.g. annual-sports-2026"
                    className={`${inputClass} ${isSlugLocked ? "opacity-70 cursor-not-allowed font-medium text-muted-foreground" : ""}`}
                    value={competitionSlug}
                    onChange={(e) => setCompetitionSlug(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                {isSlugLocked && (
                  <p className="text-[10px] mt-1 ml-1 flex items-center gap-1 font-medium" style={{ color: primaryColor }}>
                    <Lock className="h-2.5 w-2.5" /> Auto-detected and locked
                  </p>
                )}
                {matchedCompetitionName && !isSlugLocked && (
                  <p className="text-[10px] text-accent-teal mt-1 ml-1 font-medium flex items-center gap-0.5">
                    ✓ Connected: {matchedCompetitionName}
                  </p>
                )}
              </div>
              )}

              {participantMode === "login" ? (
                competitionOptions.length > 0 ? (
                  <div className="space-y-3">
                    <div>
                      <h2 className="text-sm font-bold text-foreground">Select Competition</h2>
                      <p className="text-xs text-muted-foreground mt-1">
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
                            className="w-full flex items-center gap-3 p-3 rounded-2xl border border-border bg-muted hover:border-primary text-left transition-all disabled:opacity-60"
                          >
                            {competition.logoUrl && (
                              <img src={competition.logoUrl} alt="" className="h-10 w-10 rounded-xl object-contain bg-card border border-border shrink-0" />
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-bold text-foreground truncate">{competition.name}</span>
                              <span className="block text-[11px] text-muted-foreground truncate">
                                {competition.slug}{competition.year ? ` • ${competition.year}` : ""}
                              </span>
                              {eventMatch && (
                                <span className="mt-1 inline-flex text-[10px] font-bold uppercase tracking-wide" style={{ color: primaryColor }}>
                                  Event match
                                </span>
                              )}
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
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
                      className="w-full text-xs font-bold text-muted-foreground hover:text-foreground"
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
                    className="w-full py-3 text-primary-foreground font-bold rounded-xl transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-6" 
                    style={{ backgroundColor: primaryColor }}
                  >
                    {loading ? 'Authenticating...' : <><span>Log In & Enter</span><ArrowRight className="h-4 w-4" /></>}
                  </button>
                </form>
                )
              ) : participantMode === "claim" ? (
                /* Claim Account Form */
                <div className="space-y-4">
                  {claimStep === "admission" && (
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (!competitionSlug.trim() || !claimAdmissionNo.trim()) {
                        toast.error("Please enter competition slug and admission number");
                        return;
                      }
                      setLoading(true);
                      try {
                        const data = await apiJson(`${backendUrl}/api/auth/participant-claim-otp`, {
                          method: "POST",
                          body: JSON.stringify({
                            admission_no: claimAdmissionNo.trim(),
                            competition_slug: competitionSlug.trim()
                          }),
                        });
                        setClaimParticipantId(data.participant_id);
                        setClaimMaskedPhone(data.masked_phone || "");
                        setClaimStep("otp");
                        toast.success("OTP sent to your registered phone number");
                      } catch (err) {
                        toast.error(err.message);
                      } finally {
                        setLoading(false);
                      }
                    }} className="space-y-3.5">
                      <div>
                        <label className={labelClass}>Competition URL Slug</label>
                        <div className="relative">
                          <span className={iconSpan}><Globe className="h-4.5 w-4.5" /></span>
                          <input type="text" required placeholder="e.g. annual-sports-2026"
                            className={inputClass} value={competitionSlug}
                            onChange={(e) => setCompetitionSlug(e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Admission Number</label>
                        <div className="relative">
                          <span className={iconSpan}><Fingerprint className="h-4.5 w-4.5" /></span>
                          <input type="text" required placeholder="e.g. 24MCA001"
                            className={inputClass} value={claimAdmissionNo}
                            onChange={(e) => setClaimAdmissionNo(e.target.value)}
                          />
                        </div>
                      </div>
                      <button type="submit" disabled={loading}
                        className="w-full py-3 text-primary-foreground font-bold rounded-xl transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-6"
                        style={{ backgroundColor: primaryColor }}>
                        {loading ? 'Sending OTP...' : <><Shield className="h-4 w-4" /><span>Send OTP</span></>}
                      </button>
                    </form>
                  )}

                  {claimStep === "otp" && (
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (!claimOtp.trim()) {
                        toast.error("Please enter the OTP");
                        return;
                      }
                      setLoading(true);
                      try {
                        await apiJson(`${backendUrl}/api/auth/participant-claim`, {
                          method: "POST",
                          body: JSON.stringify({
                            participant_id: claimParticipantId,
                            otp: claimOtp.trim(),
                            email: claimEmail.trim(),
                            password: claimPassword.trim(),
                          }),
                        });
                        toast.success("Account claimed successfully! You can now log in.");
                        setParticipantMode("login");
                        setClaimStep("admission");
                      } catch (err) {
                        toast.error(err.message);
                      } finally {
                        setLoading(false);
                      }
                    }} className="space-y-3.5">
                      {claimMaskedPhone && (
                        <div className="p-3 bg-muted rounded-xl border border-border text-center">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">OTP sent to</p>
                          <p className="text-sm font-bold text-foreground">{claimMaskedPhone}</p>
                        </div>
                      )}
                      <div>
                        <label className={labelClass}>Enter OTP</label>
                        <div className="relative">
                          <span className={iconSpan}><Shield className="h-4.5 w-4.5" /></span>
                          <input type="text" required placeholder="6-digit OTP"
                            className={inputClass} value={claimOtp}
                            onChange={(e) => setClaimOtp(e.target.value)}
                            maxLength={6}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Email Address</label>
                        <div className="relative">
                          <span className={iconSpan}><Mail className="h-4.5 w-4.5" /></span>
                          <input type="email" required placeholder="your@email.com"
                            className={inputClass} value={claimEmail}
                            onChange={(e) => setClaimEmail(e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Create Password</label>
                        <div className="relative">
                          <span className={iconSpan}><KeyRound className="h-4.5 w-4.5" /></span>
                          <input type="password" required minLength={6} placeholder="Min 6 characters"
                            className={inputClass} value={claimPassword}
                            onChange={(e) => setClaimPassword(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 mt-2">
                        <button type="button" onClick={() => setClaimStep("admission")}
                          className="flex-1 py-3 border border-border font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer text-foreground"
                        >
                          Back
                        </button>
                        <button type="submit" disabled={loading}
                          className="flex-1 py-3 text-primary-foreground font-bold rounded-xl transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                          style={{ backgroundColor: primaryColor }}>
                          {loading ? 'Claiming...' : <><span>Claim Account</span><ArrowRight className="h-4 w-4" /></>}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
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
                    className="w-full py-3 text-primary-foreground font-bold rounded-xl transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-6" 
                    style={{ backgroundColor: primaryColor }}
                  >
                    {loading ? 'Creating Account...' : <><span>Sign Up & Enter</span><ArrowRight className="h-4 w-4" /></>}
                  </button>
                </form>
              )}
            </div>

            {/* Form footer text toggler */}
            <p className="text-xs text-center text-muted-foreground mt-5">
              {participantMode === "login" 
                ? <><button type="button" onClick={() => {
                  setParticipantMode("signup");
                  setSelectionToken("");
                  setCompetitionOptions([]);
                }} className="hover:underline cursor-pointer font-bold" style={{ color: primaryColor }}>Sign up</button> or <button type="button" onClick={() => {
                  setParticipantMode("claim");
                  setClaimStep("admission");
                }} className="hover:underline cursor-pointer font-bold" style={{ color: primaryColor }}>Claim account</button></>
                : participantMode === "claim"
                ? <><button type="button" onClick={() => {
                  setParticipantMode("login");
                  setSelectionToken("");
                  setCompetitionOptions([]);
                }} className="hover:underline cursor-pointer font-bold" style={{ color: primaryColor }}>Log in</button> instead</>
                : <>Already registered? <button type="button" onClick={() => {
                  setParticipantMode("login");
                  setSelectionToken("");
                  setCompetitionOptions([]);
                }} className="hover:underline cursor-pointer font-bold" style={{ color: primaryColor }}>Log in</button></>
              }
            </p>
          </>
        )}

        {/* Back to general Staff options link */}
        <div className="mt-6 pt-5 border-t border-border text-center text-xs text-muted-foreground">
          Staff / Captain?{" "}
          <button 
            type="button" 
            onClick={() => navigate("/login")} 
            className="hover:underline font-bold cursor-pointer"
            style={{ color: primaryColor }}
          >
            Go to Staff Login
          </button>
        </div>
      </div>
    </div>
  );
}
