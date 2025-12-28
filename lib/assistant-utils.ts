// AI Market Assistant Utilities

import type { ForumsPost, PostTradeData } from "./types";

// ============================================
// Tag Aliases Mapping
// ============================================

const TAG_ALIASES: Record<string, string> = {
  // Uma Musume
  "uma musume": "uma-musume",
  umamusume: "uma-musume",
  "uma-musume": "uma-musume",
  uma: "uma-musume",

  // Genshin Impact
  genshin: "genshin-impact",
  "genshin impact": "genshin-impact",
  "genshin-impact": "genshin-impact",
  gi: "genshin-impact",

  // Mobile Legends
  "mobile legends": "mobile-legends",
  "mobile-legends": "mobile-legends",
  ml: "mobile-legends",
  mlbb: "mobile-legends",

  // Valorant
  valorant: "valorant",
  valo: "valorant",

  // Roblox
  roblox: "roblox",

  // Honkai Star Rail
  "honkai star rail": "honkai-star-rail",
  hsr: "honkai-star-rail",
  honkai: "honkai-star-rail",

  // Wuthering Waves
  "wuthering waves": "wuthering-waves",
  wuwa: "wuthering-waves",

  // Blue Archive
  "blue archive": "blue-archive",
  ba: "blue-archive",
};

// All known game tags for suggestions
export const KNOWN_GAME_TAGS = [
  { value: "uma-musume", label: "Uma Musume" },
  { value: "genshin-impact", label: "Genshin Impact" },
  { value: "mobile-legends", label: "Mobile Legends" },
  { value: "valorant", label: "Valorant" },
  { value: "roblox", label: "Roblox" },
  { value: "honkai-star-rail", label: "Honkai Star Rail" },
  { value: "wuthering-waves", label: "Wuthering Waves" },
  { value: "blue-archive", label: "Blue Archive" },
];

// ============================================
// Intent Types
// ============================================

export type AssistantIntent =
  | "CHEAPEST_SEARCH"
  | "PRICE_ANALYSIS"
  | "DEMAND_INSIGHT"
  | "LIST_RECENT"
  | "CLARIFICATION";

export interface ParsedQuery {
  intent: AssistantIntent;
  tag: string | null;
  tradeIntent: "WTS" | "WTB" | null;
  windowDays: number;
  rawQuery: string;
}

export interface AssistantResponse {
  type: AssistantIntent | "error";
  tag?: string | null;
  windowDays?: number;
  filtersUsed?: {
    intent?: "WTS" | "WTB";
    status?: string;
  };
  scanned?: number;
  matched?: number;
  summary?: string;
  stats?: {
    min: number | null;
    median: number | null;
    max: number | null;
    count: number;
  };
  listings?: AssistantListing[];
  message?: string;
  options?: string[];
}

export interface AssistantListing {
  postId: string;
  threadId: string;
  price: number | null;
  displayPrice: string | null;
  currency: string;
  description: string;
  seller: {
    id: string;
    displayName: string;
  };
  createdAt: string;
  link: string;
}

// ============================================
// Tag Extraction
// ============================================

export function extractGameTag(query: string): string | null {
  const normalized = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();

  // Check for longest matches first (multi-word aliases)
  const sortedAliases = Object.keys(TAG_ALIASES).sort(
    (a, b) => b.length - a.length
  );

  for (const alias of sortedAliases) {
    if (normalized.includes(alias)) {
      return TAG_ALIASES[alias];
    }
  }

  return null;
}

// ============================================
// Intent Parsing (Rule-Based)
// ============================================

const CHEAPEST_KEYWORDS = [
  "cheapest",
  "lowest",
  "murah",
  "termurah",
  "budget",
  "cheap",
  "find",
  "cari",
];

const ANALYSIS_KEYWORDS = [
  "analyze",
  "analysis",
  "price range",
  "average",
  "rata-rata",
  "harga",
  "pricing",
  "trend",
  "market",
];

const DEMAND_KEYWORDS = [
  "demand",
  "buying",
  "wtb",
  "wanted",
  "looking for",
  "beli",
  "cari",
  "request",
  "requests",
];

const LIST_KEYWORDS = [
  "show",
  "list",
  "recent",
  "terbaru",
  "latest",
  "tampilkan",
  "lihat",
];

export function parseQueryIntent(query: string): ParsedQuery {
  const lower = query.toLowerCase();
  const tag = extractGameTag(query);

  // Detect time window from query
  let windowDays = 7; // default
  if (lower.includes("today") || lower.includes("hari ini")) {
    windowDays = 1;
  } else if (lower.includes("14 day") || lower.includes("2 week")) {
    windowDays = 14;
  } else if (lower.includes("30 day") || lower.includes("month")) {
    windowDays = 30;
  }

  // Detect trade intent
  let tradeIntent: "WTS" | "WTB" | null = null;
  if (
    lower.includes("wtb") ||
    lower.includes("buy") ||
    lower.includes("beli")
  ) {
    tradeIntent = "WTB";
  } else if (
    lower.includes("wts") ||
    lower.includes("sell") ||
    lower.includes("jual")
  ) {
    tradeIntent = "WTS";
  }

  // Detect intent
  let intent: AssistantIntent = "LIST_RECENT";

  if (CHEAPEST_KEYWORDS.some((kw) => lower.includes(kw))) {
    intent = "CHEAPEST_SEARCH";
    tradeIntent = "WTS"; // Cheapest implies looking at sellers
  } else if (DEMAND_KEYWORDS.some((kw) => lower.includes(kw))) {
    intent = "DEMAND_INSIGHT";
    tradeIntent = "WTB";
  } else if (ANALYSIS_KEYWORDS.some((kw) => lower.includes(kw))) {
    intent = "PRICE_ANALYSIS";
    tradeIntent = tradeIntent || "WTS"; // Default to WTS for analysis
  } else if (LIST_KEYWORDS.some((kw) => lower.includes(kw))) {
    intent = "LIST_RECENT";
  }

  // If no tag detected, ask for clarification
  if (!tag) {
    return {
      intent: "CLARIFICATION",
      tag: null,
      tradeIntent: null,
      windowDays,
      rawQuery: query,
    };
  }

  return {
    intent,
    tag,
    tradeIntent,
    windowDays,
    rawQuery: query,
  };
}

// ============================================
// Trade Detection from Body
// ============================================

function detectTradeFromBody(body: string): {
  intent: "WTS" | "WTB" | "WTT" | null;
  isLikelyTrade: boolean;
} {
  const upper = body.toUpperCase();
  let intent: "WTS" | "WTB" | "WTT" | null = null;

  if (
    upper.includes("#WTS") ||
    upper.includes("WTS") ||
    upper.includes("JUAL") ||
    upper.includes("SELL")
  ) {
    intent = "WTS";
  } else if (
    upper.includes("#WTB") ||
    upper.includes("WTB") ||
    upper.includes("BELI") ||
    upper.includes("BUY")
  ) {
    intent = "WTB";
  } else if (
    upper.includes("#WTT") ||
    upper.includes("WTT") ||
    upper.includes("TUKAR") ||
    upper.includes("TRADE")
  ) {
    intent = "WTT";
  }

  return { intent, isLikelyTrade: intent !== null };
}

function parsePriceFromBody(body: string): number | null {
  // Match common price patterns
  const patterns = [
    /(\d+)[.,]?(\d*)\s*(jt|juta)/i, // 1.5jt, 2jt
    /(\d+)\s*(rb|ribu|k)/i, // 50rb, 25k
    /rp\.?\s*(\d+(?:[.,]\d+)*)/i, // Rp 50.000
    /(\d+(?:[.,]\d+)*)\s*idr/i, // 50000 IDR
    /\$\s*(\d+(?:[.,]\d+)*)/i, // $10
    /(\d+)\s*(?:per akun|\/akun|each)/i, // 25k per akun
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      let value = parseFloat(match[1].replace(/[.,]/g, ""));
      const unit = match[2]?.toLowerCase() || match[3]?.toLowerCase() || "";

      if (unit.includes("jt") || unit.includes("juta")) {
        value *= 1000000;
      } else if (unit.includes("rb") || unit.includes("ribu") || unit === "k") {
        value *= 1000;
      }

      if (value > 0 && value < 100000000000) {
        // reasonable price range
        return value;
      }
    }
  }

  return null;
}

// ============================================
// Trade Post Filtering
// ============================================

export interface FilterOptions {
  intent?: "WTS" | "WTB";
  status?: "ACTIVE" | "SOLD" | "RESERVED" | "FULFILLED" | "EXPIRED";
  tag?: string | null;
  windowDays?: number;
  requirePrice?: boolean;
}

export function filterTradePosts(
  posts: ForumsPost[],
  options: FilterOptions
): ForumsPost[] {
  const now = Date.now();
  const windowMs = (options.windowDays || 30) * 24 * 60 * 60 * 1000; // Extended to 30 days default
  const cutoff = now - windowMs;

  return posts.filter((post) => {
    const trade = post.extendedData?.trade;
    const bodyTrade = detectTradeFromBody(post.body);

    // Check if this is a trade post (either via extendedData or body detection)
    const isTrade = trade?.isTrade || bodyTrade.isLikelyTrade;
    if (!isTrade) return false;

    // Determine the trade intent
    const postIntent = trade?.intent || bodyTrade.intent;

    // Filter by intent (WTS/WTB) if specified
    if (options.intent && postIntent !== options.intent) return false;

    // Filter by status (only if extendedData has it, otherwise allow)
    if (trade?.status && options.status && trade.status !== options.status)
      return false;

    // Filter by time window
    const postDate = new Date(post.createdAt).getTime();
    if (postDate < cutoff) return false;

    // Filter by price requirement (check extendedData or parse from body)
    if (options.requirePrice) {
      const hasPrice =
        trade?.normalizedPrice != null || parsePriceFromBody(post.body) != null;
      if (!hasPrice) return false;
    }

    // Filter by tag (check post body, thread title context, or extendedData.tags)
    if (options.tag) {
      const postTags = post.extendedData?.tags || [];
      const bodyLower = post.body.toLowerCase();
      const tagVariant = options.tag.replace(/-/g, " ");

      const tagMatch =
        postTags.some(
          (t) =>
            t.toLowerCase().includes(options.tag!) ||
            t.toLowerCase().includes(tagVariant)
        ) ||
        bodyLower.includes(tagVariant) ||
        bodyLower.includes(options.tag);

      if (!tagMatch) return false;
    }

    return true;
  });
}

// Get effective price from post (extendedData or parsed from body)
export function getPostPrice(post: ForumsPost): number | null {
  return (
    post.extendedData?.trade?.normalizedPrice ?? parsePriceFromBody(post.body)
  );
}

// Get effective intent from post
export function getPostIntent(post: ForumsPost): "WTS" | "WTB" | "WTT" | null {
  return (
    post.extendedData?.trade?.intent ?? detectTradeFromBody(post.body).intent
  );
}

// ============================================
// Price Statistics
// ============================================

export interface PriceStats {
  min: number | null;
  median: number | null;
  max: number | null;
  count: number;
}

export function computePriceStats(posts: ForumsPost[]): PriceStats {
  const prices = posts
    .map((p) => getPostPrice(p))
    .filter((p): p is number => p != null && p > 0)
    .sort((a, b) => a - b);

  if (prices.length === 0) {
    return { min: null, median: null, max: null, count: 0 };
  }

  const min = prices[0];
  const max = prices[prices.length - 1];
  const mid = Math.floor(prices.length / 2);
  const median =
    prices.length % 2 === 0
      ? Math.round((prices[mid - 1] + prices[mid]) / 2)
      : prices[mid];

  return { min, median, max, count: prices.length };
}

// ============================================
// Post to Listing Conversion
// ============================================

export function postToListing(post: ForumsPost): AssistantListing {
  const trade = post.extendedData?.trade;
  const author = post.author || post.user;
  const price = getPostPrice(post);

  // Parse display price from body if not in extendedData
  let displayPrice = trade?.displayPrice ?? null;
  if (!displayPrice && price) {
    displayPrice = formatPrice(price);
  }

  // Get seller name from multiple possible fields
  // Note: Author data might not be embedded in list responses, but will be in modal
  const postAny = post as unknown as Record<string, unknown>;
  const sellerName =
    author?.displayName ||
    author?.username ||
    (postAny["authorName"] as string) ||
    (postAny["userName"] as string) ||
    "View Seller";

  return {
    postId: post.id,
    threadId: post.threadId,
    price: price,
    displayPrice: displayPrice,
    currency: trade?.currency || "IDR",
    description:
      post.body.slice(0, 150) + (post.body.length > 150 ? "..." : ""),
    seller: {
      id: post.authorId || post.userId || "",
      displayName: sellerName,
    },
    createdAt: post.createdAt,
    link: `/thread/${post.threadId}#post-${post.id}`,
  };
}

// ============================================
// Format Price for Display
// ============================================

export function formatPrice(price: number, currency: string = "IDR"): string {
  if (currency === "USD") {
    return `$${price.toLocaleString()}`;
  }
  // IDR formatting
  if (price >= 1000000) {
    return `${(price / 1000000).toFixed(1)}jt`;
  }
  if (price >= 1000) {
    return `${Math.round(price / 1000)}rb`;
  }
  return price.toLocaleString();
}
