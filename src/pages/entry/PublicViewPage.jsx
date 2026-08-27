import React, { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useLiveScore } from "../../hooks/useLiveScore";
import { useAuth } from "../../components/AuthContext";
import { useRealtime } from "../../context/RealtimeContext";
import GatekeeperModal from "../../components/GatekeeperModal";
import PublicHero from "../../components/public/PublicHero";
import PublicStats from "../../components/public/PublicStats";
import PublicStandings from "../../components/public/PublicStandings";
import PublicResultsByEvent from "../../components/public/PublicResultsByEvent";
import PublicTicker from "../../components/public/PublicTicker";
import PublicWinners from "../../components/public/PublicWinners";
import PublicCategoryStats from "../../components/public/PublicCategoryStats";
import PublicParticipationStats from "../../components/public/PublicParticipationStats";
import PublicEventDetailModal from "../../components/public/PublicEventDetailModal";
import PublicErrorPage from "../../components/public/PublicErrorPage";
import { Wifi, Trophy, BarChart3, ListChecks, Zap, Medal } from "lucide-react";
import { apiFetch } from "../../utils/apiClient";
// eslint-disable-next-line no-unused-vars -- motion is used as <motion.div> JSX element
import { motion } from "framer-motion";
import { Skeleton } from "../../components/ui/skeleton";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const TABS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "standings", label: "Standings", icon: Trophy },
  { id: "winners", label: "Winners", icon: Medal },
  { id: "events", label: "Events", icon: ListChecks },
  { id: "stats", label: "Statistics", icon: Zap },
];

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative overflow-hidden border-b border-border hero-bg">
        <div className="relative max-w-6xl mx-auto px-6 py-12 flex flex-col sm:flex-row items-center gap-8">
          <Skeleton className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-12 w-64" />
            <div className="flex gap-3 mt-4">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-12 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 -mt-6 relative z-10">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="bg-card border border-border rounded-2xl p-5 h-20" />
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="flex gap-4 border-b border-border pb-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-5 w-16 rounded" />
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export default function PublicViewPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const isKiosk = searchParams.get("display") === "kiosk";
  const { isAuthenticated } = useAuth();
  const { lastUpdate } = useRealtime() || {};

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [isGatekeeperOpen, setIsGatekeeperOpen] = useState(false);

  const [winners, setWinners] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventDetailLoading, setEventDetailLoading] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/public/${slug}/dashboard`);
      if (res.status === 404) {
        setError({ status: 404, message: "This competition does not exist or the link is out of date." });
        setLoading(false);
        return;
      }
      if (res.status === 403) {
        setError({ status: 403, message: "This competition is not publicly accessible. Check with the organizer." });
        setLoading(false);
        return;
      }
      if (res.status === 410) {
        setError({ status: 410, message: "This competition has been closed and is no longer available." });
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        setError({ status: res.status, message: errBody?.message || "Something went wrong while loading this page." });
        setLoading(false);
        return;
      }
      const json = await res.json();
      setData(json);
      setError(null);
      setLoading(false);
    } catch {
      setError({ status: 0, message: "Network error. Please check your connection and try again." });
      setLoading(false);
    }
  }, [slug]);

  const fetchWinners = useCallback(async () => {
    if (winners) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/public/${slug}/winners`);
      if (res.ok) {
        const json = await res.json();
        setWinners(json.winners);
      }
    } catch {
      // Silent fail — winners are non-critical
    }
  }, [slug, winners]);

  const fetchStats = useCallback(async () => {
    if (statsData) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/public/${slug}/stats`);
      if (res.ok) {
        const json = await res.json();
        setStatsData(json);
      }
    } catch {
      // Silent fail — stats are non-critical
    }
  }, [slug, statsData]);

  const fetchEventDetail = useCallback(async (eventId) => {
    setEventDetailLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/public/${slug}/events/${eventId}`);
      if (res.ok) {
        const json = await res.json();
        setSelectedEvent(json);
      }
    } catch {
      // Silent fail
    } finally {
      setEventDetailLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  useLiveScore(slug, () => {
    fetchDashboard();
    setWinners(null);
    setStatsData(null);
  });

  useEffect(() => {
    if (!loading && data && !isAuthenticated && !isKiosk) {
      const dismissed = sessionStorage.getItem(`gatekeeper_dismissed_${slug}`);
      if (dismissed !== "true") {
        setIsGatekeeperOpen(true);
      }
    }
  }, [loading, data, isAuthenticated, isKiosk, slug]);

  useEffect(() => {
    if (activeTab === "winners") fetchWinners();
    if (activeTab === "stats") fetchStats();
  }, [activeTab, fetchWinners, fetchStats]);

  const handleCloseGatekeeper = () => {
    setIsGatekeeperOpen(false);
    sessionStorage.setItem(`gatekeeper_dismissed_${slug}`, "true");
  };

  const getLastUpdateTime = () => {
    if (!lastUpdate) return null;
    const diff = Date.now() - lastUpdate;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 30) return "Just now";
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const handleEventClick = (eventId) => {
    fetchEventDetail(eventId);
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error || !data) {
    return <PublicErrorPage status={error?.status} message={error?.message || "Competition not found."} />;
  }

  const { competition, stats, standings, events, results, ticker } = data;
  const primaryColor = competition.branding?.primary_color || "var(--primary)";

  // ─── Kiosk layout: full-screen standings HUD ──────────────────────────────────
  if (isKiosk) {
    return (
      <div className="min-h-screen font-sans bg-background text-foreground overflow-hidden flex flex-col">
        <div className="absolute top-6 right-8 flex items-center gap-3">
          <span className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success/75 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-success"></span>
          </span>
          <span className="text-xl text-success font-bold tracking-widest uppercase">LIVE</span>
        </div>

        <div className="absolute top-6 left-8 text-left">
          {getLastUpdateTime() && (
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-2">
              <Wifi className="h-3 w-3 text-success" />
              Last updated: <span className="font-mono font-bold">{getLastUpdateTime()}</span>
            </div>
          )}
        </div>

        <h1 className="text-6xl font-black text-center mt-12 mb-10 text-foreground">
          {competition.name}
        </h1>

        <main className="flex-1 px-10 pb-10 flex flex-col gap-6">
          <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
            <div className="col-span-8 bg-card border border-border rounded-2xl p-6 flex flex-col shadow-2xl shadow-primary/10 h-full">
              <h2 className="font-bold mb-6 text-4xl text-foreground">
                {competition.group_label}
              </h2>
              <div className="flex-1 overflow-y-auto pr-2 space-y-5">
                {standings.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12 text-2xl">No scores available yet.</div>
                ) : (
                  standings.map((group, index) => (
                    <div
                      key={group._id}
                      className={`relative overflow-hidden flex items-center justify-between p-6 rounded-xl border transition-all duration-500 ${
                        index === 0
                          ? "bg-primary/10 border-primary/30 shadow-[0_0_15px_var(--accent-blue-tint)]"
                          : "bg-muted/50 border-border/50"
                      }`}
                    >
                      {index === 0 && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary shadow-[0_0_10px_var(--primary)]" />
                      )}
                      <div className="flex items-center gap-4 z-10">
                        <div className="font-black text-muted-foreground text-5xl w-16">{index + 1}</div>
                        <div className="font-bold text-foreground text-5xl ml-4">{group.name}</div>
                      </div>
                      <div className="font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-foreground to-muted-foreground text-7xl">
                        {group.total_score}
                        <span className="text-muted-foreground ml-2 font-medium text-3xl">pts</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="col-span-4 flex flex-col gap-6 h-full">
              <div className="bg-card border border-border rounded-2xl p-6 flex-1 flex flex-col overflow-hidden">
                <h2 className="font-bold mb-6 text-3xl text-foreground flex items-center gap-2">
                  <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Recent Updates
                </h2>
                <div className="flex-1 overflow-y-auto pr-2 space-y-5">
                  {ticker.length === 0 ? (
                    <div className="text-center text-muted-foreground py-6 text-xl">No recent results.</div>
                  ) : (
                    ticker.slice(0, 8).map((item) => (
                      <div key={item._id} className="border-l-2 border-primary pl-4 py-2">
                        <div className="text-primary font-semibold uppercase tracking-wider mb-1 text-xl">
                          {item.event?.title || item.event?.name || "Event"}
                        </div>
                        <div className="text-foreground font-medium text-2xl leading-tight">
                          <span className="text-muted-foreground">{item.position}{item.position === 1 ? "st" : item.position === 2 ? "nd" : item.position === 3 ? "rd" : "th"} Place: </span>
                          {item.group?.name || "Unknown"}
                        </div>
                        <div className="text-success font-bold mt-1 text-xl">+{item.points} points</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ─── Standard showcase layout with tabs ───────────────────────────────────────
  return (
    <div className="min-h-screen font-sans bg-background text-foreground flex flex-col">
      <PublicHero competition={competition} />

      <PublicStats stats={stats} primaryColor={primaryColor} groupLabel={competition.group_label} />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8 flex-1 w-full">
        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all duration-200 border-b-2 -mb-px whitespace-nowrap ${
                  isActive
                    ? "text-foreground border-primary bg-primary/5"
                    : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/30"
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content with transitions */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {activeTab === "overview" && (
            <div className="space-y-8">
              <PublicStandings standings={standings} groupLabel={competition.group_label} primaryColor={primaryColor} />

              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5" style={{ color: primaryColor }} />
                  <h2 className="text-xl font-bold text-foreground">Recent Updates</h2>
                </div>
                <PublicTicker ticker={ticker} />
              </section>
            </div>
          )}

          {activeTab === "standings" && (
            <PublicStandings standings={standings} groupLabel={competition.group_label} primaryColor={primaryColor} />
          )}

          {activeTab === "winners" && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Medal className="w-5 h-5" style={{ color: primaryColor }} />
                <h2 className="text-xl font-bold text-foreground">Event Winners</h2>
              </div>
              {winners ? (
                <PublicWinners winners={winners} primaryColor={primaryColor} />
              ) : (
                <div className="text-center text-muted-foreground py-16 border border-dashed border-border rounded-2xl">
                  Loading winners...
                </div>
              )}
            </div>
          )}

          {activeTab === "events" && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ListChecks className="w-5 h-5" style={{ color: primaryColor }} />
                <h2 className="text-xl font-bold text-foreground">All Events</h2>
              </div>
              <PublicResultsByEvent
                events={events}
                results={results}
                groupLabel={competition.group_label}
                onEventClick={handleEventClick}
              />
            </div>
          )}

          {activeTab === "stats" && (
            <div className="space-y-6">
              <PublicParticipationStats stats={statsData || stats} primaryColor={primaryColor} />
              <PublicCategoryStats stats={statsData || stats} primaryColor={primaryColor} />
            </div>
          )}
        </motion.div>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Powered by Resonance — {competition.name} • {competition.year}
      </footer>

      <GatekeeperModal
        isOpen={isGatekeeperOpen}
        onClose={handleCloseGatekeeper}
        competitionName={competition.name}
        competitionSlug={slug}
      />

      {/* Event Detail Modal */}
      {eventDetailLoading && !selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading event details...</p>
          </div>
        </div>
      )}
      {selectedEvent && (
        <PublicEventDetailModal
          event={selectedEvent.event}
          competition={selectedEvent.competition}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
