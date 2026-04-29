import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../AuthContext";
import { useCompetition } from "../../context/CompetitionContext";
import { apiJson } from "../../utils/apiClient";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const QuickRegister = () => {
  const { token, user } = useAuth();
  const { groupLabel } = useCompetition();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [events, setEvents] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);

  const captainHouseId = user?.house?.id || user?.house?._id || user?.house || null;

  const apiCall = async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body,
    });
  };

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        setLoading(true);
        setError("");
        const { events } = await apiCall("/api/event");
        setEvents(events || []);

        if (captainHouseId) {
          const { participants } = await apiCall(`/api/participants?house_id=${captainHouseId}`);
          setParticipants(participants || []);
        } else {
          setParticipants([]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, captainHouseId]);

  const debounceRef = useRef(null);
  useEffect(() => {
    if (!token || !captainHouseId) return;
    const q = search.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        setError("");
        const url =
          q.length > 0
            ? `/api/participants?house_id=${captainHouseId}&search=${encodeURIComponent(q)}`
            : `/api/participants?house_id=${captainHouseId}`;
        const { participants } = await apiCall(url);
        setParticipants(participants || []);
      } catch (err) {
        setError(err.message);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [search, token, captainHouseId]);

  const selectedEvent = useMemo(
    () => (events || []).find((e) => (e._id || e.event_id) === selectedEventId) || null,
    [events, selectedEventId]
  );

  const isIndividual = selectedEvent?.event_type === "individual";
  const minTeam = selectedEvent?.min_team_size || 1;
  const maxTeam = selectedEvent?.max_team_size || (isIndividual ? 1 : 1);
  const filteredParticipants = useMemo(() => participants || [], [participants]);

  const toggleParticipant = (id) => {
    setSelectedParticipantIds((prev) => {
      if (isIndividual) return prev.includes(id) ? [] : [id];
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= maxTeam) return prev;
      return [...prev, id];
    });
  };

  const canSubmit = useMemo(() => {
    if (!selectedEvent || !captainHouseId) return false;
    if (isIndividual) return selectedParticipantIds.length === 1;
    return selectedParticipantIds.length >= minTeam && selectedParticipantIds.length <= maxTeam;
  }, [selectedEvent, captainHouseId, isIndividual, selectedParticipantIds, minTeam, maxTeam]);

  const submitRegistration = async () => {
    if (!canSubmit) return;
    try {
      setLoading(true);
      setError("");
      const payload = {
        event_id: selectedEventId,
        house_id: captainHouseId,
        member_ids: selectedParticipantIds,
      };
      const { team } = await apiCall("/api/team", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setSelectedParticipantIds([]);
      alert(`Registered for ${selectedEvent?.name || "event"} successfully. Team ID: ${team?._id || ""}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="theme-card p-4">
      <div className="mb-3">
        <h2 className="text-lg font-semibold theme-text-primary">Quick Register</h2>
        <p className="text-sm theme-text-secondary">Select an event and pick eligible participants from the house list.</p>
      </div>

      {error && <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">{error}</div>}

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium theme-text-secondary">Event</label>
          <select
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              setSelectedParticipantIds([]);
            }}
            className="theme-input px-3 py-2"
          >
            <option value="">Select an event</option>
            {(events || []).map((e) => {
              const id = e._id || e.event_id;
              return (
                <option key={id} value={id}>
                  {e.name} - {e.event_type} - {e.mode}
                </option>
              );
            })}
          </select>
          {selectedEvent && (
            <p className="mt-1 text-xs theme-text-secondary">
              {selectedEvent.event_type === "individual" ? "Individual event (select 1 participant)" : `Team event (select ${minTeam}-${maxTeam} participants)`}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium theme-text-secondary">Search participants</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID, or class"
            className="theme-input px-3 py-2"
          />
        </div>

        <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-800">
          {loading ? (
            <div className="p-3 text-sm theme-text-secondary">Loading...</div>
          ) : filteredParticipants.length === 0 ? (
            <div className="p-3 text-sm theme-text-secondary">No participants found</div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredParticipants.map((s) => {
                const checked = selectedParticipantIds.includes(s._id);
                return (
                  <li key={s._id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-900">
                    <div>
                      <div className="text-sm font-medium theme-text-primary">{s.name}</div>
                      <div className="text-xs theme-text-secondary">
                        {s.unique_id} - {s.class}
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type={isIndividual ? "radio" : "checkbox"}
                        name="member"
                        checked={checked}
                        onChange={() => toggleParticipant(s._id)}
                        className="h-4 w-4 border-gray-300 text-indigo-600"
                      />
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="text-xs theme-text-secondary">
          Selected: {selectedParticipantIds.length}
          {selectedEvent && ` (required: ${isIndividual ? "1" : `${minTeam}-${maxTeam}`})`}
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={() => setSelectedParticipantIds([])} className="theme-panel flex-1 rounded-lg px-3 py-2 text-gray-700 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800">
            Clear
          </button>
          <button
            type="button"
            disabled={!canSubmit || loading || !selectedEventId}
            onClick={submitRegistration}
            className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Register"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickRegister;
