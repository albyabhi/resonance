// Sidebar.jsx
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Home, Users, CalendarDays, ClipboardList, CheckCircle,
  Trophy, FileText, ListChecks, Shield, Building2, GraduationCap, X
} from 'lucide-react';
import { Dialog, DialogPanel, DialogBackdrop } from '@headlessui/react';
import { useAuth } from '../AuthContext';

const navConfig = {
  admin: [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Houses', to: '/houses', icon: Home },
    { label: 'Students', to: '/students', icon: Users },
    { label: 'Events', to: '/events', icon: Trophy },
    { label: 'Schedule', to: '/schedule', icon: CalendarDays },
    { label: 'Results', to: '/results', icon: ClipboardList },
    { label: 'Scoreboard', to: '/scoreboard', icon: FileText },
    { label: 'Logs', to: '/logs', icon: Shield },
  ],
  house: [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'My House', to: '/my-house', icon: Building2 },
    { label: 'Register Teams', to: '/register', icon: Users },
    { label: 'Students', to: '/students', icon: GraduationCap },
    { label: 'Schedule', to: '/schedule', icon: CalendarDays },
    { label: 'Scoreboard', to: '/scoreboard', icon: FileText },
  ],
  student: [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Assigned Events', to: '/assigned-events', icon: ListChecks },
    { label: 'Enter Results', to: '/results/enter', icon: ClipboardList },
    { label: 'Scoreboard', to: '/scoreboard', icon: FileText },
  ],
  faculty: [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Pending Results', to: '/results/pending', icon: ClipboardList },
    { label: 'Approvals', to: '/results/approvals', icon: CheckCircle },
    { label: 'Scoreboard', to: '/scoreboard', icon: FileText },
  ],
  guest: [
    { label: 'Schedule', to: '/schedule', icon: CalendarDays },
    { label: 'Events', to: '/events', icon: Trophy },
    { label: 'Scoreboard', to: '/scoreboard', icon: FileText },
  ],
};

const normalizeRole = (role) => {
  const key = String(role || '').toLowerCase();
  if (['admin', 'administrator'].includes(key)) return 'admin';
  if (['house', 'captain', 'house captain', 'house_coordinator'].includes(key)) return 'house';
  if (['student', 'student coordinator', 'student_coordinator'].includes(key)) return 'student';
  if (['faculty', 'faculty coordinator', 'faculty_coordinator'].includes(key)) return 'faculty';
  return 'guest';
};

export default function Sidebar({ open = false, onClose = () => {}, onLogout = () => {} }) {
  const { role } = useAuth();
  const { pathname } = useLocation();

  const roleKey = normalizeRole(role);
  const items = navConfig[roleKey] ?? navConfig.guest;

  const NavList = (
    <>
      
      <nav className="flex-1 overflow-auto p-2">
        {items.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition',
                isActive || pathname === to
                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                  : 'text-gray-700 hover:bg-gray-100',
              ].join(' ')
            }
            // React Router sets aria-current="page" automatically on the active link
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-2 border-t">
        <button
          type="button"
          onClick={onLogout}
          className="w-full text-left text-sm text-red-600 hover:bg-red-50 rounded-md px-3 py-2"
        >
          Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex h-screen w-64 shrink-0 border-r bg-white flex-col">
        {NavList}
      </aside>

      {/* Mobile drawer */}
      <Dialog open={open} onClose={onClose} className="relative z-50 md:hidden">
        <DialogBackdrop className="fixed inset-0 bg-black/40" />
        <div className="fixed inset-0 flex">
          <DialogPanel
            className="relative w-64 max-w-[80%] h-full bg-white border-r shadow-xl"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
            {NavList}
          </DialogPanel>
          {/* Click on the remaining space to close */}
          <div className="flex-1" onClick={onClose} aria-hidden="true" />
        </div>
      </Dialog>
    </>
  );
}
