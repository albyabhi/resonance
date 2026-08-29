// ── Phase 2 – Wrap the app with ThemeProvider ────────────────
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./components/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { CompetitionProvider } from "./context/CompetitionContext";
import { RealtimeProvider } from "./context/RealtimeContext";
import { Toaster } from "react-hot-toast";

// Fire-and-forget wake ping — hits backend as early as possible so cold
// starts begin before providers mount and auth validation runs.
// eslint-disable-next-line no-restricted-syntax
fetch(`${import.meta.env.VITE_BACKEND_URL}/wake`, {
  method: "GET",
  credentials: "include",
}).catch(() => {});

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ThemeProvider
      attribute="class"       /* Tailwind uses the .dark class        */
      defaultTheme="system"   /* Respect OS preference on first visit */
      enableSystem             /* Watch prefers-color-scheme live      */
      enableColorScheme        /* Auto-inject <meta name="color-scheme"> */
    >
      <AuthProvider>
        <CompetitionProvider>
          <RealtimeProvider>
            <Toaster position="top-center" />
            <App />
          </RealtimeProvider>
        </CompetitionProvider>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);
