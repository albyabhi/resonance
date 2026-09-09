import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Share2, Check, ArrowUp, X } from "lucide-react";
import { useLiveScore } from "../../hooks/useLiveScore";
import usePublicDashboard from "../../hooks/usePublicDashboard";
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
import PublicKiosk from "../../components/public/PublicKiosk";
import PublicSectionNav from "../../components/public/PublicSectionNav";
import { LIVE_STATUSES, timeAgo } from "../../lib/publicUtils";
import { fireWinnerConfetti } from "../../components/public/winnerConfetti";
import { Skeleton } from "../../components/ui/skeleton";

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border hero-bg">
        <div className="container-public py-8 flex items-center gap-5">
          <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-8 w-56 max-w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
          </div>
        </div>
      </div>
      <div className="container-public">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-5">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="border-y border-border">
        <div className="container-public flex gap-1 py-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-11 w-24 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="container-public py-8 space-y-10">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </div>
  );
}

function SectionHeading({ title, sub, count }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-baseline gap-2.5 flex-wrap">
        {title}
        {typeof count === "number" && (
          <span className="text-sm font-semibold text-muted-foreground tabular">{count}</span>
        )}
      </h2>
      {sub && <p className="text-sm text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function PublicViewPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const isKiosk = searchParams.get("display") === "kiosk";
  const { isAuthenticated } = useAuth();
  const { lastUpdate } = useRealtime() || {};

  const {
    dashboard,
    winners,
    detailedStats,
    selectedEvent,
    eventDetailLoading,
    loading,
    error,
    refreshSilent,
    fetchEventDetail,
    closeEventDetail,
  } = usePublicDashboard(slug);

  const [isGatekeeperOpen, setIsGatekeeperOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(
    () => sessionStorage.getItem(`guest_banner_dismissed_${slug}`) === "true"
  );
  const [linkCopied, setLinkCopied] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const confettiFiredRef = useRef(false);

  // Re-arm the one-time celebration when navigating between competitions.
  useEffect(() => {
    confettiFiredRef.current = false;
  }, [slug]);

  // Fires once per page view: hover (desktop) and first scroll-into-view
  // (touch) both funnel here; the ref guard makes repeats impossible.
  const celebrateWinnersOnce = useCallback(() => {
    if (confettiFiredRef.current) return;
    if (!winners || Object.keys(winners).length === 0) return;
    confettiFiredRef.current = true;
    fireWinnerConfetti(dashboard?.competition?.branding?.primary_color);
  }, [winners, dashboard]);

  // Touch fallback: hovering doesn't exist on phones, so the first time the
  // Winners section scrolls into view counts as the single trigger.
  useEffect(() => {
    if (loading || !dashboard) return;
    const target = document.getElementById("winners");
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          celebrateWinnersOnce();
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [loading, dashboard, celebrateWinnersOnce]);

  useLiveScore(slug, refreshSilent);

  useEffect(() => {
    const interval = setInterval(refreshSilent, 30000);
    return () => clearInterval(interval);
  }, [refreshSilent]);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 900);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Deep-link scroll with sticky-nav offset handled by scroll-margin.
  useEffect(() => {
    if (loading || !dashboard) return;
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const target = document.getElementById(hash);
    if (target) setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, [loading, dashboard]);

  const dismissBanner = () => {
    setBannerDismissed(true);
    sessionStorage.setItem(`guest_banner_dismissed_${slug}`, "true");
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: dashboard?.competition?.name || "Resonance", url });
        return;
      } catch {
        // User cancelled — fall through to clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Clipboard unavailable (insecure context) — no-op, URL stays visible.
    }
  };

  const lastUpdateLabel = useMemo(() => {
    if (!lastUpdate) return null;
    const diff = Date.now() - lastUpdate;
    if (diff < 30 * 1000) return "Just now";
    return timeAgo(new Date(Date.now() - diff).toISOString()) || null;
  }, [lastUpdate]);

  if (loading) return <LoadingSkeleton />;
  if (error || !dashboard) {
    return <PublicErrorPage status={error?.status} message={error?.message || "Competition not found."} />;
  }

  const { competition, stats, standings, events, results, ticker } = dashboard;
  const primaryColor = competition.branding?.primary_color || "var(--primary)";
  const groupLabel = competition.group_label || "Group";
  const statsForSections = detailedStats || stats;
  const isLive = events.some((event) => LIVE_STATUSES.includes(event.status));
  const showGuestBanner = !loading && !isAuthenticated && !isKiosk && !bannerDismissed;

  if (isKiosk) {
    return (
      <PublicKiosk
        competition={competition}
        standings={standings}
        ticker={ticker}
        lastUpdate={lastUpdate}
      />
    );
  }

  return (
    <div className="min-h-screen font-sans bg-background text-foreground flex flex-col">
      <PublicHero competition={competition} />
      <PublicStats stats={stats} primaryColor={primaryColor} groupLabel={groupLabel} />
      <PublicSectionNav
        eventCount={events.length}
        isLive={isLive}
        lastUpdateLabel={lastUpdateLabel}
      />

      <main className="container-public py-8 sm:py-10 space-y-12 sm:space-y-14 flex-1 w-full">
        <section id="standings" aria-labelledby="standings-heading" className="scroll-mt-20">
          <div id="standings-heading">
            <SectionHeading
              title="Standings"
              sub={`Overall ${groupLabel.toLowerCase()} rankings, updated live as results publish.`}
              count={standings.length}
            />
          </div>
          <PublicStandings standings={standings} groupLabel={groupLabel} />
          <div className="mt-8">
            <h3 className="text-base font-bold text-foreground mb-3">Recent updates</h3>
            <PublicTicker ticker={ticker} />
          </div>
        </section>

        <section id="winners" aria-labelledby="winners-heading" className="scroll-mt-20" onMouseEnter={celebrateWinnersOnce}>
          <div id="winners-heading">
            <SectionHeading
              title="Winners"
              sub="Top-three finishes per event."
              count={winners ? Object.keys(winners).length : undefined}
            />
          </div>
          {winners ? (
            <PublicWinners winners={winners} primaryColor={primaryColor} />
          ) : (
            <div className="space-y-2.5" aria-label="Loading winners">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          )}
        </section>

        <section id="events" aria-labelledby="events-heading" className="scroll-mt-20">
          <div id="events-heading">
            <SectionHeading
              title="Events"
              sub="Search the schedule and open any event for full placements."
              count={events.length}
            />
          </div>
          <PublicResultsByEvent
            events={events}
            results={results}
            groupLabel={groupLabel}
            onEventClick={fetchEventDetail}
          />
        </section>

        <section id="statistics" aria-labelledby="statistics-heading" className="scroll-mt-20">
          <div id="statistics-heading">
            <SectionHeading
              title="Statistics"
              sub="Progress and category breakdown for this competition."
            />
          </div>
          <div className="space-y-4">
            <PublicParticipationStats stats={statsForSections} primaryColor={primaryColor} />
            <PublicCategoryStats stats={statsForSections} />
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="container-public py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            Powered by Resonance — {competition.name}
            {competition.year ? ` · ${competition.year}` : ""}
          </p>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-2 min-h-11 px-4 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
          >
            {linkCopied ? (
              <Check className="w-4 h-4 text-success" aria-hidden="true" />
            ) : (
              <Share2 className="w-4 h-4" aria-hidden="true" />
            )}
            {linkCopied ? "Link copied" : "Share this page"}
          </button>
        </div>
      </footer>

      {showGuestBanner && (
        <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-40 bg-card border border-border rounded-xl shadow-soft p-4 flex items-start gap-3">
          <p className="text-sm flex-1 min-w-0">
            <span className="font-semibold text-foreground">Taking part in {competition.name}?</span>
            <span className="block text-muted-foreground text-[13px] mt-0.5">
              Log in to see your events and registrations.
            </span>
          </p>
          <button
            type="button"
            onClick={() => setIsGatekeeperOpen(true)}
            className="shrink-0 min-h-11 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
          >
            Join
          </button>
          <button
            type="button"
            onClick={dismissBanner}
            aria-label="Dismiss"
            className="shrink-0 w-11 h-11 -m-1 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {showBackToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          className="fixed bottom-20 sm:bottom-6 right-4 sm:right-auto sm:left-6 z-40 w-11 h-11 rounded-full bg-foreground text-background shadow-soft flex items-center justify-center"
        >
          <ArrowUp className="w-5 h-5" aria-hidden="true" />
        </button>
      )}

      <GatekeeperModal
        isOpen={isGatekeeperOpen}
        onClose={() => setIsGatekeeperOpen(false)}
        competitionName={competition.name}
        competitionSlug={slug}
      />

      {eventDetailLoading && !selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="status" aria-label="Loading event details">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-card border border-border rounded-xl p-8 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading event details…</p>
          </div>
        </div>
      )}
      <PublicEventDetailModal
        event={selectedEvent?.event}
        competition={selectedEvent?.competition}
        onClose={closeEventDetail}
      />
    </div>
  );
}
