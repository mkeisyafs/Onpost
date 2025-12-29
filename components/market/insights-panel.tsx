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
  // Admin override - if true, insights is unlocked (like 10 posts fulfilled)
  adminEnabled?: boolean;
}

export function InsightsPanel({ market, adminEnabled }: InsightsPanelProps) {
  const { analytics, validCount = 0, windowDays = 14 } = market;

  // Safe access to analytics properties
  const locked = analytics?.locked ?? true;
  const narrative = analytics?.narrative ?? null;
  const narrativeUpdatedAt = analytics?.narrativeUpdatedAt ?? null;

  // If admin enabled insights, it's like threshold is already met (unlocked)
  // If admin disabled (false/undefined), follow normal threshold logic
  const isLocked = adminEnabled ? false : locked;

  // Locked state (only if admin hasn't enabled it)
  if (isLocked) {
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

  // No narrative yet - show no data state
  if (!narrative) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI Insights</CardTitle>
          </div>
          <CardDescription>
            {adminEnabled
              ? "Insights enabled by admin"
              : "AI insights available"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted/50 p-6 text-center">
            <div className="mb-3 text-3xl">💡</div>
            <p className="font-medium text-foreground">
              No Insights Generated Yet
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              AI insights will be generated automatically when enough market
              data is available.
            </p>
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
              the last {windowDays} days
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              Prices are in USD for comparison purposes
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
