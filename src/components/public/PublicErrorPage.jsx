import React from "react";

export default function PublicErrorPage({ status, message }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-100 px-6">
      <div className="text-center max-w-md space-y-4">
        <div className="text-7xl font-black text-neutral-800">{status || "!"}</div>
        <h1 className="text-xl font-bold text-white">This page is unavailable</h1>
        <p className="text-sm text-neutral-400">{message}</p>
        <a
          href="/"
          className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-sm font-semibold text-neutral-200 hover:bg-neutral-800 transition-colors"
        >
          Back to Resonance
        </a>
      </div>
    </div>
  );
}
