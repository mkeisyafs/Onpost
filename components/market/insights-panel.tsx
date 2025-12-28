"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Lock, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ThreadMarketData } from "@/lib/types";

interface InsightsPanelProps {
  market: ThreadMarketData;
}

export function InsightsPanel({ market }: InsightsPanelProps) {
  const { analytics, validCount, thresholdValid } = market;
  const { locked, narrative, narrativeUpdatedAt } = analytics;

  // Locked state
  if (locked) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <CardTitle>AI Insights Locked</CardTitle>
          </div>
          <CardDescription>
            Insights will be generated once the market has at least 10 valid
            trade posts. Currently at {validCount}.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // No narrative yet
  if (!narrative) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI Insights</CardTitle>
          </div>
          <CardDescription>Generating market insights...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI Market Insights</CardTitle>
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <RefreshCw className="mr-1 h-4 w-4" />
            Refresh
          </Button>
        </div>
        {narrativeUpdatedAt && (
          <CardDescription>
            Last updated: {new Date(narrativeUpdatedAt).toLocaleString()}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="rounded-lg bg-secondary/50 p-4">
          <p className="leading-relaxed text-foreground">{narrative}</p>
        </div>

        {/* Key Takeaways */}
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">
            Key Takeaways
          </h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              Market data is based on {validCount} validated trade posts from
              the last {market.windowDays} days
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              Prices are normalized to IDR for comparison purposes
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              Analytics refresh automatically as new trades are posted
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
