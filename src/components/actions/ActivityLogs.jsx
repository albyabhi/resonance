import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../AuthContext";
import { RefreshCw, Undo as UndoIcon, Repeat as RedoIcon, Search as SearchIcon, Loader2 } from 'lucide-react';
import { apiJson } from "../../utils/apiClient";
import { useRealtime } from "../../context/RealtimeContext";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const roles = ["super_admin", "organizer", "event_coordinator", "judge", "participant", "house_captain"];

export default function ActivityLogs() {
  const { token } = useAuth();
  const { lastUpdate } = useRealtime() || {};
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  const [roleFilter, setRoleFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const [toast, setToast] = useState(null);

  const apiCall = async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    const data = await apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body,
    });
    return data;
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", page);
      params.set("limit", perPage);
      if (roleFilter) params.set("role", roleFilter);
      if (resourceFilter) params.set("resource_type", resourceFilter);
      if (userSearch) params.set("user", userSearch);

      const payload = await apiCall(`/api/logs?${params.toString()}`);
      if (Array.isArray(payload)) {
        setLogs(payload);
        setTotalPages(1);
      } else {

        // Support several common backend shapes: { results: [...] }, { logs: [...] }, { items: [...], total, page, limit }
        const resolvedItems = Array.isArray(payload.results)
          ? payload.results
          : Array.isArray(payload.logs)
          ? payload.logs
          : Array.isArray(payload.items)
          ? payload.items
          : [];

        setLogs(resolvedItems);

        // Derive totalPages using available metadata
        const total = typeof payload.total === 'number' ? payload.total : (payload.totalItems || payload.count || 0);
        const limit = typeof payload.limit === 'number' && payload.limit > 0 ? payload.limit : (payload.limit || perPage);
        const computedTotalPages = total > 0 ? Math.max(1, Math.ceil(total / limit)) : (payload.totalPages || 1);
        setTotalPages(computedTotalPages);
      }
    } catch (err) {
      console.warn("Failed to load logs:", err.message);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page, roleFilter, resourceFilter, userSearch, lastUpdate]);

  const resourceTypes = useMemo(() => {
    const set = new Set();
    logs.forEach((l) => l.resource_type && set.add(l.resource_type));
    return Array.from(set).sort();
  }, [logs]);

  const [workingId, setWorkingId] = useState(null);

  const doUndo = async (id) => {
    if (!window.confirm("Confirm undo this action?")) return;
    setWorkingId(id);
    setLoading(true);
    try {
      await apiCall(`/api/logs/undo/${id}`, { method: "POST" });
      setToast({ type: "success", text: "Undo successful" });
      await fetchLogs();
    } catch (err) {
      setToast({ type: "error", text: err.message || "Undo failed" });
    } finally {
      setWorkingId(null);
      setLoading(false);
      clearToastAfterDelay();
    }
  };

  const doRedo = async (id) => {
    if (!window.confirm("Confirm redo this action?")) return;
    setWorkingId(id);
    setLoading(true);
    try {
      await apiCall(`/api/logs/redo/${id}`, { method: "POST" });
      setToast({ type: "success", text: "Redo successful" });
      await fetchLogs();
    } catch (err) {
      setToast({ type: "error", text: err.message || "Redo failed" });
    } finally {
      setWorkingId(null);
      setLoading(false);
      clearToastAfterDelay();
    }
  };

  const clearToastAfterDelay = () => {
    setTimeout(() => setToast(null), 3000);
  };

  const handleCopyOrOpen = (resourceType, id) => {
    if (!id) return;
    // try to open logical resource path, fallback to copy
    const url = `/${resourceType}/${id}`;
    try {
      window.open(url, "_blank");
    } catch {
      navigator.clipboard?.writeText(id);
      setToast({ type: "info", text: "ID copied to clipboard" });
      clearToastAfterDelay();
    }
  };

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--card-fg)' }}>Activity Logs</h1>
            <p className="text-gray-600 text-sm">Audit trail of user actions</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setPage(1); fetchLogs(); }}
              title="Refresh"
              className="inline-flex items-center gap-2 px-3 py-2 border rounded shadow-sm text-sm"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm" style={{ color: 'var(--chart-axis)' }}>Role</label>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="mt-1 block w-full rounded border px-3 py-2 focus:outline-none"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
            >
              <option value="" className="bg-white dark:bg-[#0B1220]">All</option>
              {roles.map((r) => (
                <option key={r} value={r} className="bg-white dark:bg-[#0B1220]">{r.replace("_", " ")}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm" style={{ color: 'var(--chart-axis)' }}>Resource type</label>
            <select
              value={resourceFilter}
              onChange={(e) => { setResourceFilter(e.target.value); setPage(1); }}
              className="mt-1 block w-full rounded border px-3 py-2 focus:outline-none"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
            >
              <option value="" className="bg-white dark:bg-[#0B1220]">All</option>
              {resourceTypes.map((r) => (
                <option key={r} value={r} className="bg-white dark:bg-[#0B1220]">{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm" style={{ color: 'var(--chart-axis)' }}>User</label>
            <input
              value={userSearch}
              onChange={(e) => { setUserSearch(e.target.value); setPage(1); }}
              placeholder="Search by name"
              className="mt-1 block w-full rounded border px-3 py-2 focus:outline-none"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
            />
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`mb-4 p-3 rounded ${toast.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
            {toast.text}
          </div>
        )}

        {/* Loading banner */}
        {loading && (
          <div className="mb-4 p-3 rounded bg-orange-50 text-orange-700 border border-orange-100 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        )}

        <div className="rounded-xl shadow-sm overflow-hidden border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-card)' }}>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b" style={{ backgroundColor: 'var(--surface)', borderBottomColor: 'var(--border-divider)' }}>
                <tr>
                  <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--card-fg)' }}>User</th>
                  <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--card-fg)' }}>Role</th>
                  <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--card-fg)' }}>Action</th>
                  <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--card-fg)' }}>Resource</th>
                  <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--card-fg)' }}>Timestamp</th>
                  <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--card-fg)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(logs) && logs.length === 0 && !loading ? (
                  <tr><td className="p-4 text-gray-600" colSpan={6}>No logs found</td></tr>
                ) : null}

                {logs.map((l) => (
                  <tr key={l._id} className="border-b transition-colors hover:bg-indigo-500/5" style={{ borderBottomColor: 'var(--border-divider)' }}>
                    <td className="p-4">
                      {(() => {
                        const performed = l.user ?? (typeof l.performed_by === 'object' ? l.performed_by : (l.performed_by ? { name: l.performed_by, username: '' } : {}));
                        const displayName = performed?.name || performed?.displayName || performed?.full_name || "-";
                        const displayUsername = performed?.username || performed?.handle || "";
                        return (
                          <>
                            <div className="font-semibold" style={{ color: 'var(--card-fg)' }}>{displayName}</div>
                            <div className="text-sm text-gray-500">{displayUsername ? `@${displayUsername}` : ""}</div>
                          </>
                        );
                      })()}
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 text-xs font-medium rounded-full border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--chart-axis)' }}>{(l.role || "").replace("_", " ")}</span>
                    </td>
                    <td className="p-4 text-gray-700" style={{ color: 'var(--card-fg)' }}>{l.action || l.action_type || "-"}</td>
                    <td className="p-4 text-gray-700" style={{ color: 'var(--card-fg)' }}>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">{l.resource_type || "-"}</div>
                        {l.resource_id ? (
                          <button
                            onClick={() => handleCopyOrOpen(l.resource_type, l.resource_id)}
                            className="text-xs text-orange-600 hover:underline"
                          >
                            {l.resource_id}
                          </button>
                        ) : null}
                      </div>
                    </td>
                    <td className="p-4 text-gray-600 text-sm" style={{ color: 'var(--chart-axis)' }}>{(l.timestamp || l.createdAt || l.created_at) ? new Date(l.timestamp || l.createdAt || l.created_at).toLocaleString() : "-"}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => doUndo(l._id)}
                          disabled={!l.undoable || workingId !== null}
                          title={l.undoable ? 'Undo this action' : 'Cannot undo'}
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded text-sm ${l.undoable && workingId === null ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                        >
                          <UndoIcon className="h-4 w-4" />
                          {workingId === l._id ? 'Working…' : 'Undo'}
                        </button>
                        <button
                          onClick={() => doRedo(l._id)}
                          disabled={!l.redoable || workingId !== null}
                          title={l.redoable ? 'Redo this action' : 'Cannot redo'}
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded text-sm ${l.redoable && workingId === null ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                        >
                          <RedoIcon className="h-4 w-4" />
                          {workingId === l._id ? 'Working…' : 'Redo'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="md:hidden p-3 space-y-3">
            {Array.isArray(logs) && logs.length === 0 && !loading ? (
              <div className="text-gray-600">No logs found</div>
            ) : null}

            {logs.map((l) => (
              <div key={l._id} className="border rounded-lg p-3 shadow-sm" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-divider)' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold" style={{ color: 'var(--card-fg)' }}>
                      {(() => {
                        const performed = l.user ?? (typeof l.performed_by === 'object' ? l.performed_by : (l.performed_by ? { name: l.performed_by, username: '' } : {}));
                        return performed?.name || performed?.displayName || performed?.full_name || "-";
                      })()}
                    </div>
                    <div className="text-sm text-gray-500">{l.user?.username ? `@${l.user.username}` : (l.performed_by && typeof l.performed_by === 'string' ? l.performed_by : '')}</div>
                    <div className="text-sm mt-2" style={{ color: 'var(--card-fg)' }}>{l.action || l.action_type || "-"}</div>
                    <div className="text-sm text-gray-500 mt-1">{l.resource_type || "-"} {l.resource_id ? (<button onClick={() => handleCopyOrOpen(l.resource_type, l.resource_id)} className="text-xs text-orange-600 ml-2">{l.resource_id}</button>) : null}</div>
                  </div>
                  <div className="text-right text-sm text-gray-500">{(l.timestamp || l.createdAt || l.created_at) ? new Date(l.timestamp || l.createdAt || l.created_at).toLocaleString() : "-"}</div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => doUndo(l._id)} disabled={!l.undoable || workingId !== null} className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded text-sm ${l.undoable && workingId === null ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-100 text-gray-400'}`}><UndoIcon className="h-4 w-4" /> {workingId === l._id ? 'Working…' : 'Undo'}</button>
                  <button onClick={() => doRedo(l._id)} disabled={!l.redoable || workingId !== null} className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded text-sm ${l.redoable && workingId === null ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}><RedoIcon className="h-4 w-4" /> {workingId === l._id ? 'Working…' : 'Redo'}</button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="p-4 border-t flex flex-col md:flex-row items-center justify-between gap-3" style={{ borderTop: '1px solid var(--border-divider)', backgroundColor: 'var(--card)' }}>
            <div className="text-sm" style={{ color: 'var(--chart-axis)' }}>Page {page} of {totalPages}</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 rounded disabled:opacity-50 text-sm font-bold border"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
              >Prev</button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 rounded disabled:opacity-50 text-sm font-bold border"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-divider)', color: 'var(--card-fg)' }}
              >Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
