import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, TrendingDown } from "lucide-react";
import { apiFetch } from "../../utils/apiClient";
import PublicParticipantDetailModal from "./PublicParticipantDetailModal";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

function positionBadgeClass(position) {
  if (position === 1) return "bg-warning text-white";
  if (position === 2) return "bg-muted-foreground text-white";
  if (position === 3) return "bg-accent-amber text-white";
  return "bg-muted text-muted-foreground";
}

// Public Top Participants — guest-safe mirror of the dashboard
// ParticipantHighlights widget (name + group + points only, no PII).
// Cards on phones, real table on sm+, same tokens as PublicStandings.
export default function PublicTopParticipants({ data, slug, primaryColor = "var(--primary)" }) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [allPerformers, setAllPerformers] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [errorAll, setErrorAll] = useState(null);

  // Participant-detail dialog state (lazy public detail fetch, cached per id).
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const detailCacheRef = useRef(new Map());
  const detailAbortRef = useRef(null);

  const topPerformers = useMemo(
    () => data?.overall?.topPerformers || [],
    [data]
  );

  const baseList = showAll && allPerformers.length ? allPerformers : topPerformers;

  const visibleList = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return baseList;
    return baseList.filter(
      (item) =>
        (item.name || "").toLowerCase().includes(needle) ||
        (item.group_name || "").toLowerCase().includes(needle)
    );
  }, [baseList, query]);

  const toggleAll = async () => {
    if (showAll) {
      setShowAll(false);
      return;
    }
    if (allPerformers.length) {
      setShowAll(true);
      return;
    }
    if (!slug) return;
    setLoadingAll(true);
    setErrorAll(null);
    try {
      const res = await apiFetch(
        `${API_BASE_URL}/api/public/${slug}/participants/top?all=true`
      );
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const json = await res.json();
      const list = json?.data?.allPerformers || [];
      setAllPerformers(list);
      setShowAll(true);
    } catch (err) {
      setErrorAll(err.message || "Failed to load rankings");
    } finally {
      setLoadingAll(false);
    }
  };

  const fetchDetail = async (participantId, { bypassCache = false } = {}) => {
    if (!slug || !participantId) return;
    if (!bypassCache && detailCacheRef.current.has(participantId)) {
      setDetail(detailCacheRef.current.get(participantId));
      setDetailError(null);
      setDetailLoading(false);
      return;
    }
    if (detailAbortRef.current) detailAbortRef.current.abort();
    const controller = new AbortController();
    detailAbortRef.current = controller;
    setDetailLoading(true);
    setDetailError(null);
    try {
      const res = await apiFetch(
        `${API_BASE_URL}/api/public/${slug}/participants/${participantId}`,
        { signal: controller.signal }
      );
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const json = await res.json();
      const payload = json?.data || null;
      if (payload) detailCacheRef.current.set(participantId, payload);
      setDetail(payload);
    } catch (err) {
      if (err?.name === "AbortError") return;
      setDetailError(err.message || "Failed to load details");
    } finally {
      setDetailLoading(false);
    }
  };

  const openParticipant = (item) => {
    const participantId = item?.participant_id;
    if (!participantId) return;
    setSelectedId(participantId);
    setDetail(null);
    fetchDetail(participantId);
  };

  const closeParticipant = () => {
    if (detailAbortRef.current) detailAbortRef.current.abort();
    setSelectedId(null);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(false);
  };

  const retryDetail = () => {
    if (selectedId) fetchDetail(selectedId, { bypassCache: true });
  };

  // Rankings refresh live (SSE + poll) — drop cached details so re-opens
  // refetch, and silently refresh the open dialog to avoid stale points.
  useEffect(() => {
    detailCacheRef.current.clear();
    if (selectedId) fetchDetail(selectedId, { bypassCache: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => () => detailAbortRef.current?.abort(), []);

  if (!topPerformers.length) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-xl">
        <p className="font-semibold text-foreground">No top participants yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Contributions appear here as soon as results are published.
        </p>
      </div>
    );
  }

  const totalCount = showAll && allPerformers.length
    ? allPerformers.length
    : topPerformers.length;

  return (
    <div>
      <label className="relative block mb-3">
        <span className="sr-only">Search participants</span>
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search participants or groups…"
          className="theme-input min-h-11 pl-9 pr-3 py-2 text-sm"
        />
      </label>

      {visibleList.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <p className="font-semibold text-foreground">No participants match</p>
          <p className="text-sm text-muted-foreground mt-1">Try a different search.</p>
        </div>
      ) : (
        <>
          <ol className="sm:hidden space-y-2.5" aria-label="Top participants">
            {visibleList.map((item, index) => (
              <li
                key={item.participant_id || index}
                className={`bg-card border rounded-xl overflow-hidden transition-colors ${
                  index === 0 ? "border-primary/40 bg-primary/5" : "border-border"
                }`}
              >
                <button
                  type="button"
                  onClick={() => openParticipant(item)}
                  aria-label={`View details for ${item.name}`}
                  className="w-full flex items-center gap-3 px-3.5 py-3 min-h-16 text-left hover:bg-muted/40 active:bg-muted/60 transition-colors"
                >
                <span
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold tabular shrink-0 ${positionBadgeClass(index + 1)}`}
                  aria-label={`Rank ${index + 1}`}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-foreground truncate leading-tight">
                    {item.name}
                  </span>
                  <span className="block text-xs text-muted-foreground mt-0.5 truncate">
                    {item.group_name}
                    {typeof item.participations === "number" ? ` · ${item.participations} event${item.participations === 1 ? "" : "s"}` : ""}
                  </span>
                </span>
                <span className="text-right shrink-0">
                  <span className="block text-xl font-bold text-foreground tabular leading-none">
                    {(item.points || 0).toLocaleString()}
                  </span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">pts</span>
                </span>
                </button>
              </li>
            ))}
          </ol>

          <div className="hidden sm:block bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-130">
                <caption className="sr-only">All participant rankings</caption>
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs">
                    <th scope="col" className="text-left px-4 py-3 font-semibold w-14">
                      Rank
                    </th>
                    <th scope="col" className="text-left px-4 py-3 font-semibold">
                      Participant
                    </th>
                    <th scope="col" className="text-left px-4 py-3 font-semibold">
                      Group
                    </th>
                    <th scope="col" className="text-right px-4 py-3 font-semibold">
                      Points
                    </th>
                    <th scope="col" className="text-right px-4 py-3 font-semibold">
                      Events
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleList.map((item, index) => (
                    <tr
                      key={item.participant_id || index}
                      onClick={() => openParticipant(item)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openParticipant(item);
                        }
                      }}
                      tabIndex={0}
                      aria-label={`View details for ${item.name}`}
                      className={`border-b border-border/60 last:border-0 hover:bg-muted/40 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-primary ${
                        index === 0 ? "bg-primary/5" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold tabular ${positionBadgeClass(index + 1)}`}
                        >
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground truncate max-w-45">
                        {item.name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground truncate max-w-45">
                        {item.group_name}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-foreground tabular">
                        {(item.points || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground tabular">
                        {typeof item.participations === "number" ? (
                          <span className="inline-flex items-center justify-end gap-1 tabular">
                            {index > 0 && (
                              <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" />
                            )}
                            {item.participations}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {errorAll && (
        <p className="text-xs text-destructive mt-3" role="alert">
          {errorAll}{" "}
          <button
            type="button"
            onClick={toggleAll}
            className="font-semibold underline underline-offset-2"
            style={{ color: primaryColor }}
          >
            Try again
          </button>
        </p>
      )}

      {(topPerformers.length >= 5 || showAll) && visibleList.length > 0 && (
        <button
          type="button"
          onClick={toggleAll}
          disabled={loadingAll}
          aria-expanded={showAll}
          className="mt-4 inline-flex items-center gap-1.5 min-h-11 px-4 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors disabled:opacity-60"
        >
          {loadingAll
            ? "Loading rankings…"
            : showAll
              ? "Show fewer rankings"
              : `Show all rankings (${totalCount}+)`}
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${showAll ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      )}

      <PublicParticipantDetailModal
        detail={detail}
        loading={detailLoading}
        error={detailError}
        onClose={closeParticipant}
        onRetry={retryDetail}
      />
    </div>
  );
}
