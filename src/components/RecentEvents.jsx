import React from "react";

function RecentEvents() {
  const events = [
    { name: "Cultural Dance Competition", type: "onstage • team", status: "Upcoming", color: "bg-gray-100 text-gray-700" },
    { name: "Solo Singing Contest", type: "onstage • individual", status: "Ongoing", color: "bg-blue-900 text-white" },
    { name: "Photography Contest", type: "offstage • individual", status: "Completed", color: "bg-gray-200 text-gray-700" },
  ];

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h3 className="font-semibold mb-2">🏅 Recent Events</h3>
      <p className="text-sm text-gray-500 mb-3">Latest competition events</p>

      {events.map((event, index) => (
        <div
          key={index}
          className="flex justify-between items-center p-3 mb-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
        >
          {/* Event details */}
          <div>
            <p className="font-medium">{event.name}</p>
            <p className="text-xs text-gray-500">{event.type}</p>
          </div>

          {/* Status badge */}
          <span
            className={`px-3 py-1 text-xs font-medium rounded-full ${event.color}`}
          >
            {event.status}
          </span>
        </div>
      ))}
    </div>
  );
}

export default RecentEvents;
