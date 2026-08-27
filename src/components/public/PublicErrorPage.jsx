import React from "react";

export default function PublicErrorPage({ status, message }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-6">
      <div className="text-center max-w-md space-y-4 bg-card border border-border rounded-2xl p-8 shadow-[var(--shadow-card)]">
        <div className="text-7xl font-black font-heading text-muted-foreground">{status || "!"}</div>
        <h1 className="text-xl font-bold text-foreground">This page is unavailable</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <a
          href="/"
          className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-strong transition-colors"
        >
          Back to Resonance
        </a>
      </div>
    </div>
  );
}
