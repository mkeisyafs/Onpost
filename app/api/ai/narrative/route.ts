import { type NextRequest, NextResponse } from "next/server"
import { generateMarketNarrative } from "@/lib/minimax"
import type { MarketSnapshot, AccountMarketSnapshot } from "@/lib/types"

interface NarrativeRequest {
  snapshot: MarketSnapshot | AccountMarketSnapshot
  previousSnapshot?: MarketSnapshot | AccountMarketSnapshot | null
  marketType: "ITEM_MARKET" | "ACCOUNT_MARKET"
}

// MiniMax narrative proxy - generates market insights from metrics only (no raw posts)
export async function POST(request: NextRequest) {
  try {
    const { snapshot, previousSnapshot, marketType } = (await request.json()) as NarrativeRequest

    if (!snapshot || !marketType) {
      return NextResponse.json({ error: "Snapshot and marketType are required" }, { status: 400 })
    }

    let metrics: Parameters<typeof generateMarketNarrative>[1]
    let prevMetrics: Parameters<typeof generateMarketNarrative>[2] = null

    if (marketType === "ITEM_MARKET" && "sell" in snapshot) {
      const itemSnapshot = snapshot as MarketSnapshot
      metrics = {
        sellMedian: itemSnapshot.sell.median,
        sellCount: itemSnapshot.sell.count,
        buyMedian: itemSnapshot.buy.median,
        buyCount: itemSnapshot.buy.count,
        spread: itemSnapshot.spread,
        trend: itemSnapshot.trend,
        totalCount: itemSnapshot.totalValidCount,
      }

      if (previousSnapshot && "sell" in previousSnapshot) {
        const prev = previousSnapshot as MarketSnapshot
        prevMetrics = {
          sellMedian: prev.sell.median,
          totalCount: prev.totalValidCount,
        }
      }
    } else if (marketType === "ACCOUNT_MARKET" && "bands" in snapshot) {
      const accountSnapshot = snapshot as AccountMarketSnapshot
      metrics = {
        totalCount: accountSnapshot.totalValidCount,
        demandPressure: accountSnapshot.demandPressure,
        bands: accountSnapshot.bands,
        topValueDrivers: accountSnapshot.topValueDrivers,
      }
    } else {
      return NextResponse.json({ error: "Invalid market type or snapshot format" }, { status: 400 })
    }

    const narrative = await generateMarketNarrative(marketType, metrics, prevMetrics)

    return NextResponse.json({ narrative })
  } catch (error) {
    console.error("AI narrative error:", error)
    const message = error instanceof Error ? error.message : "Failed to generate narrative"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
