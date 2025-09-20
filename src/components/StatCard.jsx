import React from "react";

function StatCard({ title, value, subtitle, status, icon: Icon }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm flex items-start gap-4">
      {/* Icon */}
      {Icon && (
        <div className="p-3 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
          <Icon className="w-6 h-6" />
        </div>
      )}

      {/* Text content */}
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4 className="text-sm text-gray-600">{title}</h4>
          {status && (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-50 text-green-600">
              {status}
            </span>
          )}
        </div>

        <p className="text-2xl font-bold mt-2">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

export default StatCard;
