import React, { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { FadeIn } from "./AnimateReveal";
import { Trophy, Medal, Crown, User, Activity } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

function HouseStandings({ eventId = null, showCaptain = false }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [captainData, setCaptainData] = useState({});

  const apiCall = async (endpoint) => {
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const res = await fetch(`${API_BASE_URL}${endpoint}`, { headers });
    if (!res.ok) throw new Error("API call failed");
    return res.json();
  };

  const fetchCaptainProfile = async (houseId) => {
    try {
      if (captainData[houseId]) return captainData[houseId];
      const data = await apiCall(`/api/house/captain/${houseId}`);
      const captain = data.captain || {};
      setCaptainData((prev) => ({ ...prev, [houseId]: captain }));
      return captain;
    } catch {
      return {};
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const endpoint = eventId ? `/api/scoreboard?event_id=${eventId}` : "/api/scoreboard";
        const data = await apiCall(endpoint);
        const sorted = eventId
          ? (data.byEvent || []).map((it) => ({ name: it.house_id?.name || "", code: it.house_id?.code || "", house_id: it.house_id?._id || "", points: it.points || 0 }))
          : (data.overall || []).map((it) => ({ name: it.house?.name || "", code: it.house?.code || "", house_id: it.house?._id || "", points: it.points || 0 }));

        sorted.sort((a, b) => b.points - a.points);
        setRows(sorted.map((h, i) => ({ rank: i + 1, ...h })));

        if (showCaptain) {
          for (const house of sorted) {
            if (house.house_id) await fetchCaptainProfile(house.house_id);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [eventId, showCaptain]);

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="h-4 w-4 text-indigo-500" />;
    if (rank === 2) return <Medal className="h-4 w-4 text-slate-400" />;
    if (rank === 3) return <Medal className="h-4 w-4 text-violet-400" />;
    return <span className="text-xs" style={{ color: 'var(--chart-axis)' }}>{rank}</span>;
  };

  const getRankBg = (rank) => {
    if (rank === 1) return "bg-indigo-50 dark:bg-indigo-500/15 border-indigo-100 dark:border-indigo-500/30";
    if (rank === 2) return "bg-slate-50 dark:bg-slate-500/10 border-slate-100 dark:border-slate-500/20";
    if (rank === 3) return "bg-violet-50 dark:bg-violet-500/10 border-violet-100 dark:border-violet-500/20";
    return "bg-slate-50/50 dark:bg-slate-900 border-slate-100 dark:border-white/5";
  };

  return (
    <FadeIn delay={0.1} className="card-premium h-full w-full max-w-full overflow-hidden">
      <header className="mb-6 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-xl font-semibold" style={{ color: 'var(--card-fg)' }}>House standings</h3>
        </div>
        <p className="pl-7 text-sm" style={{ color: 'var(--chart-axis)' }}>{eventId ? "Current event standings" : "Aggregate platform performance"}</p>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
          Error retrieving standings: {error}
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          [1, 2, 3, 4].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse dark:bg-gray-900" />)
        ) : rows.length === 0 ? (
          <div className="py-20 text-center">
            <Activity className="mx-auto mb-4 h-10 w-10 text-gray-300 dark:text-gray-700" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No standings data recorded yet</p>
          </div>
        ) : (
          rows.map((house) => {
            const captain = captainData[house.house_id];
            return (
              <div key={`${house.rank}-${house.code}`} className={`flex items-center justify-between rounded-2xl border p-4 ${getRankBg(house.rank)}`} style={house.rank > 3 ? { backgroundColor: 'var(--surface)' } : {}}>
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-inherit shadow-sm" style={{ backgroundColor: 'var(--card)' }}>
                    {getRankIcon(house.rank)}
                  </div>

                  {showCaptain && captain?.profile_image ? (
                    <img src={captain.profile_image} alt="" className="h-10 w-10 rounded-xl border border-gray-200 object-cover dark:border-gray-800" />
                  ) : showCaptain ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                  ) : null}

                  <div className="min-w-0">
                    <p className="truncate font-semibold" style={{ color: 'var(--card-fg)' }}>{house.name || "-"}</p>
                    <div className="flex items-center gap-3">
                      <p className="text-xs" style={{ color: 'var(--chart-axis)' }}>{house.code}</p>
                      {showCaptain && captain?.name && <p className="truncate text-xs text-indigo-600 dark:text-indigo-400">Captain: {captain.name}</p>}
                    </div>
                  </div>
                </div>

                <div className="pl-4 text-right">
                  <p className="text-lg font-semibold leading-none" style={{ color: 'var(--card-fg)' }}>{house.points.toLocaleString()}</p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--chart-axis)' }}>Points</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </FadeIn>
  );
}

export default HouseStandings;
