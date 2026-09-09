import { useCallback, useEffect, useState } from "react";

const DISMISS_KEY = "pwa-install-dismissed";

/**
 * usePWAInstall — wraps the `beforeinstallprompt` lifecycle.
 *
 * - Captures the deferred prompt so UI can trigger it on user gesture.
 * - Persists dismissal in localStorage (never nag).
 * - Detects iOS (no beforeinstallprompt) so UI can show manual instructions.
 * - Returns `isInstalled` (standalone display-mode or `appinstalled` event).
 */
export default function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia?.("(display-mode: standalone)").matches ||
        window.navigator?.standalone === true
      : false
  );
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    const onDisplayMode = (e) => {
      if (e.matches) setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    const mq = window.matchMedia?.("(display-mode: standalone)");
    mq?.addEventListener?.("change", onDisplayMode);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      mq?.removeEventListener?.("change", onDisplayMode);
    };
  }, []);

  const canInstall = Boolean(deferredPrompt) && !isInstalled && !dismissed;

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice.catch(() => ({
      outcome: "dismissed",
    }));
    if (outcome === "accepted") {
      setIsInstalled(true);
    } else {
      try {
        localStorage.setItem(DISMISS_KEY, "1");
      } catch {
        /* storage blocked — just hide for this session */
      }
      setDismissed(true);
    }
    setDeferredPrompt(null);
    return outcome === "accepted";
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }, []);

  const isIOS =
    typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

  return { canInstall, promptInstall, dismiss, isInstalled, isIOS, dismissed };
}
