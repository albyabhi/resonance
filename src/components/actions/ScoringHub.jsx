import React, { useState, useEffect } from "react";
import usePermission from "../../hooks/usePermission";
import ScoreReview from "./ScoreReview";
import ManageResult from "./ManageResult";
import AdminScoreboard from "./AdminScoreboard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Card } from "../ui/card";

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

  if (visibleTabs.length === 0) {
    return (
      <Card className="rounded-lg p-5 border-0 shadow-none">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Scoring is not available for your role.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded-lg p-5 border-0 shadow-none">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b border-border">
          <TabsList className="hidden md:flex w-full justify-start h-auto bg-transparent p-0 rounded-none">
            {visibleTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="relative rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-accent-amber data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-accent-amber hover:text-foreground/80"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsList className="flex md:hidden w-full justify-start h-auto bg-transparent p-0 rounded-none overflow-x-auto [&::-webkit-scrollbar]:hidden">
            {visibleMobile.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="relative flex-shrink-0 rounded-none border-b-2 border-transparent px-4 py-3 text-xs font-medium data-[state=active]:border-accent-amber data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-accent-amber hover:text-foreground/80"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {visibleTabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-0 p-0">
            {tab.component && <tab.component />}
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
};

export default ScoringHub;
