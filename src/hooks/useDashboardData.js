import { useState, useEffect } from "react";
import { useAuth } from "../components/AuthContext";
import { apiJson } from "../utils/apiClient";
import usePermission from "./usePermission";
import { useRealtime } from "../context/RealtimeContext";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const listFrom = (payload, key) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export default function useDashboardData() {
  const { token, competition, isAuthReady } = useAuth();
  const { hasAnyRole } = usePermission();
  const { lastUpdate } = useRealtime() || {};
  const [data, setData] = useState({
    scoreboard: [],
    events: [],
    results: [],
    schedules: [],
    participantStats: { overall: { topPerformers: [], mostParticipations: [] }, byGroup: {} },
    systemStats: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    
    const apiCall = async (endpoint) => {
      try {
        return await apiJson(`${API_BASE_URL}${endpoint}`, {
          headers: { "Content-Type": "application/json" },
          unwrapData: true,
          _token: token,
        });
      } catch (err) {
        if (err.status === 401 || err.status === 403) return null;
        throw err;
      }
    };

    const fetchAllData = async () => {
      if (!token || !isAuthReady) {
        if (mounted) setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const competitionId = competition?.id || competition?._id || competition?.competition_id;
        const competitionQuery = competitionId ? `?competition_id=${encodeURIComponent(competitionId)}` : "";
        const scoreboardEndpoint = competitionId ? `/api/scoreboard/${competitionId}` : "/api/scoreboard";
        const endpoints = [
          apiCall(scoreboardEndpoint),
          apiCall(`/api/event${competitionQuery}`),
          apiCall(`/api/results${competitionQuery}`),
          apiCall("/api/schedule/batch")
        ];
        
        if (competitionId) {
          endpoints.push(apiCall(`/api/scoreboard/${competitionId}/participants/top`));
        } else {
          endpoints.push(Promise.resolve(null));
        }
        
        // Admin specfic usage overview
        if (hasAnyRole("organizer", "super_admin")) {
          endpoints.push(apiCall(`/api/event/usage${competitionQuery}`));
        }

        const responses = await Promise.allSettled(endpoints);

        if (!mounted) return;

        const scoreboardRes = responses[0].status === "fulfilled" && responses[0].value ? responses[0].value : { overall: [], byEvent: [] };
        const eventsRes = responses[1].status === "fulfilled" ? listFrom(responses[1].value, "events") : [];
        const resultsRes = responses[2]?.status === "fulfilled" ? listFrom(responses[2].value, "results") : [];
        const schedulesRes = responses[3]?.status === "fulfilled" ? listFrom(responses[3].value, "schedules") : [];
        const participantStatsRes = responses[4]?.status === "fulfilled" && responses[4].value ? responses[4].value.data : { overall: { topPerformers: [], mostParticipations: [] }, byGroup: {} };
        
        let sysStats = null;
        if (hasAnyRole("organizer", "super_admin") && responses[5]?.status === "fulfilled" && responses[5].value) {
          sysStats = responses[5].value;
        }

        setData({
          scoreboard: Array.isArray(scoreboardRes) ? scoreboardRes : scoreboardRes.overall || [],
          events: eventsRes || [],
          results: resultsRes || [],
          schedules: schedulesRes || [],
          participantStats: participantStatsRes || { overall: { topPerformers: [], mostParticipations: [] }, byGroup: {} },
          systemStats: sysStats,
        });

      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAllData();

    return () => {
      mounted = false;
    };
  }, [token, competition, isAuthReady, hasAnyRole, lastUpdate]);

  return { data, loading, error };
}
