import { type NextRequest, NextResponse } from "next/server";
import { minimaxChat } from "@/lib/minimax";
import {
  parseQueryIntent,
  filterTradePosts,
  computePriceStats,
  postToListing,
  formatPrice,
  getPostPrice,
  KNOWN_GAME_TAGS,
  type AssistantResponse,
  type ParsedQuery,
} from "@/lib/assistant-utils";
import type { ForumsPost, PostsResponse } from "@/lib/types";

// ============================================
// Rate Limiting (In-Memory)
// ============================================

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // queries per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(sessionId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(sessionId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(sessionId, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT) {
    return false;
  }

  entry.count++;
  return true;
}

// ============================================
// Foru.ms API Helper
// ============================================

const FORUMS_BASE_URL =
  (process.env.FORUMS_BASE_URL || "https://foru.ms") + "/api/v1";
const FORUMS_API_KEY = process.env.FORUMS_API_KEY;

async function fetchForumsApi<T>(endpoint: string): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (FORUMS_API_KEY) {
    headers["x-api-key"] = FORUMS_API_KEY;
  }

  const response = await fetch(`${FORUMS_BASE_URL}${endpoint}`, { headers });

  if (!response.ok) {
    throw new Error(`Foru.ms API error: ${response.status}`);
  }

  return response.json();
}

// ============================================
// Fetch Posts from Game-Specific Threads
// ============================================

async function fetchPosts(
  tag: string,
  tradeIntent: "WTS" | "WTB" | null
): Promise<{ posts: ForumsPost[]; scanned: number }> {
  const allPosts: ForumsPost[] = [];
  let scanned = 0;

  // Convert tag to search query (uma-musume -> uma musume)
  const tagName = tag.replace(/-/g, " ");

  try {
    // Step 1: Find threads that match the game tag
    const threadsResult = await fetchForumsApi<{
      threads: Array<{ id: string; title: string }>;
    }>(`/threads?query=${encodeURIComponent(tagName)}&filter=newest&limit=10`);

    if (threadsResult.threads && threadsResult.threads.length > 0) {
      // Step 2: Fetch posts from matching threads
      for (const thread of threadsResult.threads.slice(0, 5)) {
        try {
          const postsResult = await fetchForumsApi<PostsResponse>(
            `/thread/${thread.id}/posts?filter=newest&limit=50`
          );
          if (postsResult.posts) {
            allPosts.push(...postsResult.posts);
            scanned += postsResult.posts.length;
          }
        } catch {
          // Skip failed thread - continue to next
        }
      }

      if (allPosts.length > 0) {
        return { posts: allPosts, scanned };
      }
    }
  } catch (error) {
    console.error("Thread search failed:", error);
  }

  // Fallback: Search posts directly if thread search returns empty
  try {
    const searchQuery = [tagName, tradeIntent].filter(Boolean).join(" ");

    const searchResult = await fetchForumsApi<PostsResponse>(
      `/posts?query=${encodeURIComponent(searchQuery)}&filter=newest&limit=50`
    );

    if (searchResult.posts && searchResult.posts.length > 0) {
      allPosts.push(...searchResult.posts);
      scanned = searchResult.count || searchResult.posts.length;
    }
  } catch (error) {
    console.error("Post search failed:", error);
  }

  return { posts: allPosts, scanned };
}

// ============================================
// Generate AI Summary
// ============================================

async function generateSummary(
  intent: string,
  tag: string,
  stats: {
    min: number | null;
    median: number | null;
    max: number | null;
    count: number;
  },
  windowDays: number,
  wtbCount?: number,
  wtsCount?: number
): Promise<string> {
  try {
    const prompt = buildSummaryPrompt(
      intent,
      tag,
      stats,
      windowDays,
      wtbCount,
      wtsCount
    );

    const response = await minimaxChat(
      [
        {
          role: "system",
          content:
            "You are a market assistant. Give brief, data-driven insights in 1-2 sentences. Be concise.",
        },
        { role: "user", content: prompt },
      ],
      { temperature: 0.7, maxTokens: 150 }
    );

    return response;
  } catch {
    // Fallback to rule-based summary
    return buildFallbackSummary(
      intent,
      tag,
      stats,
      windowDays,
      wtbCount,
      wtsCount
    );
  }
}

function buildSummaryPrompt(
  intent: string,
  tag: string,
  stats: {
    min: number | null;
    median: number | null;
    max: number | null;
    count: number;
  },
  windowDays: number,
  wtbCount?: number,
  wtsCount?: number
): string {
  const tagName = tag.replace(/-/g, " ");

  if (intent === "CHEAPEST_SEARCH") {
    return `Summarize: Found ${
      stats.count
    } ${tagName} listings in last ${windowDays} days. Cheapest: ${
      stats.min ? formatPrice(stats.min) : "N/A"
    }. Median: ${stats.median ? formatPrice(stats.median) : "N/A"}.`;
  }

  if (intent === "PRICE_ANALYSIS") {
    return `Analyze: ${tagName} market in last ${windowDays} days. ${
      stats.count
    } listings. Min: ${stats.min ? formatPrice(stats.min) : "N/A"}, Median: ${
      stats.median ? formatPrice(stats.median) : "N/A"
    }, Max: ${stats.max ? formatPrice(stats.max) : "N/A"}.`;
  }

  if (intent === "DEMAND_INSIGHT") {
    return `Analyze demand for ${tagName}: ${wtbCount || 0} WTB requests vs ${
      wtsCount || 0
    } WTS listings. Is demand high or low?`;
  }

  return `List ${stats.count} recent ${tagName} listings.`;
}

function buildFallbackSummary(
  intent: string,
  tag: string,
  stats: {
    min: number | null;
    median: number | null;
    max: number | null;
    count: number;
  },
  windowDays: number,
  wtbCount?: number,
  wtsCount?: number
): string {
  const tagName = tag.replace(/-/g, " ");

  if (intent === "CHEAPEST_SEARCH") {
    if (stats.count === 0) {
      return `No active ${tagName} listings found in the last ${windowDays} days.`;
    }
    return `Found ${stats.count} ${tagName} listings. Cheapest starts at ${
      stats.min ? formatPrice(stats.min) : "N/A"
    }.`;
  }

  if (intent === "PRICE_ANALYSIS") {
    if (stats.count === 0) {
      return `Not enough data to analyze ${tagName} prices.`;
    }
    return `Based on ${
      stats.count
    } listings in the last ${windowDays} days: ${tagName} prices range from ${
      stats.min ? formatPrice(stats.min) : "N/A"
    } to ${stats.max ? formatPrice(stats.max) : "N/A"} (median: ${
      stats.median ? formatPrice(stats.median) : "N/A"
    }).`;
  }

  if (intent === "DEMAND_INSIGHT") {
    const ratio = wtsCount && wtsCount > 0 ? (wtbCount || 0) / wtsCount : 0;
    if (ratio > 1) {
      return `High demand for ${tagName}! ${wtbCount} buyers vs ${wtsCount} sellers.`;
    } else if (ratio > 0.5) {
      return `Moderate demand for ${tagName}. ${wtbCount} buyers vs ${wtsCount} sellers.`;
    }
    return `Low demand for ${tagName}. ${wtbCount} buyers vs ${wtsCount} sellers.`;
  }

  return `Showing ${stats.count} recent ${tagName} listings.`;
}

// ============================================
// Main Handler
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Get session ID from cookies or headers
    const sessionId =
      request.cookies.get("session_id")?.value ||
      request.headers.get("x-forwarded-for") ||
      "anonymous";

    // Check rate limit
    if (!checkRateLimit(sessionId)) {
      return NextResponse.json(
        {
          type: "error",
          message:
            "Rate limit exceeded. Please wait a moment before trying again.",
        } as AssistantResponse,
        { status: 429 }
      );
    }

    const { query } = (await request.json()) as { query: string };

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        {
          type: "error",
          message: "Please enter a query.",
        } as AssistantResponse,
        { status: 400 }
      );
    }

    // Parse intent
    const parsed: ParsedQuery = parseQueryIntent(query.trim());

    // Handle clarification needed
    if (parsed.intent === "CLARIFICATION") {
      return NextResponse.json({
        type: "CLARIFICATION",
        message: "Which game are you looking for?",
        options: KNOWN_GAME_TAGS.map((t) => t.label),
      } as AssistantResponse);
    }

    // Fetch posts from matching threads
    const { posts, scanned } = await fetchPosts(
      parsed.tag!,
      parsed.tradeIntent
    );

    // Filter trade posts - show all trade posts from matching threads
    const filtered = filterTradePosts(posts, {
      intent: parsed.tradeIntent || undefined, // Don't filter by intent if not specified
      // tag: not needed since posts are already from matching threads
      windowDays: 90, // Extended to 90 days to show more results
      requirePrice: false, // Don't require price, just show all trades
    });

    // Compute stats
    const stats = computePriceStats(filtered);

    // Build response based on intent
    let response: AssistantResponse;

    if (parsed.intent === "CHEAPEST_SEARCH") {
      // Sort by price ascending (using getPostPrice for body-parsed prices)
      const sorted = [...filtered].sort((a, b) => {
        const priceA = getPostPrice(a) ?? Infinity;
        const priceB = getPostPrice(b) ?? Infinity;
        return priceA - priceB;
      });

      const listings = sorted.slice(0, 5).map(postToListing);
      const summary = await generateSummary(
        parsed.intent,
        parsed.tag!,
        stats,
        parsed.windowDays
      );

      response = {
        type: "CHEAPEST_SEARCH",
        tag: parsed.tag,
        windowDays: parsed.windowDays,
        filtersUsed: { intent: "WTS", status: "ACTIVE" },
        scanned,
        matched: filtered.length,
        summary,
        stats,
        listings,
      };
    } else if (parsed.intent === "PRICE_ANALYSIS") {
      const listings = filtered.slice(0, 5).map(postToListing);
      const summary = await generateSummary(
        parsed.intent,
        parsed.tag!,
        stats,
        parsed.windowDays
      );

      response = {
        type: "PRICE_ANALYSIS",
        tag: parsed.tag,
        windowDays: parsed.windowDays,
        filtersUsed: { intent: "WTS", status: "ACTIVE" },
        scanned,
        matched: filtered.length,
        summary,
        stats,
        listings,
      };
    } else if (parsed.intent === "DEMAND_INSIGHT") {
      // Also fetch WTS for comparison
      const wtsFiltered = filterTradePosts(posts, {
        intent: "WTS",
        status: "ACTIVE",
        tag: parsed.tag,
        windowDays: parsed.windowDays,
      });

      const wtbFiltered = filterTradePosts(posts, {
        intent: "WTB",
        status: "ACTIVE",
        tag: parsed.tag,
        windowDays: parsed.windowDays,
      });

      const summary = await generateSummary(
        parsed.intent,
        parsed.tag!,
        stats,
        parsed.windowDays,
        wtbFiltered.length,
        wtsFiltered.length
      );

      response = {
        type: "DEMAND_INSIGHT",
        tag: parsed.tag,
        windowDays: parsed.windowDays,
        filtersUsed: { intent: "WTB", status: "ACTIVE" },
        scanned,
        matched: wtbFiltered.length,
        summary,
        stats: {
          min: null,
          median: null,
          max: null,
          count: wtbFiltered.length,
        },
        listings: wtbFiltered.slice(0, 5).map(postToListing),
      };
    } else {
      // LIST_RECENT
      const listings = filtered.slice(0, 10).map(postToListing);
      const summary = `Showing ${listings.length} recent ${parsed.tag?.replace(
        /-/g,
        " "
      )} listings.`;

      response = {
        type: "LIST_RECENT",
        tag: parsed.tag,
        windowDays: parsed.windowDays,
        filtersUsed: { intent: parsed.tradeIntent || "WTS", status: "ACTIVE" },
        scanned,
        matched: filtered.length,
        summary,
        listings,
      };
    }

    // Check if we have enough data
    if (response.matched === 0) {
      response.summary = `I couldn't find enough active ${
        parsed.tag?.replace(/-/g, " ") || ""
      } listings to analyze. Try a different search term or check back later.`;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("AI Assistant error:", error);
    return NextResponse.json(
      {
        type: "error",
        message: "Something went wrong. Please try again.",
      } as AssistantResponse,
      { status: 500 }
    );
  }
}
