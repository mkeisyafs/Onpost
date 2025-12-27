"use client"

import useSWR from "swr"
import Link from "next/link"
import forumsApi from "@/lib/forums-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendIndicator } from "@/components/market/trend-indicator"
import { formatPrice } from "@/lib/trade-detection"
import { TrendingUp, Lock, Users, ShoppingBag } from "lucide-react"
import type { ForumsThread, MarketSnapshot, AccountMarketSnapshot } from "@/lib/types"

export default function MarketsPage() {
  const { data, isLoading, error } = useSWR("market-threads", async () => {
    const response = await forumsApi.threads.list({ filter: "popular", limit: 50 })
    // Filter to only threads with market enabled
    return response.threads.filter((t) => t.extendedData?.market?.marketEnabled)
  })

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive">Failed to load markets</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">All Markets</h1>
        <p className="mt-1 text-muted-foreground">Browse threads with market analytics enabled</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map((thread) => (
            <MarketCard key={thread.id} thread={thread} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No market threads found</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function MarketCard({ thread }: { thread: ForumsThread }) {
  const market = thread.extendedData?.market
  if (!market) return null

  const { analytics, validCount, thresholdValid, marketTypeFinal, marketTypeCandidate } = market
  const marketType = marketTypeFinal || marketTypeCandidate
  const isLocked = analytics.locked

  const snapshot = analytics.snapshot as MarketSnapshot | AccountMarketSnapshot | null
  const isItemMarket = snapshot && "sell" in snapshot

  return (
    <Link href={`/thread/${thread.id}`}>
      <Card className="h-full transition-colors hover:bg-card/80">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-tight line-clamp-2">{thread.title}</CardTitle>
            {isLocked ? (
              <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <TrendingUp className="h-4 w-4 shrink-0 text-primary" />
            )}
          </div>
          <CardDescription className="flex items-center gap-2">
            {marketType === "ITEM_MARKET" ? <ShoppingBag className="h-3 w-3" /> : <Users className="h-3 w-3" />}
            {marketType === "ITEM_MARKET"
              ? "Item Market"
              : marketType === "ACCOUNT_MARKET"
                ? "Account Market"
                : "Market"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLocked ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="text-foreground">
                  {validCount}/{thresholdValid}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(validCount / thresholdValid) * 100}%` }}
                />
              </div>
            </div>
          ) : isItemMarket && snapshot ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Sell Median</span>
                <span className="font-medium text-wts">
                  {formatPrice((snapshot as MarketSnapshot).sell.median, "IDR")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Buy Median</span>
                <span className="font-medium text-wtb">
                  {formatPrice((snapshot as MarketSnapshot).buy.median, "IDR")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Trend</span>
                <TrendIndicator trend={(snapshot as MarketSnapshot).trend} size="sm" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{validCount} trades</Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
