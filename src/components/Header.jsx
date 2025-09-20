
import React from "react";
import { LogOut, Bell, Menu } from "lucide-react";
import { useAuth } from "./AuthContext";

function Header({
  onLogout = () => {},
  onBellClick = () => {},
  onMenuClick = () => {},
}) {
  const { user, role, logout } = useAuth();

  const roleLabelMap = {
    admin: "Admin",
    captain: "House Captain",
    student_coordinator: "Student Coordinator",
    faculty: "Faculty Coordinator",
    guest: "Guest",
  };

  const displayName = user?.name || "Guest User";
  const roleLabel = roleLabelMap[role] || "Guest";

  // Debug logs
  console.log("Header render:");
  console.log("User object:", user);
  console.log("Role string:", role);
  console.log("Display name:", displayName);
  console.log("Role label:", roleLabel);

  const handleLogout = () => {
    console.log("Logout clicked");
    logout(); // clear context + localStorage
    onLogout(); // call any parent handler
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 shadow-sm px-4 sm:px-6 py-2">
      <div className="flex items-center justify-between">
        {/* Left: Hamburger + brand */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 focus:outline-none"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-blue-700">Resonance</h1>
            <p className="text-xs text-gray-500">
              Inter-House Competition Management
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4 sm:gap-6">
          <button
            className="text-gray-600 hover:text-gray-800"
            onClick={onBellClick}
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
          </button>
          
          <div className="text-sm text-right block sm:block">
            <p className="font-semibold text-gray-800">{displayName}</p>
            <p className="text-xs text-gray-500">{roleLabel}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-700"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
