import React, { useEffect, useState } from "react";
import { Wifi } from "lucide-react";

const SECTIONS = [
  { id: "standings", label: "Standings" },
  { id: "winners", label: "Winners" },
  { id: "participants", label: "Top Participants" },
  { id: "events", label: "Events" },
  { id: "statistics", label: "Statistics" },
];

// Sticky in-page nav for the single-scroll public page.
// Scrollspy highlights the section in view; every link is a real anchor
// so /view/:slug#events deep-links and back-button work.
export default function PublicSectionNav({ eventCount, isLive, lastUpdateLabel }) {
  const [activeSection, setActiveSection] = useState("standings");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
    );

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    const syncFromHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (SECTIONS.some((s) => s.id === hash)) setActiveSection(hash);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);

    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", syncFromHash);
    };
  }, []);

  return (
    <div className="sticky top-0 z-30 glass border-b border-border">
      <div className="container-public flex items-center gap-1 overflow-x-auto py-2">
        <nav aria-label="Page sections" className="flex items-center gap-1 flex-1 min-w-0">
          {SECTIONS.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                aria-current={isActive ? "true" : undefined}
                className={`shrink-0 inline-flex items-center gap-2 px-4 min-h-11 rounded-lg text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {section.label}
                {section.id === "events" && typeof eventCount === "number" && (
                  <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-muted text-xs font-bold tabular-nums">
                    {eventCount}
                  </span>
                )}
              </a>
            );
          })}
        </nav>

        <div className="hidden sm:flex items-center gap-2 pl-3 shrink-0">
          {isLive && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-success">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
              Live
            </span>
          )}
          {lastUpdateLabel && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wifi className="h-3 w-3" aria-hidden="true" />
              {lastUpdateLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
