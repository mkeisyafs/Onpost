import { type NextRequest, NextResponse } from "next/server";
import { minimaxChat } from "@/lib/minimax";
import {
  parseQueryIntent,
  filterTradePosts,
  computePriceStats,
  postToListing,
  formatPrice,
  getPostPrice,
  extractSearchKeywords,
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
  tag: string | null,
  tradeIntent: "WTS" | "WTB" | null,
  rawQuery?: string
): Promise<{ posts: ForumsPost[]; scanned: number }> {
  const allPosts: ForumsPost[] = [];
  let scanned = 0;

  // Build search query - use tag if available, otherwise extract keywords from raw query
  let searchQuery = "";
  if (tag) {
    searchQuery = tag.replace(/-/g, " ");
  } else if (rawQuery) {
    const keywords = extractSearchKeywords(rawQuery);
    searchQuery = keywords.join(" ");
  }

  if (!searchQuery) {
    return { posts: [], scanned: 0 };
  }

  try {
    // Step 1: Find threads that match the search query
    const threadsResult = await fetchForumsApi<{
      threads: Array<{ id: string; title: string }>;
    }>(
      `/threads?query=${encodeURIComponent(searchQuery)}&filter=newest&limit=10`
    );

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
    const fullQuery = [searchQuery, tradeIntent].filter(Boolean).join(" ");

    const searchResult = await fetchForumsApi<PostsResponse>(
      `/posts?query=${encodeURIComponent(fullQuery)}&filter=newest&limit=50`
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
      return `  rate demand for ${tagName}. ${wtbCount} buyers vs ${wtsCount} sellers.`;
    }
    return `Low demand for ${tagName}. ${wtbCount} buyers vs ${wtsCount} sellers.`;
  }

  return `Showing ${stats.count} recent ${tagName} listings.`;
}

// ============================================
// Smart Fallback Response Generator
// ============================================

function generateSmartFallback(
  query: string,
  listings: ReturnType<typeof postToListing>[],
  matched: number,
  parsed: ParsedQuery
): string {
  const q = query.toLowerCase().trim();

  // Greetings
  if (/^(hi|hello|hey|halo|hai|yo|sup)[\s!?.,]*$/i.test(q)) {
    return "Hey! 👋 I'm your marketplace assistant. I can help you find items, check prices, or discover trending products. What are you looking for today?";
  }

  // Popular/trending queries
  if (/popular|trending|laris|terlaris|best.?sell|hot|most.?sell/i.test(q)) {
    if (listings.length > 0) {
      return `Here are some of the most active listings right now! I found ${matched} items that are getting attention. Check them out below 👇`;
    }
    return "I'd need to check the latest market data to show you trending items. Try asking about specific categories like 'popular shoes' or 'trending gaming accounts'!";
  }

  // Price queries
  if (/price|harga|berapa|cost|how much|cheapest|termurah|murah/i.test(q)) {
    if (listings.length > 0 && parsed.tag) {
      const tagName = parsed.tag.replace(/-/g, " ");
      return `I found ${matched} ${tagName} listings with various prices. Here are some options for you to compare 👇`;
    }
    return "I can help you find prices! Just tell me what item you're looking for, like 'price of Nike shoes' or 'cheapest gaming accounts'.";
  }

  // Search/find queries
  if (/find|search|cari|looking for|show|tampilkan|list/i.test(q)) {
    if (listings.length > 0) {
      return `Found ${matched} listings matching your search! Here's what's available 👇`;
    }
    return "I'd be happy to help you find something! Could you be more specific about what you're looking for?";
  }

  // WTS/WTB/Sell/Buy queries
  if (/wts|wtb|sell|buy|jual|beli/i.test(q)) {
    if (listings.length > 0) {
      const intent = /wtb|buy|beli/i.test(q)
        ? "buy requests"
        : "items for sale";
      return `I found ${matched} ${intent}! Take a look at the listings below 👇`;
    }
    return "I can help you find sellers or buyers! Try being more specific, like 'WTS Nike shoes' or 'WTB gaming account'.";
  }

  // Recommendations
  if (/recommend|suggest|advice|saran|rekomendasi/i.test(q)) {
    if (listings.length > 0) {
      return `Based on what's available, here are some recommendations for you! Found ${matched} options 👇`;
    }
    return "I'd love to give recommendations! Tell me what category interests you - shoes, electronics, gaming accounts, or something else?";
  }

  // Generic with listings
  if (listings.length > 0) {
    const tagName = parsed.tag ? parsed.tag.replace(/-/g, " ") : "items";
    return `I found ${matched} ${tagName} that might interest you! Check out the listings below 👇`;
  }

  // Fallback for unknown queries
  return "I'm here to help you with the marketplace! You can ask me to:\n• Find items (e.g., 'find Nike shoes')\n• Check prices (e.g., 'price of gaming accounts')\n• Show trending items\n• Search for buyers or sellers\n\nWhat would you like to know?";
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

    const { query, conversationHistory } = (await request.json()) as {
      query: string;
      conversationHistory?: Array<{
        role: "user" | "assistant";
        content: string;
      }>;
    };

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        {
          type: "error",
          message: "Please enter a message.",
        } as AssistantResponse,
        { status: 400 }
      );
    }

    // Parse intent to see if this might be market-related
    const parsed: ParsedQuery = parseQueryIntent(query.trim());

    // Always try to get market context for AI to use if relevant
    let marketContext = "";
    let listings: ReturnType<typeof postToListing>[] = [];
    let scanned = 0;
    let matched = 0;

    // Try to fetch relevant market data based on query analysis
    if (parsed.tag || parsed.tradeIntent) {
      const { posts, scanned: scanCount } = await fetchPosts(
        parsed.tag,
        parsed.tradeIntent,
        parsed.rawQuery
      );
      scanned = scanCount;

      if (posts.length > 0) {
        const filtered = filterTradePosts(posts, {
          intent: parsed.tradeIntent || undefined,
          windowDays: 90,
          requirePrice: false,
        });
        matched = filtered.length;

        if (filtered.length > 0) {
          const stats = computePriceStats(filtered);
          listings = filtered.slice(0, 5).map(postToListing);

          // Build context for AI
          marketContext = `\n\nMARKET DATA (from foru.ms database):
- Search topic: ${parsed.tag?.replace(/-/g, " ") || "general"}
- Found ${filtered.length} listings from ${scanCount} posts analyzed
- Price range: ${stats.min ? formatPrice(stats.min) : "N/A"} - ${
            stats.max ? formatPrice(stats.max) : "N/A"
          }
- Median price: ${stats.median ? formatPrice(stats.median) : "N/A"}

Recent listings:
${listings
  .map(
    (l, i) =>
      `${i + 1}. ${l.title} - ${
        l.price ? formatPrice(l.price) : "Price not listed"
      } (${l.intent})`
  )
  .join("\n")}`;
        }
      }
    }

    // Fetch recent market activity if no specific data was found
    if (!marketContext) {
      try {
        const recentPosts = await fetchForumsApi<PostsResponse>(
          `/posts?filter=newest&limit=20`
        );

        if (recentPosts.posts && recentPosts.posts.length > 0) {
          scanned = recentPosts.posts.length;
          const tradePosts = filterTradePosts(recentPosts.posts, {
            windowDays: 30,
            requirePrice: false,
          });
          matched = tradePosts.length;

          if (tradePosts.length > 0) {
            listings = tradePosts.slice(0, 5).map(postToListing);
            marketContext = `\n\nRECENT MARKET ACTIVITY (from foru.ms):
- ${tradePosts.length} active trade posts found
Recent listings:
${listings
  .map(
    (l, i) =>
      `${i + 1}. ${l.title} - ${l.price ? formatPrice(l.price) : "No price"} (${
        l.intent
      })`
  )
  .join("\n")}`;
          }
        }
      } catch {
        // Continue without market context
      }
    }

    // Build conversation for AI
    const systemPrompt = `You are a helpful, friendly AI assistant for ONPOST, a gaming marketplace platform. You have access to real-time market data from foru.ms trading platform.

Your capabilities:
- Answer ANY question the user asks (general knowledge, advice, casual chat, etc.)
- Provide market insights when relevant data is available
- Help users find deals, understand prices, and navigate the marketplace
- Be conversational and engaging

Important guidelines:
- NEVER refuse to answer a question. Always try to help.
- If you don't have market data for a specific query, still try to be helpful with general advice
- When market data is available, incorporate it naturally into your response
- Be concise but informative
- Use a friendly, casual tone
- Prices are in USD

${marketContext}`;

    const messages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [{ role: "system", content: systemPrompt }];

    // Add conversation history if provided
    if (conversationHistory && Array.isArray(conversationHistory)) {
      messages.push(...conversationHistory.slice(-6)); // Keep last 6 messages for context
    }

    // Add current query
    messages.push({ role: "user", content: query });

    // Generate AI response - no fallback, pure AI
    const aiResponse = await minimaxChat(messages, {
      temperature: 0.8,
      maxTokens: 500,
    });

    // Build response
    const response: AssistantResponse = {
      type: "CHAT_RESPONSE",
      message: aiResponse,
      tag: parsed.tag || null,
      windowDays: parsed.windowDays,
      scanned,
      matched,
      listings: listings.length > 0 ? listings : undefined,
    };

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
