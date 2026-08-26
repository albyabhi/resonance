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
import PublicErrorPage from "../../components/public/PublicErrorPage";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { apiJson } from "../../utils/apiClient";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function PublicViewPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const isKiosk = searchParams.get("display") === "kiosk";
  const { isAuthenticated } = useAuth();
  const { lastUpdate } = useRealtime() || {};

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("results");
  const [isGatekeeperOpen, setIsGatekeeperOpen] = useState(false);
  const [lastManualRefresh, setLastManualRefresh] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await apiJson(`${API_BASE_URL}/api/public/${slug}/dashboard`);
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
        setError({ status: res.status, message: "Something went wrong while loading this page." });
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

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  useLiveScore(slug, () => {
    fetchDashboard();
  });

  useEffect(() => {
    if (!loading && data && !isAuthenticated && !isKiosk) {
      const dismissed = sessionStorage.getItem(`gatekeeper_dismissed_${slug}`);
      if (dismissed !== "true") {
        setIsGatekeeperOpen(true);
      }
    }
  }, [loading, data, isAuthenticated, isKiosk, slug]);

  const handleCloseGatekeeper = () => {
    setIsGatekeeperOpen(false);
    sessionStorage.setItem(`gatekeeper_dismissed_${slug}`, "true");
  };

  const getLastUpdateTime = () => {
    const time = lastUpdate || lastManualRefresh;
    if (!time) return null;
    const diff = Date.now() - time;
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

  const handleManualRefresh = () => {
    setLastManualRefresh(Date.now());
    fetchDashboard();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>Loading Live Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <PublicErrorPage status={error?.status} message={error?.message || "Competition not found."} />;
  }

  const { competition, stats, standings, events, results, ticker } = data;
  const primaryColor = competition.branding?.primary_color || "#2563EB";

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
          <div className="text-xs text-muted-foreground font-medium flex items-center gap-2">
            {getLastUpdateTime() ? (
              <>
                <Wifi className="h-3 w-3 text-success" />
                Last updated: <span className="font-mono font-bold">{getLastUpdateTime()}</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-muted-foreground" />
                Offline
              </>
            )}
          </div>
        </div>

        <h1 className="text-6xl font-black text-center mt-12 mb-10 bg-gradient-to-r from-primary to-primary-strong bg-clip-text text-transparent">
          {competition.name}
        </h1>

        <main className="flex-1 px-10 pb-10 flex flex-col gap-6">
          <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
            <div className="col-span-8 bg-card border border-border rounded-2xl p-6 flex flex-col shadow-2xl shadow-primary/10 h-full">
              <h2 className="font-bold mb-6 text-4xl text-foreground flex items-center gap-2">
                <svg className="w-8 h-8 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Standings
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
                          ? "bg-primary/10 border-primary/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                          : "bg-muted/50 border-border/50"
                      }`}
                    >
                      {index === 0 && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
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
              <div className="bg-card border border-border rounded-2xl p-6 flex-none">
                <h2 className="font-bold mb-4 text-3xl text-foreground">Event Progress</h2>
                <div className="flex justify-between items-end mb-2">
                  <span className="font-bold text-foreground text-5xl">{stats.progress_percent}%</span>
                  <span className="text-muted-foreground font-medium text-xl">
                    {stats.completed_events} / {stats.event_count} Events
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full overflow-hidden h-6">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${stats.progress_percent}%`,
                      background: `linear-gradient(to right, ${primaryColor}, #6366f1)`,
                    }}
                  ></div>
                </div>
              </div>

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

  // ─── Standard showcase layout ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen font-sans bg-background text-foreground">
      <PublicHero competition={competition} />

      <div className="max-w-6xl mx-auto px-6 pb-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">
            {getLastUpdateTime() ? (
              <>
                <Wifi className="h-3 w-3 inline mr-1 text-success" />
                Live &middot; Last updated: <span className="font-mono font-bold">{getLastUpdateTime()}</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 inline mr-1 text-muted-foreground" />
                Offline &middot; Last updated: <span className="font-mono font-bold">Unknown</span>
              </>
            )}
          </span>
          <button
            onClick={handleManualRefresh}
            className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted border border-border hover:border-muted-foreground/50 transition-colors"
            title="Refresh now"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      <PublicStats stats={stats} primaryColor={primaryColor} />

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-12">
        <PublicStandings standings={standings} groupLabel={competition.group_label} primaryColor={primaryColor} />

        <section>
          <div className="flex items-center gap-3 mb-6 border-b border-border">
            <button
              type="button"
              onClick={() => setActiveTab("results")}
              className={`px-4 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px ${
                activeTab === "results"
                  ? "text-foreground border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              Results by Event
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ticker")}
              className={`px-4 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px ${
                activeTab === "ticker"
                  ? "text-foreground border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              Recent Updates
            </button>
          </div>

          {activeTab === "results" ? (
            <PublicResultsByEvent events={events} results={results} groupLabel={competition.group_label} />
          ) : (
            <PublicTicker ticker={ticker} />
          )}
        </section>
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
    </div>
  );
}