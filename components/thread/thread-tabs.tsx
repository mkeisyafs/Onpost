"use client";

import { cn } from "@/lib/utils";
import { MessageSquare, TrendingUp, Sparkles, Lock } from "lucide-react";
import type { ThreadMarketData } from "@/lib/types";

interface ThreadTabsProps {
  activeTab: "posts" | "market" | "insights";
  onTabChange: (tab: "posts" | "market" | "insights") => void;
  market?: ThreadMarketData;
  // Admin settings from thread.extendedData
  adminMarketEnabled?: boolean;
  adminInsightsEnabled?: boolean;
  // Admin settings for hiding tabs
  marketHidden?: boolean;
  insightsHidden?: boolean;
}

export function ThreadTabs({
  activeTab,
  onTabChange,
  market,
  adminMarketEnabled,
  adminInsightsEnabled,
  marketHidden,
  insightsHidden,
}: ThreadTabsProps) {
  // If admin explicitly enabled, override the threshold lock
  const marketLocked = adminMarketEnabled ? false : market?.analytics?.locked;
  const insightsLocked = adminInsightsEnabled
    ? false
    : market?.analytics?.locked;

  const allTabs = [
    {
      id: "posts" as const,
      label: "Posts",
      icon: MessageSquare,
      hidden: false, // Posts tab is never hidden
    },
    {
      id: "market" as const,
      label: "Market",
      icon: TrendingUp,
      locked: marketLocked,
      progress: marketLocked ? `${market?.validCount ?? 0}/10` : undefined,
      hidden: marketHidden,
    },
    {
      id: "insights" as const,
      label: "Insights",
      icon: Sparkles,
      locked: insightsLocked,
      hidden: insightsHidden,
    },
  ];

  // Filter out hidden tabs
  const tabs = allTabs.filter((tab) => !tab.hidden);

  return (
    <div className="mt-6 flex border-b border-border">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.locked ? (
              <Lock className="h-4 w-4" />
            ) : (
              <Icon className="h-4 w-4" />
            )}
            {tab.label}
            {tab.progress && (
              <span className="text-xs text-muted-foreground">
                ({tab.progress})
              </span>
            )}
            {isActive && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}
