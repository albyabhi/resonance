import React from "react";

function HouseStandings() {
  const houses = [
    { rank: 1, name: "Phoenix House", code: "PHX", points: 450, color: "bg-red-500" },
    { rank: 2, name: "Aquila House", code: "AQL", points: 420, color: "bg-blue-500" },
    { rank: 3, name: "Serpent House", code: "SRP", points: 380, color: "bg-green-500" },
    { rank: 4, name: "Griffin House", code: "GRF", points: 340, color: "bg-yellow-500" },
  ];

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h3 className="font-semibold mb-2">🏆 House Standings</h3>
      <p className="text-sm text-gray-500 mb-3">Current leaderboard</p>

      {houses.map((house) => (
        <div
          key={house.rank}
          className="flex justify-between items-center p-3 mb-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
        >
          {/* Left side: Rank + House info */}
          <div className="flex items-center space-x-3">
            {/* Rank circle */}
            <span
              className={`w-7 h-7 flex items-center justify-center rounded-full text-white text-sm font-bold ${house.color}`}
            >
              {house.rank}
            </span>
            {/* House name + code */}
            <div>
              <p className="font-medium">{house.name}</p>
              <p className="text-xs text-gray-500">{house.code}</p>
            </div>
          </div>

          {/* Right side: Points */}
          <span className="text-sm font-semibold text-gray-700">
            {house.points} points
          </span>
        </div>
      ))}
    </div>
  );
}

export default HouseStandings;
