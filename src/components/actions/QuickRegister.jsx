// src/components/QuickRegister.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../AuthContext";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const QuickRegister = () => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [events, setEvents] = useState([]);
  const [students, setStudents] = useState([]);

  const [selectedEventId, setSelectedEventId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  const captainHouseId =
    user?.house?.id || user?.house?._id || user?.house || null;

  const apiCall = async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
      body: options.body,
    });
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

  // bootstrap events + initial students for captain's house
  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        setLoading(true);
        setError("");
        const { events } = await apiCall("/api/event");
        setEvents(events || []);

        if (captainHouseId) {
          const { students } = await apiCall(`/api/students?house_id=${captainHouseId}`);
          setStudents(students || []);
        } else {
          setStudents([]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, captainHouseId]);

  // server-side search restricted to captain's house (debounced)
  const debounceRef = useRef(null);
  useEffect(() => {
    if (!token || !captainHouseId) return;

    // Always query server with house_id and search
    const q = search.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        setError("");
        const url =
          q.length > 0
            ? `/api/students?house_id=${captainHouseId}&search=${encodeURIComponent(q)}`
            : `/api/students?house_id=${captainHouseId}`;
        const { students } = await apiCall(url);
        setStudents(students || []);
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

  // optional client-side filter as fallback (kept minimal since server filters by name)
  const filteredStudents = useMemo(() => students || [], [students]);

  const toggleStudent = (id) => {
    setSelectedStudentIds((prev) => {
      if (isIndividual) {
        if (prev.includes(id)) return [];
        return [id];
      }
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= maxTeam) return prev;
      return [...prev, id];
    });
  };

  const canSubmit = useMemo(() => {
    if (!selectedEvent || !captainHouseId) return false;
    if (isIndividual) return selectedStudentIds.length === 1;
    return selectedStudentIds.length >= minTeam && selectedStudentIds.length <= maxTeam;
  }, [selectedEvent, captainHouseId, isIndividual, selectedStudentIds, minTeam, maxTeam]);

  const submitRegistration = async () => {
    if (!canSubmit) return;
    try {
      setLoading(true);
      setError("");
      const payload = {
        event_id: selectedEventId,
        house_id: captainHouseId,
        member_ids: selectedStudentIds,
      };
      const { team } = await apiCall("/api/team", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setSelectedStudentIds([]);
      alert(`Registered for ${selectedEvent?.name || "event"} successfully! Team ID: ${team?._id || ""}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-gray-900">Quick Register</h2>
        <p className="text-sm text-gray-600">
          Select event and pick eligible students from the house list
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-3">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {/* Event select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Event</label>
          <select
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              setSelectedStudentIds([]);
            }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select an event</option>
            {(events || []).map((e) => {
              const id = e._id || e.event_id;
              return (
                <option key={id} value={id}>
                  {e.name} • {e.event_type} • {e.mode}
                </option>
              );
            })}
          </select>
          {selectedEvent && (
            <p className="mt-1 text-xs text-gray-500">
              {selectedEvent.event_type === "individual"
                ? "Individual event (select 1 student)"
                : `Team event (select ${minTeam}–${maxTeam} students)`}
            </p>
          )}
        </div>

        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search students</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID, or class (within your house)"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Students list */}
        <div className="max-h-72 overflow-y-auto border border-gray-100 rounded-lg">
          {loading ? (
            <div className="p-3 text-sm text-gray-600">Loading…</div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-3 text-sm text-gray-600">No students found</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filteredStudents.map((s) => {
                const checked = selectedStudentIds.includes(s._id);
                return (
                  <li
                    key={s._id}
                    className="flex items-center justify-between px-3 py-2 hover:bg-gray-50"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">{s.name}</div>
                      <div className="text-xs text-gray-500">
                        {s.unique_id} • {s.class}
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type={isIndividual ? "radio" : "checkbox"}
                        name="member"
                        checked={checked}
                        onChange={() => toggleStudent(s._id)}
                        className="h-4 w-4 text-blue-600 border-gray-300"
                      />
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Summary */}
        <div className="text-xs text-gray-600">
          Selected: {selectedStudentIds.length}
          {selectedEvent &&
            ` (required: ${isIndividual ? "1" : `${minTeam}–${maxTeam}`})`}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSelectedStudentIds([])}
            className="flex-1 px-3 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={!canSubmit || loading || !selectedEventId}
            onClick={submitRegistration}
            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Register"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickRegister;
