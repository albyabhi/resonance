import { useState, useEffect } from "react";
import { useAuth } from "../components/AuthContext";
import { apiJson } from "../utils/apiClient";
import usePermission from "./usePermission";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const listFrom = (payload, key) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export default function useDashboardData() {
  const { token, lastCompetition, isAuthReady } = useAuth();
  const { hasPermission } = usePermission();
  const [data, setData] = useState({
    scoreboard: [],
    events: [],
    results: [],
    schedules: [],
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
        const competitionId = lastCompetition?.id || lastCompetition?._id || lastCompetition?.competition_id;
        const competitionQuery = competitionId ? `?competition_id=${encodeURIComponent(competitionId)}` : "";
        const scoreboardEndpoint = competitionId ? `/api/scoreboard/${competitionId}` : "/api/scoreboard";
        const endpoints = [
          apiCall(scoreboardEndpoint),
          apiCall(`/api/event${competitionQuery}`)
        ];
        
        // Admins, Coordinators, Faculty might optionally need more, but we can fetch them uniformly or selectively.
        endpoints.push(apiCall(`/api/results${competitionQuery}`));
        endpoints.push(apiCall("/api/schedule/batch")); // Use explicit batch path if we have it or base route
        
        // Admin specfic usage overview
        if (hasPermission("view_event_usage")) {
          endpoints.push(apiCall(`/api/event/usage${competitionQuery}`));
        }

        const responses = await Promise.allSettled(endpoints);

        if (!mounted) return;

        const scoreboardRes = responses[0].status === "fulfilled" && responses[0].value ? responses[0].value : { overall: [], byEvent: [] };
        const eventsRes = responses[1].status === "fulfilled" ? listFrom(responses[1].value, "events") : [];
        const resultsRes = responses[2]?.status === "fulfilled" ? listFrom(responses[2].value, "results") : [];
        const schedulesRes = responses[3]?.status === "fulfilled" ? listFrom(responses[3].value, "schedules") : [];
        
        let sysStats = null;
        if (hasPermission("view_event_usage") && responses[4]?.status === "fulfilled" && responses[4].value) {
          sysStats = responses[4].value;
        }

        setData({
          scoreboard: Array.isArray(scoreboardRes) ? scoreboardRes : scoreboardRes.overall || [],
          events: eventsRes || [],
          results: resultsRes || [],
          schedules: schedulesRes || [],
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
  }, [token, lastCompetition, isAuthReady, hasPermission]);

  return { data, loading, error };
}
