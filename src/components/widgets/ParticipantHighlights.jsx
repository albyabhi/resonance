import React, { useState, useCallback } from "react";
import { Star, Award, Zap, Sparkles, X, List } from "lucide-react";
import { useCompetition } from "../../context/CompetitionContext";
import { apiFetch } from "../../utils/apiClient";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const getIcon = (index) => {
  if (index === 0) return <Award className="h-4 w-4 text-warning" />;
  if (index === 1) return <Award className="h-4 w-4 text-muted-foreground" />;
  if (index === 2) return <Award className="h-4 w-4 text-accent-amber" />;
  return <Star className="h-4 w-4 text-muted-foreground" />;
};

const getRankClasses = (index) => {
  if (index === 0) {
    return "border-warning/30 bg-warning/10 text-warning";
  }
  if (index === 1) {
    return "border-muted-foreground/30 bg-muted/10 text-muted-foreground";
  }
  if (index === 2) {
    return "border-accent-amber/30 bg-accent-amber/10 text-accent-amber";
  }
  return "border-border bg-muted/30 text-muted-foreground";
};

export default function ParticipantHighlights({ participantStats = { overall: { topPerformers: [], mostParticipations: [] }, byGroup: {} }, userGroupId = null }) {
  const { competition, groupLabel = "Group" } = useCompetition() || {};
  const competitionId = competition?.id || competition?._id || competition?.competition_id;

  const [showAllDialog, setShowAllDialog] = useState(false);
  const [allPerformers, setAllPerformers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  let topPerformers = [];

  if (userGroupId && participantStats?.byGroup?.[userGroupId]) {
    topPerformers = participantStats.byGroup[userGroupId].topPerformers || [];
  } else {
    topPerformers = participantStats?.overall?.topPerformers || [];
  }

  const top3Performers = topPerformers.slice(0, 3);

  const openDialog = useCallback(async () => {
    if (!competitionId) return;
    setShowAllDialog(true);
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/scoreboard/${competitionId}/participants/top?all=true`);
      const json = await res.json();
      if (json.success && json.data?.allPerformers) {
        let list = json.data.allPerformers;
        if (userGroupId) {
          list = list.filter(p => p.group_id === userGroupId);
        }
        setAllPerformers(list);
      } else {
        setAllPerformers([]);
      }
    } catch (err) {
      setError(err.message || "Failed to load rankings");
    } finally {
      setLoading(false);
    }
  }, [competitionId, userGroupId]);

  const closeDialog = () => {
    setShowAllDialog(false);
    setAllPerformers([]);
    setError(null);
  };

  if (!topPerformers.length) {
    return (
      <div>
        <div className="card-secondary flex flex-col items-center justify-center p-6 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
            <Sparkles className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--card-fg)" }}>Participant Highlights</p>
          <p className="mt-1 text-xs text-muted-foreground">Contributions will appear once results are published.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card-secondary max-w-full overflow-hidden">
        <div className="flex flex-col gap-1 border-b px-5 pb-3 pt-5" style={{ borderBottomColor: "var(--border-divider)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold tracking-tight" style={{ color: "var(--card-fg)" }}>
                {userGroupId ? `Your ${groupLabel}'s Stars` : "Top Participants"}
              </h3>
            </div>
          </div>
          <p className="pl-6 text-xs" style={{ color: "var(--chart-axis)" }}>
            {userGroupId ? `Top contributors in your ${groupLabel.toLowerCase()}` : "Top contributors overall"}
          </p>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center gap-1.5 px-1 text-xs font-semibold text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-warning" />
            <span>Top Contributors</span>
          </div>
          <div className="space-y-1.5">
            {top3Performers.map((item, index) => (
              <div
                key={item.participant_id || index}
                className={`flex items-center justify-between rounded-xl border p-3 transition-colors duration-200 ${getRankClasses(index)}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card/70">
                    {getIcon(index)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold" style={{ color: "var(--card-fg)" }}>
                      {item.name}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--chart-axis)" }}>
                      {item.group_name}
                    </p>
                  </div>
                </div>
                <div className="pl-3 text-right">
                  <p className="text-base font-semibold leading-none" style={{ color: "var(--card-fg)" }}>
                    {item.points.toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-[10px]" style={{ color: "var(--chart-axis)" }}>
                    pts
                  </p>
                </div>
              </div>
            ))}
            {!top3Performers.length && (
              <div className="py-4 text-center text-xs text-muted-foreground">
                No contributions recorded in this category yet.
              </div>
            )}
          </div>

          <button
            onClick={openDialog}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-xs font-semibold transition-all duration-200 hover:bg-muted"
            style={{ color: "var(--chart-axis)", borderColor: "var(--border-divider)" }}
          >
            <List className="h-3.5 w-3.5" />
            <span>Show All Rankings</span>
          </button>
        </div>
      </div>

      {showAllDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-md" onClick={closeDialog} />
          <div
            className="relative flex w-full max-w-lg max-h-[85vh] flex-col overflow-hidden rounded-3xl border shadow-2xl z-10 animate-in zoom-in-95 duration-200"
            style={{ backgroundColor: "var(--card)", borderColor: "var(--border-card)" }}
          >
            <div className="flex items-center justify-between border-b p-5" style={{ borderBottomColor: "var(--border-divider)" }}>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                <h3 className="text-base font-semibold" style={{ color: "var(--card-fg)" }}>
                  {userGroupId ? `${groupLabel} Rankings` : "All Participant Rankings"}
                </h3>
              </div>
              <button
                onClick={closeDialog}
                className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-muted"
              >
                <X className="h-4 w-4" style={{ color: "var(--chart-axis)" }} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-1.5">

              {error && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <p className="text-xs text-destructive">{error}</p>
                  <button
                    onClick={openDialog}
                    className="text-xs font-semibold text-primary hover:text-primary-strong"
                  >
                    Try again
                  </button>
                </div>
              )}

              {!loading && !error && !allPerformers.length && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Sparkles className="h-6 w-6" style={{ color: "var(--chart-axis)" }} />
                  <p className="text-xs" style={{ color: "var(--chart-axis)" }}>No contributions recorded yet.</p>
                </div>
              )}

              {!loading && !error && allPerformers.map((item, index) => (
                <div
                  key={item.participant_id || index}
                  className={`flex items-center justify-between rounded-xl border p-3 transition-colors duration-200 ${getRankClasses(index)}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card/70">
                      {getIcon(index)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold" style={{ color: "var(--card-fg)" }}>
                        {item.name}
                      </p>
                      <p className="text-[11px]" style={{ color: "var(--chart-axis)" }}>
                        {item.group_name}
                      </p>
                    </div>
                  </div>
                  <div className="pl-3 text-right">
                    <p className="text-base font-semibold leading-none" style={{ color: "var(--card-fg)" }}>
                      {item.points.toLocaleString()}
                    </p>
                    <p className="mt-0.5 text-[10px]" style={{ color: "var(--chart-axis)" }}>
                      pts
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}