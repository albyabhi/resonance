import { Download, Share, X } from "lucide-react";
import usePWAInstall from "../../hooks/usePWAInstall";

/**
 * InstallBanner — global, non-blocking PWA install affordance.
 * Mounted once in <App /> alongside <RouteTransitionVeil />.
 *
 * - Chromium/Android: shows only when `beforeinstallprompt` fired (canInstall).
 * - iOS Safari: shows one-time "Share → Add to Home Screen" hint.
 * - Dismissal persists in localStorage; never auto-pops after dismiss/install.
 */
export default function InstallBanner() {
  const { canInstall, promptInstall, dismiss, isInstalled, isIOS, dismissed } =
    usePWAInstall();

  if (isInstalled) return null;

  const showIOSHint = isIOS && !dismissed && !canInstall;

  if (!canInstall && !showIOSHint) return null;

  return (
    <div
      role="dialog"
      aria-label="Install Resonance app"
      className="fixed bottom-4 left-4 right-4 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-2xl p-4 shadow-xl sm:left-auto sm:right-6"
      style={{
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
        color: "var(--foreground)",
      }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: "var(--accent-amber-tint)", color: "var(--primary)" }}
        aria-hidden="true"
      >
        {showIOSHint ? <Share className="h-5 w-5" /> : <Download className="h-5 w-5" />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">Install Resonance</p>
        <p className="mt-0.5 text-xs leading-snug" style={{ color: "var(--muted-foreground)" }}>
          {showIOSHint
            ? "Tap Share, then “Add to Home Screen” for quick access."
            : "Add it to your home screen for quick access."}
        </p>
      </div>

      {!showIOSHint && (
        <button
          type="button"
          onClick={promptInstall}
          className="shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors"
          style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          Install
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="shrink-0 rounded-full p-1.5 transition-colors hover:opacity-70"
        style={{ color: "var(--muted-foreground)" }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
