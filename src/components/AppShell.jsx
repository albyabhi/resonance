// AppShell.jsx
import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './dashboard/Sidebar';

export default function AppShell({ onLogout = () => {}, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header on top */}
      <Header
        onLogout={onLogout}
        onMenuClick={() => setMobileOpen(true)}
        className="w-full shadow-sm bg-white z-50"
      />

      {/* Content below header */}
      <div className="flex flex-1">
        {/* Sidebar - desktop */}
        <aside className="hidden md:flex flex-col w-64 h-[calc(100vh-64px)] border-r bg-white">
          <Sidebar onLogout={onLogout} />
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <Sidebar
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          onLogout={onLogout}
        />
      )}
    </div>
  );
}
