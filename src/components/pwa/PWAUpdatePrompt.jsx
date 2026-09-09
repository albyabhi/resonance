import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

/**
 * PWAUpdatePrompt — shows "New version available → Reload" when the
 * Workbox SW (registerType: autoUpdate) signals `pwa:need-refresh`.
 * Non-blocking bottom banner; reload applies the waiting SW immediately.
 */
export default function PWAUpdatePrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = () => setVisible(true);
    window.addEventListener("pwa:need-refresh", show);
    return () => window.removeEventListener("pwa:need-refresh", show);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 right-4 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-2xl p-4 shadow-xl sm:left-auto sm:right-6"
      style={{
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
        color: "var(--foreground)",
      }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: "var(--accent-teal-tint)", color: "var(--accent-teal)" }}
        aria-hidden="true"
      >
        <RefreshCw className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">Update available</p>
        <p className="mt-0.5 text-xs leading-snug" style={{ color: "var(--muted-foreground)" }}>
          A new version of Resonance is ready.
        </p>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors"
        style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
      >
        Reload
      </button>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Dismiss update prompt"
        className="shrink-0 rounded-full p-1.5 transition-colors hover:opacity-70"
        style={{ color: "var(--muted-foreground)" }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
