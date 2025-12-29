"use client";

import { formatPrice } from "@/lib/trade-detection";
import type { MarketSnapshot } from "@/lib/types";

interface PriceChartProps {
  snapshot: MarketSnapshot;
}

export function PriceChart({ snapshot }: PriceChartProps) {
  const { sell, buy } = snapshot;

  // Calculate scale
  const allPrices = [
    sell.p10,
    sell.median,
    sell.p90,
    buy.p10,
    buy.median,
    buy.p90,
  ].filter((p) => p !== null && p !== undefined) as number[];
  const minPrice = Math.min(...allPrices) * 0.9;
  const maxPrice = Math.max(...allPrices) * 1.1;
  const range = maxPrice - minPrice;

  const getPosition = (price: number) => {
    return ((price - minPrice) / range) * 100;
  };

  return (
    <div className="space-y-6">
      {/* WTS Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-wts">WTS (Sell)</span>
          <span className="text-sm text-muted-foreground">
            {sell.count} listings
          </span>
        </div>
        <div className="relative h-8 rounded-lg bg-secondary">
          {/* P10-P90 Range */}
          <div
            className="absolute top-1/2 h-3 -translate-y-1/2 rounded bg-wts/30"
            style={{
              left: `${getPosition(sell.p10)}%`,
              width: `${getPosition(sell.p90) - getPosition(sell.p10)}%`,
            }}
          />
          {/* Median marker */}
          <div
            className="absolute top-1/2 h-6 w-1 -translate-x-1/2 -translate-y-1/2 rounded bg-wts"
            style={{ left: `${getPosition(sell.median)}%` }}
            title={`Median: ${formatPrice(sell.median, "USD")}`}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>P10: {formatPrice(sell.p10, "USD")}</span>
          <span className="font-medium text-wts">
            Median: {formatPrice(sell.median, "USD")}
          </span>
          <span>P90: {formatPrice(sell.p90, "USD")}</span>
        </div>
      </div>

      {/* WTB Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-wtb">WTB (Buy)</span>
          <span className="text-sm text-muted-foreground">
            {buy.count} listings
          </span>
        </div>
        <div className="relative h-8 rounded-lg bg-secondary">
          {/* P10-P90 Range */}
          <div
            className="absolute top-1/2 h-3 -translate-y-1/2 rounded bg-wtb/30"
            style={{
              left: `${getPosition(buy.p10)}%`,
              width: `${getPosition(buy.p90) - getPosition(buy.p10)}%`,
            }}
          />
          {/* Median marker */}
          <div
            className="absolute top-1/2 h-6 w-1 -translate-x-1/2 -translate-y-1/2 rounded bg-wtb"
            style={{ left: `${getPosition(buy.median)}%` }}
            title={`Median: ${formatPrice(buy.median, "USD")}`}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>P10: {formatPrice(buy.p10, "USD")}</span>
          <span className="font-medium text-wtb">
            Median: {formatPrice(buy.median, "USD")}
          </span>
          <span>P90: {formatPrice(buy.p90, "USD")}</span>
        </div>
      </div>

      {/* Price Scale */}
      <div className="flex justify-between border-t border-border pt-4 text-xs text-muted-foreground">
        <span>{formatPrice(minPrice, "USD")}</span>
        <span>{formatPrice((minPrice + maxPrice) / 2, "USD")}</span>
        <span>{formatPrice(maxPrice, "USD")}</span>
      </div>
    </div>
  );
}
