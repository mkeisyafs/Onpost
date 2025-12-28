import { type NextRequest, NextResponse } from "next/server";
import type {
  ForumsThread,
  ForumsPost,
  ThreadMarketData,
  PostTradeData,
  MarketSnapshot,
  AccountMarketSnapshot,
} from "@/lib/types";

const FORUMS_BASE_URL = process.env.FORUMS_BASE_URL || "https://foru.ms";
const FORUMS_API_KEY = process.env.FORUMS_API_KEY;

// Cron job for incremental analytics processing
export async function POST(request: NextRequest) {
  // Verify cron secret or API key
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = {
      processed: 0,
      updated: 0,
      errors: [] as string[],
    };

    // 1. Fetch recently active threads with market enabled
    const threadsResponse = await forumsRequest<{ threads: ForumsThread[] }>(
      "/threads?filter=newest&limit=20"
    );

    const marketThreads = threadsResponse.threads.filter(
      (t) => t.extendedData?.market?.marketEnabled
    );

    // 2. Process each thread (max 10 per run to stay within limits)
    for (const thread of marketThreads.slice(0, 10)) {
      try {
        const market = thread.extendedData?.market;
        if (!market) continue;

        // Skip if processed too recently (< 5 minutes)
        const timeSinceLastProcess = Date.now() - market.lastProcessed.at;
        if (timeSinceLastProcess < 5 * 60 * 1000) {
          continue;
        }

        results.processed++;

        // 3. Fetch new posts since last cursor
        const newPosts = await fetchNewPosts(thread.id, market.lastProcessed);

        // 4. Process only high-likelihood trade posts
        for (const post of newPosts) {
          await processPostForTrade(post, thread.id);
        }

        // 5. Bounded scan for validCount (within window only)
        const shouldRescan =
          Date.now() - market.lastWindowCutoffAt > 60 * 60 * 1000; // Rescan hourly max
        let validCount = market.validCount;

        if (shouldRescan || newPosts.length > 0) {
          validCount = await countValidTradesInWindow(
            thread.id,
            market.windowDays
          );
        }

        // 6. Update analytics if threshold met
        const updatedMarket: ThreadMarketData = {
          ...market,
          validCount,
          lastWindowCutoffAt: shouldRescan
            ? Date.now()
            : market.lastWindowCutoffAt,
          lastProcessed: {
            mode: "NEWEST",
            cursor: newPosts[0]?.id ? null : market.lastProcessed.cursor,
            lastPostIdProcessed:
              newPosts[0]?.id || market.lastProcessed.lastPostIdProcessed,
            at: Date.now(),
          },
        };

        if (validCount >= market.thresholdValid) {
          const marketType =
            market.marketTypeFinal || market.marketTypeCandidate;
          const snapshot = await computeSnapshot(
            thread.id,
            marketType,
            market.windowDays
          );

          // Check if narrative needs refresh (significant change)
          const previousSnapshot = market.analytics.snapshot;
          let narrative = market.analytics.narrative;
          let narrativeUpdatedAt = market.analytics.narrativeUpdatedAt;

          if (shouldRefreshNarrative(previousSnapshot, snapshot)) {
            try {
              const narrativeResponse = await fetch(
                `${process.env.VERCEL_URL || ""}/api/ai/narrative`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    snapshot,
                    previousSnapshot,
                    marketType,
                  }),
                }
              );
              const narrativeData = await narrativeResponse.json();
              narrative = narrativeData.narrative;
              narrativeUpdatedAt = Date.now();
            } catch {
              // Keep existing narrative if AI fails
            }
          }

          updatedMarket.analytics = {
            locked: false,
            updatedAt: Date.now(),
            snapshot,
            narrative,
            narrativeUpdatedAt,
            version: "1.0.0",
          };

          results.updated++;
        } else {
          updatedMarket.analytics = {
            ...market.analytics,
            locked: true,
            updatedAt: Date.now(),
          };
        }

        // 7. Update thread extendedData
        await forumsRequest(`/thread/${thread.id}`, {
          method: "PUT",
          body: JSON.stringify({
            extendedData: { market: updatedMarket },
          }),
        });
      } catch (error) {
        results.errors.push(
          `Thread ${thread.id}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("Cron analytics error:", error);
    return NextResponse.json(
      {
        error: "Cron job failed",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}

// Helper: Make authenticated request to Foru.ms API
async function forumsRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${FORUMS_BASE_URL}/api/v1${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${FORUMS_API_KEY}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Foru.ms API error: ${response.status}`);
  }

  return response.json();
}

// Helper: Fetch new posts since last processed
async function fetchNewPosts(
  threadId: string,
  lastProcessed: ThreadMarketData["lastProcessed"]
): Promise<ForumsPost[]> {
  const newPosts: ForumsPost[] = [];

  // Fetch from newest, stop at lastPostIdProcessed
  let cursor: string | null = null;

  while (true) {
    const response: {
      posts: ForumsPost[];
      nextPostCursor: string | null;
    } = await forumsRequest<{
      posts: ForumsPost[];
      nextPostCursor: string | null;
    }>(
      `/thread/${threadId}/posts?filter=newest${
        cursor ? `&cursor=${cursor}` : ""
      }`
    );

    for (const post of response.posts) {
      if (post.id === lastProcessed.lastPostIdProcessed) {
        return newPosts; // Stop when we hit the last processed post
      }
      newPosts.push(post);
    }

    cursor = response.nextPostCursor;
    if (!cursor) break;

    // Safety limit
    if (newPosts.length > 100) break;
  }

  return newPosts;
}

// Helper: Process a post for trade detection
async function processPostForTrade(
  post: ForumsPost,
  threadId: string
): Promise<void> {
  const existingTrade = post.extendedData?.trade;

  // Skip if already has trade data with good confidence and price
  if (
    existingTrade &&
    existingTrade.parseConfidence >= 0.7 &&
    existingTrade.normalizedPrice !== null
  ) {
    return;
  }

  // Only process if high-likelihood trade pattern
  if (!hasHighLikelihoodTradePattern(post.body)) {
    return;
  }

  // Try rule-based detection first
  let tradeData = detectTrade(post.body);

  // If low confidence or missing price, try AI parsing
  if (
    !tradeData ||
    tradeData.parseConfidence < 0.7 ||
    tradeData.normalizedPrice === null
  ) {
    try {
      const aiResponse = await fetch(
        `${process.env.VERCEL_URL || ""}/api/ai/parse`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: post.body }),
        }
      );
      const aiData = await aiResponse.json();
      if (aiData.trade?.isTrade) {
        tradeData = aiData.trade;
      }
    } catch {
      // Keep rule-based result if AI fails
    }
  }

  // Update post if we have trade data
  if (tradeData?.isTrade) {
    await forumsRequest(`/post/${post.id}`, {
      method: "PUT",
      body: JSON.stringify({
        extendedData: { trade: tradeData },
      }),
    });
  }
}

// Helper: Count valid trades within rolling window (bounded scan)
async function countValidTradesInWindow(
  threadId: string,
  windowDays: number
): Promise<number> {
  const windowStart = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  let validCount = 0;
  let cursor: string | null = null;

  while (true) {
    const response: {
      posts: ForumsPost[];
      nextPostCursor: string | null;
    } = await forumsRequest<{
      posts: ForumsPost[];
      nextPostCursor: string | null;
    }>(
      `/thread/${threadId}/posts?filter=newest${
        cursor ? `&cursor=${cursor}` : ""
      }`
    );

    for (const post of response.posts) {
      // Stop if post is outside window
      if (new Date(post.createdAt).getTime() < windowStart) {
        return validCount;
      }

      const trade = post.extendedData?.trade;
      if (
        trade?.isTrade &&
        trade.status === "ACTIVE" &&
        trade.normalizedPrice !== null
      ) {
        validCount++;
      }
    }

    cursor = response.nextPostCursor;
    if (!cursor) break;
  }

  return validCount;
}

// Helper: Compute market snapshot
async function computeSnapshot(
  threadId: string,
  marketType: string,
  windowDays: number
): Promise<MarketSnapshot | AccountMarketSnapshot> {
  const windowStart = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const trades: PostTradeData[] = [];

  // Fetch all valid trades in window
  let cursor: string | null = null;

  while (true) {
    const response: {
      posts: ForumsPost[];
      nextPostCursor: string | null;
    } = await forumsRequest<{
      posts: ForumsPost[];
      nextPostCursor: string | null;
    }>(
      `/thread/${threadId}/posts?filter=newest${
        cursor ? `&cursor=${cursor}` : ""
      }`
    );

    for (const post of response.posts) {
      if (new Date(post.createdAt).getTime() < windowStart) {
        break;
      }

      const trade = post.extendedData?.trade;
      if (
        trade?.isTrade &&
        trade.status === "ACTIVE" &&
        trade.normalizedPrice !== null
      ) {
        trades.push(trade);
      }
    }

    cursor = response.nextPostCursor;
    if (!cursor) break;
  }

  if (
    marketType === "ITEM_MARKET" ||
    marketType === "PHYSICAL_ITEM" ||
    marketType === "GENERAL"
  ) {
    return computeItemMarketSnapshot(trades);
  } else {
    return computeAccountMarketSnapshot(trades);
  }
}

function computeItemMarketSnapshot(trades: PostTradeData[]): MarketSnapshot {
  const wtsPrices = trades
    .filter((t) => t.intent === "WTS")
    .map((t) => t.normalizedPrice!);
  const wtbPrices = trades
    .filter((t) => t.intent === "WTB")
    .map((t) => t.normalizedPrice!);

  return {
    sell: {
      median: median(wtsPrices),
      p10: percentile(wtsPrices, 10),
      p90: percentile(wtsPrices, 90),
      count: wtsPrices.length,
    },
    buy: {
      median: median(wtbPrices),
      p10: percentile(wtbPrices, 10),
      p90: percentile(wtbPrices, 90),
      count: wtbPrices.length,
    },
    totalValidCount: trades.length,
    spread: median(wtsPrices) - median(wtbPrices),
    trend: computeTrend(wtsPrices),
  };
}

function computeAccountMarketSnapshot(
  trades: PostTradeData[]
): AccountMarketSnapshot {
  const prices = trades.map((t) => t.normalizedPrice!);
  const sortedPrices = [...prices].sort((a, b) => a - b);

  // Define bands based on quartiles
  const q1 = percentile(sortedPrices, 25);
  const q2 = percentile(sortedPrices, 50);
  const q3 = percentile(sortedPrices, 75);

  const budget = prices.filter((p) => p <= q1);
  const mid = prices.filter((p) => p > q1 && p <= q2);
  const high = prices.filter((p) => p > q2 && p <= q3);
  const premium = prices.filter((p) => p > q3);

  const wtbCount = trades.filter((t) => t.intent === "WTB").length;
  const wtsCount = trades.filter((t) => t.intent === "WTS").length;

  // Extract top value drivers from accountFeatures
  const featureCounts: Record<string, number> = {};
  for (const trade of trades) {
    if (trade.accountFeatures) {
      for (const [key, value] of Object.entries(trade.accountFeatures)) {
        if (value) {
          featureCounts[key] = (featureCounts[key] || 0) + 1;
        }
      }
    }
  }
  const topValueDrivers = Object.entries(featureCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => key);

  return {
    bands: {
      budget: { median: median(budget), count: budget.length, range: [0, q1] },
      mid: { median: median(mid), count: mid.length, range: [q1, q2] },
      high: { median: median(high), count: high.length, range: [q2, q3] },
      premium: {
        median: median(premium),
        count: premium.length,
        range: [q3, Number.POSITIVE_INFINITY],
      },
    },
    demandPressure: wtsCount > 0 ? wtbCount / wtsCount : 0,
    topValueDrivers,
    totalValidCount: trades.length,
  };
}

// Helper: Check if narrative should refresh
function shouldRefreshNarrative(
  prev: MarketSnapshot | AccountMarketSnapshot | null,
  current: MarketSnapshot | AccountMarketSnapshot
): boolean {
  if (!prev) return true;

  if ("sell" in current && "sell" in prev) {
    // Item market: refresh if median changed by >10%
    const medianChange =
      Math.abs(current.sell.median - prev.sell.median) / prev.sell.median;
    return medianChange > 0.1;
  }

  if ("bands" in current && "bands" in prev) {
    // Account market: refresh if total count changed significantly
    const countChange =
      Math.abs(current.totalValidCount - prev.totalValidCount) /
      prev.totalValidCount;
    return countChange > 0.2;
  }

  return false;
}

// Statistical helpers
function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] * (upper - index) + sorted[upper] * (index - lower);
}

function computeTrend(prices: number[]): "RISING" | "STABLE" | "DECLINING" {
  if (prices.length < 10) return "STABLE";

  const firstHalf = prices.slice(0, Math.floor(prices.length / 2));
  const secondHalf = prices.slice(Math.floor(prices.length / 2));

  const firstMedian = median(firstHalf);
  const secondMedian = median(secondHalf);

  const change = (secondMedian - firstMedian) / firstMedian;

  if (change > 0.05) return "RISING";
  if (change < -0.05) return "DECLINING";
  return "STABLE";
}

// Trade detection helpers (duplicated from lib for server use)
function hasHighLikelihoodTradePattern(body: string): boolean {
  const HIGH_LIKELIHOOD_PATTERN =
    /\b(WTS|WTB|WTT|SELL|BUY|JUAL|BELI|DIJUAL|CARI|S>|B>|T>)\b/i;
  const PRICE_INDICATOR_PATTERN =
    /(\d+(?:[.,]\d+)?)\s*(k|rb|ribu|jt|juta|m|million|\$|usd|rp)/i;
  return (
    HIGH_LIKELIHOOD_PATTERN.test(body) && PRICE_INDICATOR_PATTERN.test(body)
  );
}

function detectTrade(body: string): PostTradeData | null {
  const TRADE_PATTERNS = {
    WTS: /\b(WTS|SELL|JUAL|DIJUAL|S>|SELLING|FOR\s*SALE)\b/i,
    WTB: /\b(WTB|BUY|BELI|CARI|B>|BUYING|LOOKING\s*FOR|LF)\b/i,
    WTT: /\b(WTT|TRADE|TUKAR|T>|TRADING|SWAP)\b/i,
  };

  let intent: "WTS" | "WTB" | "WTT" | null = null;
  if (TRADE_PATTERNS.WTS.test(body)) intent = "WTS";
  else if (TRADE_PATTERNS.WTB.test(body)) intent = "WTB";
  else if (TRADE_PATTERNS.WTT.test(body)) intent = "WTT";

  if (!intent) return null;

  const { price, displayPrice, currency, confidence } = parsePrice(body);

  return {
    isTrade: true,
    intent,
    status: "ACTIVE",
    displayPrice,
    normalizedPrice: price,
    currency,
    unit: "pcs",
    parseConfidence: confidence,
    parserVersion: "1.0.0",
    parsedAt: Date.now(),
  };
}

function parsePrice(body: string): {
  price: number | null;
  displayPrice: string;
  currency: string;
  confidence: number;
} {
  const PRICE_PATTERNS = [
    {
      regex: /(\d+(?:[.,]\d+)?)\s*(jt|juta)/i,
      multiplier: 1_000_000,
      currency: "IDR",
    },
    {
      regex: /(\d+(?:[.,]\d+)?)\s*(rb|ribu)/i,
      multiplier: 1_000,
      currency: "IDR",
    },
    { regex: /(\d+(?:[.,]\d+)?)\s*k\b/i, multiplier: 1_000, currency: "IDR" },
    { regex: /\$\s*(\d+(?:[.,]\d+)?)/i, multiplier: 1, currency: "USD" },
    {
      regex: /(\d+(?:[.,]\d+)?)\s*(usd|dollar)/i,
      multiplier: 1,
      currency: "USD",
    },
  ];

  for (const { regex, multiplier, currency } of PRICE_PATTERNS) {
    const match = body.match(regex);
    if (match) {
      const numStr = match[1].replace(",", ".");
      const value = Number.parseFloat(numStr) * multiplier;
      if (!isNaN(value) && value > 0) {
        return {
          price: value,
          displayPrice: match[0],
          currency,
          confidence: 0.85,
        };
      }
    }
  }

  return { price: null, displayPrice: "", currency: "UNKNOWN", confidence: 0 };
}
