import React from "react";
import { Home, PlusCircle, Calendar } from "lucide-react";

function QuickActions() {
  const actions = [
    { name: "Manage Houses", icon: <Home className="w-4 h-4" /> },
    { name: "Create Event", icon: <PlusCircle className="w-4 h-4" /> },
    { name: "Schedule Events", icon: <Calendar className="w-4 h-4" /> },
  ];

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h3 className="font-semibold mb-2">⚡ Quick Actions</h3>
      <p className="text-sm text-gray-500 mb-3">Common tasks for your role</p>

      {actions.map((action, index) => (
        <button
          key={index}
          className="flex items-center gap-2 w-full p-3 mb-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-left text-sm font-medium text-gray-700"
        >
          {action.icon}
          {action.name}
        </button>
      ))}
    </div>
  );
}

export default QuickActions;
