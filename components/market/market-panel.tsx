"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PriceChart } from "./price-chart";
import { AccountBands } from "./account-bands";
import { MarketSummary } from "./market-summary";
import { TrendIndicator } from "./trend-indicator";
import { Lock, TrendingUp, ArrowUpDown } from "lucide-react";
import { formatPrice } from "@/lib/trade-detection";
import type {
  ThreadMarketData,
  MarketSnapshot,
  AccountMarketSnapshot,
} from "@/lib/types";

interface MarketPanelProps {
  market: ThreadMarketData;
  // Admin override - if true, show market even if threshold not met
  adminEnabled?: boolean;
}

function isItemMarketSnapshot(
  snapshot: MarketSnapshot | AccountMarketSnapshot | null
): snapshot is MarketSnapshot {
  return snapshot !== null && "sell" in snapshot;
}

function isAccountMarketSnapshot(
  snapshot: MarketSnapshot | AccountMarketSnapshot | null
): snapshot is AccountMarketSnapshot {
  return snapshot !== null && "bands" in snapshot;
}

export function MarketPanel({ market, adminEnabled }: MarketPanelProps) {
  const {
    analytics,
    validCount = 0,
    thresholdValid = 10,
    marketTypeFinal,
    marketTypeCandidate,
  } = market;
  const locked = analytics?.locked ?? true;
  const snapshot = analytics?.snapshot ?? null;
  const updatedAt = analytics?.updatedAt;

  const marketType = marketTypeFinal || marketTypeCandidate;
  const progress = (validCount / thresholdValid) * 100;

  // If admin enabled, bypass the threshold lock
  const isLocked = adminEnabled ? false : locked;

  // Show locked state only if actually locked (not admin enabled)
  if (isLocked) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Market Analytics Locked</CardTitle>
          </div>
          <CardDescription>
            This market needs at least 10 valid trade posts to unlock analytics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Progress to unlock
                </span>
                <span className="font-medium text-foreground">
                  {validCount} / 10 trades
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            <p className="text-sm text-muted-foreground">
              Once unlocked, you will see price trends, median prices, and
              AI-generated market insights.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Admin unlocked but no snapshot data yet - show no data state
  if (!snapshot) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Market Analytics</CardTitle>
          </div>
          <CardDescription>
            {adminEnabled
              ? "Analytics enabled by admin"
              : "Market analytics available"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-6 text-center">
              <div className="mb-3 text-3xl">📊</div>
              <p className="font-medium text-foreground">
                No Analytics Data Yet
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {validCount === 0
                  ? "Post some trade offers (WTS/WTB/WTT) to start collecting market data."
                  : `${validCount} trade post${
                      validCount > 1 ? "s" : ""
                    } collected. Analytics will be generated when there's enough data.`}
              </p>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Tip: Include prices in your posts for accurate analytics
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Item Market, Physical Item Market, or General Market
  if (
    (marketType === "ITEM_MARKET" ||
      marketType === "PHYSICAL_ITEM" ||
      marketType === "GENERAL") &&
    isItemMarketSnapshot(snapshot)
  ) {
    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MarketSummary
            title="Sell Median"
            value={formatPrice(snapshot.sell.median, "USD")}
            description={`${snapshot.sell.count} listings`}
            icon={TrendingUp}
            trend={snapshot.trend}
          />
          <MarketSummary
            title="Buy Median"
            value={formatPrice(snapshot.buy.median, "USD")}
            description={`${snapshot.buy.count} listings`}
            icon={TrendingUp}
          />
          <MarketSummary
            title="Spread"
            value={formatPrice(snapshot.spread, "USD")}
            description="Sell - Buy"
            icon={ArrowUpDown}
          />
          <MarketSummary
            title="Market Trend"
            value={<TrendIndicator trend={snapshot.trend} size="lg" />}
            description="Last 14 days"
          />
        </div>

        {/* Price Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Price Distribution</CardTitle>
            <CardDescription>
              WTS vs WTB price ranges (P10 to P90)
              {updatedAt && (
                <span className="ml-2 text-xs">
                  Updated {new Date(updatedAt).toLocaleDateString()}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PriceChart snapshot={snapshot} />
          </CardContent>
        </Card>

        {/* Volume Chart */}
        {snapshot.volume && snapshot.volume.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Trading Volume</CardTitle>
              <CardDescription>
                Number of trades per day (last 14 days)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VolumeChart volume={snapshot.volume} />
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Account Market
  if (marketType === "ACCOUNT_MARKET" && isAccountMarketSnapshot(snapshot)) {
    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MarketSummary
            title="Total Listings"
            value={snapshot.totalValidCount.toString()}
            description="Active in window"
            icon={TrendingUp}
          />
          <MarketSummary
            title="Demand Pressure"
            value={`${(snapshot.demandPressure * 100).toFixed(0)}%`}
            description="WTB to WTS ratio"
            icon={ArrowUpDown}
          />
          <MarketSummary
            title="Top Value Driver"
            value={snapshot.topValueDrivers[0] || "N/A"}
            description="Most mentioned feature"
          />
        </div>

        {/* Account Bands */}
        <Card>
          <CardHeader>
            <CardTitle>Price Bands</CardTitle>
            <CardDescription>Account pricing by tier</CardDescription>
          </CardHeader>
          <CardContent>
            <AccountBands bands={snapshot.bands} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback for unknown market type
  return (
    <Card>
      <CardContent className="py-8 text-center">
        <p className="text-muted-foreground">
          Market type not recognized. Analytics unavailable.
        </p>
      </CardContent>
    </Card>
  );
}

// Simple volume bar chart component
function VolumeChart({ volume }: { volume: number[] }) {
  const maxVolume = Math.max(...volume, 1);

  return (
    <div className="flex h-32 items-end gap-1">
      {volume.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t bg-primary/80 transition-all hover:bg-primary"
            style={{
              height: `${(v / maxVolume) * 100}%`,
              minHeight: v > 0 ? "4px" : "0",
            }}
            title={`Day ${i + 1}: ${v} trades`}
          />
          <span className="text-xs text-muted-foreground">{i + 1}</span>
        </div>
      ))}
    </div>
  );
}
