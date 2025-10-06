// src/components/HouseStandings.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

function HouseStandings({ eventId = null }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]); // [{ rank, name, code, points }]

  const apiCall = async (endpoint) => {
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const res = await fetch(`${API_BASE_URL}${endpoint}`, { headers });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Invalid JSON response from server");
    }
    if (!res.ok) throw new Error(data.message || "API call failed");
    return data;
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const endpoint = eventId
          ? `/api/scoreboard?event_id=${eventId}`
          : "/api/scoreboard";

        const data = await apiCall(endpoint);

        // If eventId present, use byEvent; else use overall aggregate
        if (eventId) {
          const list = (data.byEvent || []).map((it) => ({
            name: it.house_id?.name || "",
            code: it.house_id?.code || "",
            points: it.points || 0,
          }));
          const sorted = list.sort((a, b) => b.points - a.points);
          setRows(sorted.map((h, i) => ({ rank: i + 1, ...h })));
        } else {
          const list = (data.overall || []).map((it) => ({
            name: it.house?.name || "",
            code: it.house?.code || "",
            points: it.points || 0,
          }));
          const sorted = list.sort((a, b) => b.points - a.points);
          setRows(sorted.map((h, i) => ({ rank: i + 1, ...h })));
        }
      } catch (err) {
        setError(err.message);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [API_BASE_URL, token, eventId]);

  // Optional color mapping by rank or house code
  const rankColor = (rank) => {
    if (rank === 1) return "bg-yellow-500";
    if (rank === 2) return "bg-gray-400";
    if (rank === 3) return "bg-amber-700";
    return "bg-gray-300";
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h3 className="font-semibold mb-2">🏆 House Standings</h3>
      <p className="text-sm text-gray-500 mb-3">
        {eventId ? "Event leaderboard" : "Current leaderboard"}
      </p>

      {error && (
        <div className="text-sm text-red-600 mb-2">{error}</div>
      )}

      {loading ? (
        <div className="text-sm text-gray-600">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-gray-600">No standings yet</div>
      ) : (
        rows.map((house) => (
          <div
            key={`${house.rank}-${house.code}`}
            className="flex justify-between items-center p-3 mb-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
          >
            {/* Left side: Rank + House info */}
            <div className="flex items-center space-x-3">
              {/* Rank circle */}
              <span
                className={`w-7 h-7 flex items-center justify-center rounded-full text-white text-sm font-bold ${rankColor(house.rank)}`}
              >
                {house.rank}
              </span>
              {/* House name + code */}
              <div>
                <p className="font-medium">{house.name || "—"}</p>
                <p className="text-xs text-gray-500">{house.code || ""}</p>
              </div>
            </div>
            {/* Right side: Points */}
            <span className="text-sm font-semibold text-gray-700">
              {house.points} points
            </span>
          </div>
        ))
      )}
    </div>
  );
}

export default HouseStandings;
