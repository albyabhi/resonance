import { useState, useEffect, useCallback, useRef } from "react";
import { apiJson } from "../utils/apiClient";
import toast from "react-hot-toast";
import {
  queueAction,
  getPendingActions,
  getPendingCount,
  markSynced,
  markFailed,
  clearSynced,
  createClientActionId,
} from "../lib/offlineDb";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

export default function useOfflineQueue() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch {
      // silently fail — offline DB may not be available
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const handler = () => refreshCount();
    window.addEventListener("OFFLINE_QUEUE_CHANGED", handler);
    window.addEventListener("online", handler);
    return () => {
      window.removeEventListener("OFFLINE_QUEUE_CHANGED", handler);
      window.removeEventListener("online", handler);
    };
  }, [refreshCount]);

  const enqueueScore = useCallback(
    async (payload) => {
      const client_action_id = createClientActionId();
      await queueAction("score_submit", { ...payload, client_action_id });
      toast("Score saved offline — will sync when online", {
        icon: "📡",
        duration: 3000,
      });
      return client_action_id;
    },
    []
  );

  const enqueueRegistration = useCallback(
    async (payload) => {
      const client_action_id = createClientActionId();
      await queueAction("registration", { ...payload, client_action_id });
      toast("Registration saved offline — will sync when online", {
        icon: "📡",
        duration: 3000,
      });
      return client_action_id;
    },
    []
  );

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setIsSyncing(true);

    try {
      const pending = await getPendingActions();
      if (pending.length === 0) {
        setIsSyncing(false);
        syncingRef.current = false;
        return;
      }

      let synced = 0;
      for (const action of pending) {
        try {
          let endpoint = "";
          let body = {};

          if (action.type === "score_submit") {
            endpoint = "/api/judge/scores";
            body = {
              event_id: action.payload.event_id,
              round_no: action.payload.round_no,
              team_id: action.payload.team_id,
              scores: action.payload.scores,
              client_action_id: action.payload.client_action_id,
            };
            if (action.payload.submit) {
              endpoint += "?submit=true";
            }
          } else if (action.type === "registration") {
            endpoint = "/api/captain/register-for-event";
            body = {
              event_id: action.payload.event_id,
              participant_ids: action.payload.participant_ids,
              team_name: action.payload.team_name,
              client_action_id: action.payload.client_action_id,
            };
          } else {
            await markFailed(action.id, "Unknown action type");
            continue;
          }

          const resp = await apiJson(`${API_BASE_URL}${endpoint}`, {
            method: "POST",
            body: JSON.stringify(body),
          });

          if (resp.success || resp.data) {
            await markSynced(action.id, resp);
            synced++;
          } else {
            await markFailed(action.id, resp?.error || "Unknown error");
          }
        } catch (err) {
          if (err?.status >= 400 && err?.status < 500) {
            await markFailed(action.id, err.message);
          } else {
            throw err;
          }
        }
      }

      if (synced > 0) {
        await clearSynced();
        toast.success(`${synced} action(s) synced successfully`);
      }
    } catch {
      toast.error("Sync failed — will retry automatically");
    } finally {
      setIsSyncing(false);
      syncingRef.current = false;
      await refreshCount();
    }
  }, [refreshCount]);

  useEffect(() => {
    if (navigator.onLine && pendingCount > 0 && !syncingRef.current) {
      syncNow();
    }
  }, [pendingCount, syncNow]);

  useEffect(() => {
    const handleOnline = () => {
      if (pendingCount > 0) {
        syncNow();
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [pendingCount, syncNow]);

  return {
    pendingCount,
    isSyncing,
    syncNow,
    enqueueScore,
    enqueueRegistration,
  };
}
