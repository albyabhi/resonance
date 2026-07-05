import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, Wifi } from "lucide-react";
import useOfflineQueue from "../hooks/useOfflineQueue";

export default function OfflineIndicator() {
  const { pendingCount, isSyncing, syncNow } = useOfflineQueue();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!pendingCount && isOnline) return null;

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm font-semibold mb-4" style={{ color: "var(--chart-axis)" }}>
        <Wifi className="h-4 w-4 text-amber-500 shrink-0" />
        <span>You are offline. Changes will sync when reconnected.</span>
        {pendingCount > 0 && (
          <span className="ml-auto text-xs bg-amber-500/20 px-2 py-1 rounded-full text-amber-600">
            {pendingCount} pending
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-sm font-semibold mb-4" style={{ color: "var(--chart-axis)" }}>
      <CloudOff className="h-4 w-4 text-indigo-500 shrink-0" />
      <span>{pendingCount} action(s) pending sync</span>
      <button
        onClick={syncNow}
        disabled={isSyncing}
        className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg transition-all disabled:opacity-50 font-bold"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
        {isSyncing ? "Syncing..." : "Sync Now"}
      </button>
    </div>
  );
}
