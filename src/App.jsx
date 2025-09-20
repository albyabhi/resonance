// App.jsx
import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/AppShell'; // contains Header + Sidebar
import LoginPage from './components/LoginPage';
import Dashboard from './components/dashboard/Dashboard';
import { useAuth } from './components/AuthContext';

export default function App() {
  const { user, role, loading, logout } = useAuth();

  // Optional: redirect to login if no user and not loading
  if (loading) return <div>Loading...</div>;

  return (
    <Routes>
      {/* Show LoginPage if no user */}
      {!user ? (
        <Route path="/login" element={<LoginPage />} />
      ) : (
        <Route
          path="/*"
          element={
            <AppShell role={role} onLogout={logout}>
              <Dashboard role={role} />
            </AppShell>
          }
        />
      )}

      {/* Fallback route */}
      <Route
        path="*"
        element={<Navigate to={user ? '/dashboard' : '/login'} replace />}
      />
    </Routes>
  );
}
