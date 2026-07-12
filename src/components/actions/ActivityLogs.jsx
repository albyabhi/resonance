import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../AuthContext";
import { RefreshCw, Undo as UndoIcon, Repeat as RedoIcon, Search as SearchIcon, Loader2 } from 'lucide-react';
import { apiJson } from "../../utils/apiClient";
import { useRealtime } from "../../context/RealtimeContext";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";
import { Badge } from "../ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../ui/table";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel, AlertDialogFooter } from "../ui/alert-dialog";

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
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", description: "", onConfirm: null });

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

        const resolvedItems = Array.isArray(payload.results)
          ? payload.results
          : Array.isArray(payload.logs)
          ? payload.logs
          : Array.isArray(payload.items)
          ? payload.items
          : [];

        setLogs(resolvedItems);

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
    const url = `/${resourceType}/${id}`;
    try {
      window.open(url, "_blank");
    } catch {
      navigator.clipboard?.writeText(id);
      setToast({ type: "info", text: "ID copied to clipboard" });
      clearToastAfterDelay();
    }
  };

  const promptConfirm = (title, description, onConfirm) => {
    setConfirmDialog({ open: true, title, description, onConfirm });
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">Activity Logs</h1>
            <p className="text-muted-foreground text-sm">Audit trail of user actions</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setPage(1); fetchLogs(); }}
            >
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-muted-foreground">Role</label>
            <Select
              value={roleFilter}
              onValueChange={(v) => { setRoleFilter(v); setPage(1); }}
            >
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                {roles.map((r) => (
                  <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground">Resource type</label>
            <Select
              value={resourceFilter}
              onValueChange={(v) => { setResourceFilter(v); setPage(1); }}
            >
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                {resourceTypes.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground">User</label>
            <Input
              value={userSearch}
              onChange={(e) => { setUserSearch(e.target.value); setPage(1); }}
              placeholder="Search by name"
              className="mt-1"
            />
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`mb-4 p-3 rounded ${toast.type === 'error' ? 'bg-destructive/10 text-destructive border border-destructive/20' : toast.type === 'success' ? 'bg-accent-green/10 text-accent-green border border-accent-green/20' : 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20'}`}>
            {toast.text}
          </div>
        )}

        {/* Loading banner */}
        {loading && (
          <div className="mb-4 p-3 rounded bg-accent-amber/10 text-accent-amber border border-accent-amber/20 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}

        <Card className="overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(logs) && logs.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell className="text-muted-foreground" colSpan={6}>No logs found</TableCell>
                  </TableRow>
                ) : null}

                {logs.map((l) => (
                  <TableRow key={l._id}>
                    <TableCell>
                      {(() => {
                        const performed = l.user ?? (typeof l.performed_by === 'object' ? l.performed_by : (l.performed_by ? { name: l.performed_by, username: '' } : {}));
                        const displayName = performed?.name || performed?.displayName || performed?.full_name || "-";
                        const displayUsername = performed?.username || performed?.handle || "";
                        return (
                          <>
                            <div className="font-semibold text-card-foreground">{displayName}</div>
                            <div className="text-sm text-muted-foreground">{displayUsername ? `@${displayUsername}` : ""}</div>
                          </>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{(l.role || "").replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-card-foreground">{l.action || l.action_type || "-"}</TableCell>
                    <TableCell className="text-card-foreground">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">{l.resource_type || "-"}</div>
                        {l.resource_id ? (
                          <button
                            onClick={() => handleCopyOrOpen(l.resource_type, l.resource_id)}
                            className="text-xs text-accent-amber hover:underline"
                          >
                            {l.resource_id}
                          </button>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{(l.timestamp || l.createdAt || l.created_at) ? new Date(l.timestamp || l.createdAt || l.created_at).toLocaleString() : "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!l.undoable || workingId !== null}
                          onClick={() => promptConfirm("Undo Action", "Confirm undo this action?", () => doUndo(l._id))}
                          className={l.undoable && workingId === null ? 'bg-accent-amber/10 text-accent-amber hover:bg-accent-amber/20' : ''}
                        >
                          <UndoIcon className="h-4 w-4 mr-1" />
                          {workingId === l._id ? 'Working…' : 'Undo'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!l.redoable || workingId !== null}
                          onClick={() => promptConfirm("Redo Action", "Confirm redo this action?", () => doRedo(l._id))}
                          className={l.redoable && workingId === null ? 'bg-accent-green/10 text-accent-green hover:bg-accent-green/20' : ''}
                        >
                          <RedoIcon className="h-4 w-4 mr-1" />
                          {workingId === l._id ? 'Working…' : 'Redo'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile list */}
          <div className="md:hidden p-3 space-y-3">
            {Array.isArray(logs) && logs.length === 0 && !loading ? (
              <div className="text-muted-foreground">No logs found</div>
            ) : null}

            {logs.map((l) => (
              <div key={l._id} className="border rounded-lg p-3 shadow-sm bg-card border-border">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-card-foreground">
                      {(() => {
                        const performed = l.user ?? (typeof l.performed_by === 'object' ? l.performed_by : (l.performed_by ? { name: l.performed_by, username: '' } : {}));
                        return performed?.name || performed?.displayName || performed?.full_name || "-";
                      })()}
                    </div>
                    <div className="text-sm text-muted-foreground">{l.user?.username ? `@${l.user.username}` : (l.performed_by && typeof l.performed_by === 'string' ? l.performed_by : '')}</div>
                    <div className="text-sm mt-2 text-card-foreground">{l.action || l.action_type || "-"}</div>
                    <div className="text-sm text-muted-foreground mt-1">{l.resource_type || "-"} {l.resource_id ? (<button onClick={() => handleCopyOrOpen(l.resource_type, l.resource_id)} className="text-xs text-accent-amber ml-2">{l.resource_id}</button>) : null}</div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">{(l.timestamp || l.createdAt || l.created_at) ? new Date(l.timestamp || l.createdAt || l.created_at).toLocaleString() : "-"}</div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!l.undoable || workingId !== null}
                    onClick={() => promptConfirm("Undo Action", "Confirm undo this action?", () => doUndo(l._id))}
                    className={`flex-1 ${l.undoable && workingId === null ? 'bg-accent-amber/10 text-accent-amber hover:bg-accent-amber/20' : ''}`}
                  >
                    <UndoIcon className="h-4 w-4 mr-1" />
                    {workingId === l._id ? 'Working…' : 'Undo'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!l.redoable || workingId !== null}
                    onClick={() => promptConfirm("Redo Action", "Confirm redo this action?", () => doRedo(l._id))}
                    className={`flex-1 ${l.redoable && workingId === null ? 'bg-accent-green/10 text-accent-green hover:bg-accent-green/20' : ''}`}
                  >
                    <RedoIcon className="h-4 w-4 mr-1" />
                    {workingId === l._id ? 'Working…' : 'Redo'}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-border flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">Page {page} of {totalPages}</div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >Prev</Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >Next</Button>
            </div>
          </div>
        </Card>
      </div>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { confirmDialog.onConfirm?.(); }}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
