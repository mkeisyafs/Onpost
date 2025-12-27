"use client";

import { ThreadList } from "@/components/thread/thread-list";
import { TrendingUp, BarChart3, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function MarketsPage() {
  return (
    <div className="w-full px-4 py-6 lg:px-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Market Analytics</h1>
        </div>
        <p className="text-muted-foreground">
          Structured markets with live pricing and AI-driven insights.
        </p>

        {/* Stats */}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <Badge
            variant="secondary"
            className="gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border-primary/20"
          >
            <BarChart3 className="h-3.5 w-3.5" />8 active markets
          </Badge>
          <Badge
            variant="secondary"
            className="gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-600 border-green-500/20"
          >
            <Sparkles className="h-3.5 w-3.5" />3 with AI insights
          </Badge>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-6 rounded-xl border border-border/50 bg-muted/50 p-4">
        <h3 className="font-medium mb-1">How Markets Work</h3>
        <p className="text-sm text-muted-foreground">
          Each market is a thread that collects trade listings. When a market
          reaches 50+ valid trades, AI-powered analytics unlock including price
          trends, buyer/seller patterns, and market insights.
        </p>
      </div>

      {/* Thread List (Markets) */}
      <ThreadList />
    </div>
  );
}
