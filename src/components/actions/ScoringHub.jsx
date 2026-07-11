import React, { useState, useEffect } from "react";
import usePermission from "../../hooks/usePermission";
import ScoreReview from "./ScoreReview";
import ManageResult from "./ManageResult";
import AdminScoreboard from "./AdminScoreboard";

const TABS = [
  { id: "score-review", label: "Score Review", roles: ["super_admin", "organizer"], component: ScoreReview },
  { id: "manual-entry", label: "Manual Entry", roles: ["super_admin", "organizer", "event_coordinator"], component: ManageResult },
  { id: "group-breakdown", label: "Group Breakdown", roles: ["super_admin"], component: AdminScoreboard },
];

const TABS_MOBILE = [
  { id: "score-review", label: "Review", roles: ["super_admin", "organizer"] },
  { id: "manual-entry", label: "Entry", roles: ["super_admin", "organizer", "event_coordinator"] },
  { id: "group-breakdown", label: "Groups", roles: ["super_admin"] },
];

const ScoringHub = () => {
  const { hasAnyRole } = usePermission();
  const [activeTab, setActiveTab] = useState("score-sheets");

  const visibleTabs = TABS.filter((t) => t.roles.some((r) => hasAnyRole(r)));
  const visibleMobile = TABS_MOBILE.filter((t) => t.roles.some((r) => hasAnyRole(r)));

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some((t) => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [activeTab, visibleTabs]);

  const activeConfig = TABS.find((t) => t.id === activeTab);
  const ActiveComponent = activeConfig?.component;

  if (visibleTabs.length === 0) {
    return (
      <div className="rounded-xl shadow-sm p-6 border text-center" style={{ backgroundColor: "var(--card)", borderColor: "var(--border-card)" }}>
        <p className="text-sm" style={{ color: "var(--chart-axis)" }}>Scoring is not available for your role.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl shadow-sm border" style={{ backgroundColor: "var(--card)", borderColor: "var(--border-card)" }}>
      {/* Tab Navigation */}
      <div className="border-b" style={{ borderBottomColor: "var(--border-divider)" }}>
        {/* Desktop tabs */}
        <div className="hidden md:flex flex-wrap">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-3 text-sm font-medium transition-colors focus:outline-none ${
                activeTab === tab.id
                  ? "text-orange-600 dark:text-orange-400"
                  : "hover:text-gray-600 dark:hover:text-gray-300"
              }`}
              style={{ color: activeTab === tab.id ? undefined : "var(--chart-axis)" }}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
              )}
            </button>
          ))}
        </div>

        {/* Mobile tabs */}
        <div className="flex md:hidden overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {visibleMobile.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex-shrink-0 px-4 py-3 text-xs font-medium transition-colors focus:outline-none ${
                activeTab === tab.id
                  ? "text-orange-600 dark:text-orange-400"
                  : "hover:text-gray-600 dark:hover:text-gray-300"
              }`}
              style={{ color: activeTab === tab.id ? undefined : "var(--chart-axis)" }}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-0">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
};

export default ScoringHub;
