"use client";

import { cn } from "@/lib/utils";
import { MessageSquare, TrendingUp, Sparkles, Lock } from "lucide-react";
import type { ThreadMarketData } from "@/lib/types";

interface ThreadTabsProps {
  activeTab: "posts" | "market" | "insights";
  onTabChange: (tab: "posts" | "market" | "insights") => void;
  market?: ThreadMarketData;
}

export function ThreadTabs({
  activeTab,
  onTabChange,
  market,
}: ThreadTabsProps) {
  const tabs = [
    {
      id: "posts" as const,
      label: "Posts",
      icon: MessageSquare,
    },
    {
      id: "market" as const,
      label: "Market",
      icon: TrendingUp,
      locked: market?.analytics?.locked,
      progress: market?.analytics?.locked
        ? `${market?.validCount ?? 0}/10`
        : undefined,
    },
    {
      id: "insights" as const,
      label: "Insights",
      icon: Sparkles,
      locked: market?.analytics?.locked,
    },
  ];

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
