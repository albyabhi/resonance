import React from "react";

const COPY = {
  404: {
    title: "Competition not found",
    body: "This link looks out of date. Ask the organizer for the current public link.",
  },
  403: {
    title: "This competition is private",
    body: "The organizer hasn't made this competition public yet. Contact them for access.",
  },
  410: {
    title: "This competition has closed",
    body: "Results were archived by the organizer and are no longer publicly available.",
  },
  fallback: {
    title: "This page is unavailable",
    body: "Something went wrong while loading. Check your connection and try again.",
  },
};

export default function PublicErrorPage({ status, message }) {
  const copy = COPY[status] || COPY.fallback;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
      <div className="text-center max-w-md w-full bg-card border border-border rounded-xl p-8">
        <p className="text-5xl font-black tabular text-muted-foreground" aria-hidden="true">
          {status || "!"}
        </p>
        <h1 className="text-xl font-bold text-foreground mt-3">{copy.title}</h1>
        <p className="text-sm text-muted-foreground mt-1.5">{message || copy.body}</p>
        <a
          href="/"
          className="inline-flex items-center justify-center mt-5 min-h-11 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Back to Resonance
        </a>
      </div>
    </div>
  );
}
