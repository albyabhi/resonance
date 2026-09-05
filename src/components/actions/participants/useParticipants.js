import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiJson, API_ROUTES, buildUrl } from "../../../utils/apiClient";
import { buildParticipantListParams, PARTICIPANT_PAGE_SIZE } from "./participantUi";

const SEARCH_DEBOUNCE_MS = 350;

function stripEmpty(params) {
  const next = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== "" && value !== undefined && value !== null) next[key] = value;
  }
  return next;
}

export default function useParticipants({ token, competitionId }) {
  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  const [participants, setParticipants] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(PARTICIPANT_PAGE_SIZE);

  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState("");
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [debouncedClass, setDebouncedClass] = useState("");

  const [selectedIds, setSelectedIds] = useState([]);
  const abortRef = useRef(null);
  const requestSeq = useRef(0);

  const apiCall = useCallback(async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(`${buildUrl(endpoint)}`, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      body: options.body || undefined,
    });
  }, [token]);

  // Debounce free-text filters so typing does not refetch per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedClass(filterClass.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filterClass]);

  // Reset to first page whenever the effective filter set changes.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, debouncedClass, filterGroup, filterStatus, competitionId]);

  useEffect(() => {
    if (!token || !competitionId) return;
    let cancelled = false;
    const loadGroups = async () => {
      setGroupsLoading(true);
      try {
        const groupsResp = await apiCall(API_ROUTES.COMPETITIONS.GROUPS(competitionId));
        if (!cancelled) setGroups(Array.isArray(groupsResp) ? groupsResp : groupsResp.groups || []);
      } catch {
        if (!cancelled) setGroups([]);
      } finally {
        if (!cancelled) setGroupsLoading(false);
      }
    };
    loadGroups();
    return () => { cancelled = true; };
  }, [token, competitionId, apiCall]);

  const fetchParticipants = useCallback(async ({ silent = false } = {}) => {
    if (!token || !competitionId) return;
    const seq = requestSeq.current + 1;
    requestSeq.current = seq;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (!hasLoadedOnce) setIsInitialLoading(true);
    else if (!silent) setIsRefetching(true);
    if (!silent) setError("");
    try {
      const params = stripEmpty(buildParticipantListParams({
        competitionId,
        groupId: filterGroup,
        klass: debouncedClass,
        status: filterStatus,
        search: debouncedSearch,
        page,
        limit,
      }));
      const url = API_ROUTES.PARTICIPANTS.LIST(params);
      const res = await apiCall(url);
      if (requestSeq.current !== seq || controller.signal.aborted) return;
      const rows = res?.participants || [];
      setParticipants(rows);
      setTotal(typeof res?.total === "number" ? res.total : rows.length);
      // Keep selection across refetches; drop ids no longer present only when
      // the row set is authoritative for the current filter page.
      setSelectedIds((prev) => prev.filter((id) => rows.some((row) => row._id === id)));
      setHasLoadedOnce(true);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err?.name === "AbortError") return;
      setError(err.message);
    } finally {
      if (requestSeq.current === seq && !controller.signal.aborted) {
        setIsInitialLoading(false);
        setIsRefetching(false);
      }
    }
  }, [token, competitionId, filterGroup, debouncedClass, filterStatus, debouncedSearch, page, limit, apiCall, hasLoadedOnce]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  const groupNameById = useMemo(() => {
    const map = new Map();
    for (const group of groups) map.set(group._id, group.name);
    return map;
  }, [groups]);

  const getGroupName = useCallback((id) => groupNameById.get(id) || "", [groupNameById]);

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const selectPage = useCallback(() => {
    setSelectedIds(participants.map((row) => row._id));
  }, [participants]);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const prependParticipant = useCallback((participant) => {
    if (!participant) return;
    setParticipants((prev) => [participant, ...prev]);
    setTotal((prev) => prev + 1);
  }, []);

  const removeParticipants = useCallback((ids) => {
    const idSet = new Set(ids);
    setParticipants((prev) => prev.filter((row) => !idSet.has(row._id)));
    setSelectedIds((prev) => prev.filter((id) => !idSet.has(id)));
    setTotal((prev) => Math.max(0, prev - ids.length));
  }, []);

  return {
    apiCall,
    groups,
    groupsLoading,
    participants,
    total,
    page,
    limit,
    setPage,
    isInitialLoading,
    isRefetching,
    error,
    setError,
    searchInput,
    setSearchInput,
    debouncedSearch,
    filterGroup,
    setFilterGroup,
    filterStatus,
    setFilterStatus,
    filterClass,
    setFilterClass,
    selectedIds,
    toggleSelect,
    selectPage,
    clearSelection,
    getGroupName,
    fetchParticipants,
    prependParticipant,
    removeParticipants,
    setParticipants,
  };
}
