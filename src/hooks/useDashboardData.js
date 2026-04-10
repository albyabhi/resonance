import { useState, useEffect } from "react";
import { useAuth } from "../components/AuthContext";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

export default function useDashboardData() {
  const { token, role } = useAuth();
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
    
    // Don't fetch if token is missing and we aren't a guest (or even for guest, we might need no token endpoints)
    // Actually, Guest role might need public endpoints, but let's assume public APIs exist or we pass token if exists.
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const apiCall = async (endpoint) => {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, { headers });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) return null; // Gracefully handle auth error if guest
        throw new Error(`API error: ${res.status}`);
      }
      return res.json();
    };

    const fetchAllData = async () => {
      setLoading(true);
      try {
        const endpoints = [
          apiCall("/api/scoreboard"),
          apiCall("/api/event")
        ];
        
        // Admins, Coordinators, Faculty might optionally need more, but we can fetch them uniformly or selectively.
        endpoints.push(apiCall("/api/results"));
        endpoints.push(apiCall("/api/schedule/batch")); // Use explicit batch path if we have it or base route
        
        // Admin specfic usage overview
        if (role === "admin") {
          endpoints.push(apiCall("/api/event/usage"));
        }

        const responses = await Promise.allSettled(endpoints);

        if (!mounted) return;

        const scoreboardRes = responses[0].status === "fulfilled" && responses[0].value ? responses[0].value : { overall: [], byEvent: [] };
        const eventsRes = responses[1].status === "fulfilled" && responses[1].value ? responses[1].value.events : [];
        const resultsRes = responses[2]?.status === "fulfilled" && responses[2].value ? responses[2].value.results : [];
        const schedulesRes = responses[3]?.status === "fulfilled" && responses[3].value ? responses[3].value.schedules : [];
        
        let sysStats = null;
        if (role === "admin" && responses[4]?.status === "fulfilled" && responses[4].value) {
          sysStats = responses[4].value;
        }

        setData({
          scoreboard: scoreboardRes.overall || [],
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
  }, [token, role]);

  return { data, loading, error };
}
