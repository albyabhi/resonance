import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Check, ChevronDown, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { api, API_ROUTES } from "../../utils/apiClient";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

function dedupeCompetitions(...lists) {
  const map = new Map();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const comp of list) {
      const id = comp?._id || comp?.id;
      if (!id || map.has(id)) continue;
      map.set(id, comp);
    }
  }
  return [...map.values()];
}

export default function CompetitionSwitcher({ collapsed = false, onSwitched = () => {} }) {
  const { role, token, isAuthenticated, competition, login } = useAuth() || {};
  const navigate = useNavigate();
  const [compList, setCompList] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState(null);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !token || role === "guest") {
      setCompList([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .get(API_ROUTES.COMPETITIONS.MY)
      .then((data) => {
        if (cancelled) return;
        const combined = dedupeCompetitions(
          data?.adminCompetitions,
          data?.participantCompetitions,
          Array.isArray(data) ? data : null
        );
        setCompList(combined);
      })
      .catch(() => {
        if (!cancelled) setCompList([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token, role]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const handleEsc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [open ]);

  // Only show when the logged-in user belongs to more than one competition
  if (!isAuthenticated || role === "guest") return null;
  if (!loading && compList.length <= 1) return null;

  const activeId = competition?._id || competition?.id;

  const handleSwitch = async (compId) => {
    if (!compId || compId === activeId) {
      setOpen(false);
      return;
    }
    setSwitchingId(compId);
    try {
      const res = await api.post(API_ROUTES.AUTH.SELECT_COMPETITION, {
        competition_id: compId,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to switch competition");
      login(data.user, data.access_token, data.refresh_token, data.competition);
      setOpen(false);
      onSwitched();
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
    } finally {
      setSwitchingId(null);
    }
  };

  if (collapsed) {
    return (
      <div className="relative flex justify-center" ref={rootRef}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen((v) => !v)}
          title="Switch competition"
          aria-label="Switch competition"
          className="h-11 w-11 rounded-lg"
        >
          <ArrowLeftRight className="h-5 w-5" />
        </Button>
        {open && (
          <div
            className="absolute left-full top-0 z-50 ml-2 w-64 overflow-hidden rounded-lg shadow-xl"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
          >
            <div
              className="border-b px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--muted-foreground)", borderColor: "var(--border)" }}
            >
              Switch Competition
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {loading ? null : (
                compList.map((comp) => {
                  const id = comp._id || comp.id;
                  const isActive = id === activeId;
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={isActive || switchingId === id}
                      onClick={() => handleSwitch(id)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ color: isActive ? "var(--primary)" : "var(--card-foreground)" }}
                    >
                      <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                        <AvatarFallback
                          className="rounded-lg text-xs font-bold"
                          style={{ backgroundColor: "var(--accent-blue-tint)", color: "var(--accent-blue)" }}
                        >
                          {comp.name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1 truncate font-medium">{comp.name}</span>
                      {isActive && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative px-2" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted"
        )}
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        aria-expanded={open}
        aria-label="Switch competition"
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg"
          style={{ backgroundColor: "var(--accent-blue-tint)", color: "var(--accent-blue)" }}
        >
          {competition?.logoUrl ? (
            <img src={competition.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Trophy className="h-4 w-4" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className="block text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "var(--muted-foreground)" }}
          >
            Competition
          </span>
          <span className="block truncate text-sm font-semibold" style={{ color: "var(--card-foreground)" }}>
            {competition?.name || "Select competition"}
          </span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} style={{ color: "var(--muted-foreground)" }} />
      </button>

      {open && (
        <div
          className="absolute inset-x-2 top-full z-50 mt-2 overflow-hidden rounded-lg shadow-xl"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div className="max-h-64 overflow-y-auto py-1">
            {loading ? null : (
              compList.map((comp) => {
                const id = comp._id || comp.id;
                const isActive = id === activeId;
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={isActive || switchingId === id}
                    onClick={() => handleSwitch(id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ color: isActive ? "var(--primary)" : "var(--card-foreground)" }}
                  >
                    <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                      <AvatarFallback
                        className="rounded-lg text-xs font-bold"
                        style={{ backgroundColor: "var(--accent-blue-tint)", color: "var(--accent-blue)" }}
                      >
                        {comp.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{comp.name}</div>
                      <div className="truncate text-xs" style={{ color: "var(--muted-foreground)" }}>
                        {[comp.year, comp.type?.replace(/_/g, " ")].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    {isActive ? (
                      <span className="text-xs font-semibold" style={{ color: "var(--accent-green)" }}>
                        Active
                      </span>
                    ) : switchingId === id ? (
                      <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                        Switching...
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
