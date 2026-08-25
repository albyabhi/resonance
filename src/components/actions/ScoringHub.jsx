import React, { useState, useEffect } from "react";
import usePermission from "../../hooks/usePermission";
import ScoreReview from "./ScoreReview";
import ManageResult from "./ManageResult";
import AdminScoreboard from "./AdminScoreboard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Card } from "../ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

const ROLE_LABELS = {
  super_admin: "Super Admin",
  organizer: "Organizer",
  event_coordinator: "Event Coordinator",
};

const TABS = [
  { id: "score-review", label: "Judge Submissions", roles: ["super_admin", "organizer"], component: ScoreReview },
  { id: "manual-entry", label: "Enter Results", roles: ["super_admin", "organizer", "event_coordinator"], component: ManageResult },
  { id: "group-breakdown", label: "Group Breakdown", roles: ["super_admin"], component: AdminScoreboard },
];

const TABS_MOBILE = [
  { id: "score-review", label: "Submissions", roles: ["super_admin", "organizer"] },
  { id: "manual-entry", label: "Enter Results", roles: ["super_admin", "organizer", "event_coordinator"] },
  { id: "group-breakdown", label: "Groups", roles: ["super_admin"] },
];

const ScoringHub = () => {
  const { hasAnyRole } = usePermission();
  const [activeTab, setActiveTab] = useState("score-review");

  // Check access for each tab
  const tabsWithAccess = TABS.map((tab) => ({
    ...tab,
    hasAccess: tab.roles.some((r) => hasAnyRole(r)),
    requiredRoles: tab.roles.map(r => ROLE_LABELS[r] || r).join(", "),
  }));

  const mobileTabsWithAccess = TABS_MOBILE.map((tab) => ({
    ...tab,
    hasAccess: tab.roles.some((r) => hasAnyRole(r)),
    requiredRoles: tab.roles.map(r => ROLE_LABELS[r] || r).join(", "),
  }));

  useEffect(() => {
    const availableTabs = tabsWithAccess.filter(t => t.hasAccess);
    if (availableTabs.length > 0 && !availableTabs.some((t) => t.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [activeTab, tabsWithAccess]);

  if (tabsWithAccess.every(t => !t.hasAccess)) {
    return (
      <Card className="rounded-lg p-5 border-0 shadow-none">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Result submissions are not available for your role.</p>
        </div>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="rounded-lg p-5 border-0 shadow-none">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b border-border">
            <TabsList className="hidden md:flex w-full justify-start h-auto bg-transparent p-0 rounded-none">
              {tabsWithAccess.map((tab) => (
                <Tooltip key={tab.id}>
                  <TooltipTrigger asChild>
                    <TabsTrigger
                      value={tab.id}
                      disabled={!tab.hasAccess}
                      className="relative rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-accent-amber data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-accent-amber hover:text-foreground/80 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {tab.label}
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="center">
                    <p className="text-sm">
                      {tab.hasAccess 
                        ? "Click to view"
                        : `Requires: ${tab.requiredRoles}`}
                    </p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TabsList>

            <TabsList className="flex md:hidden w-full justify-start h-auto bg-transparent p-0 rounded-none overflow-x-auto [&::-webkit-scrollbar]:hidden">
              {mobileTabsWithAccess.map((tab) => (
                <Tooltip key={tab.id}>
                  <TooltipTrigger asChild>
                    <TabsTrigger
                      value={tab.id}
                      disabled={!tab.hasAccess}
                      className="relative flex-shrink-0 rounded-none border-b-2 border-transparent px-4 py-3 text-xs font-medium data-[state=active]:border-accent-amber data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-accent-amber hover:text-foreground/80 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {tab.label}
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="center">
                    <p className="text-sm">
                      {tab.hasAccess 
                        ? "Click to view"
                        : `Requires: ${tab.requiredRoles}`}
                    </p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TabsList>
          </div>

          {tabsWithAccess.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-0 p-0">
              {tab.hasAccess && tab.component && <tab.component />}
            </TabsContent>
          ))}
        </Tabs>
      </Card>
    </TooltipProvider>
  );
};

export default ScoringHub;