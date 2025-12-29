// Trade Detection & Price Parsing Utilities

import type { PostTradeData, ParsedPrice, TradeDetectionResult } from "./types";

const PARSER_VERSION = "1.0.0";

// Trade intent patterns
const TRADE_PATTERNS = {
  WTS: /\b(WTS|SELL|JUAL|DIJUAL|S>|SELLING|FOR\s*SALE)\b/i,
  WTB: /\b(WTB|BUY|BELI|CARI|B>|BUYING|LOOKING\s*FOR|LF)\b/i,
  WTT: /\b(WTT|TRADE|TUKAR|T>|TRADING|SWAP)\b/i,
};

// Price patterns with multipliers
const PRICE_PATTERNS: Array<{
  regex: RegExp;
  multiplier: number;
  currency: string;
}> = [
  // USD patterns - prioritize these for $ symbol (most common in gaming)
  {
    regex: /\$\s*(\d+(?:[.,]\d{2})?)(?:\s|$)/i,
    multiplier: 1,
    currency: "USD",
  },
  {
    regex: /(?:take\s*all|all\s*for?)?\s*\$\s*(\d+(?:[.,]\d{2})?)/i,
    multiplier: 1,
    currency: "USD",
  },
  {
    regex: /(\d+(?:[.,]\d{2})?)\s*(?:usd|dollar|dollars)/i,
    multiplier: 1,
    currency: "USD",
  },
  // IDR patterns
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
  // Formatted IDR (1.500.000 or 1,500,000)
  {
    regex:
      /(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+)(?!\s*(?:jt|juta|rb|ribu|k|usd|dollar|\$))/i,
    multiplier: 1,
    currency: "IDR",
  },
  // Generic number as fallback (likely IDR)
  {
    regex: /(?:price|harga|@)\s*:?\s*(\d+(?:[.,]\d+)?)/i,
    multiplier: 1,
    currency: "IDR",
  },
];

// High-likelihood trade pattern (must have both intent and price indicator)
const HIGH_LIKELIHOOD_PATTERN =
  /\b(WTS|WTB|WTT|SELL|BUY|JUAL|BELI|DIJUAL|CARI|S>|B>|T>)\b/i;
const PRICE_INDICATOR_PATTERN =
  /(\$\s*\d+|(\d+(?:[.,]\d+)?)\s*(k|rb|ribu|jt|juta|m|million|usd|rp))/i;

export function hasHighLikelihoodTradePattern(body: string): boolean {
  return (
    HIGH_LIKELIHOOD_PATTERN.test(body) && PRICE_INDICATOR_PATTERN.test(body)
  );
}

export function detectTradeIntent(body: string): "WTS" | "WTB" | "WTT" | null {
  // Priority: WTS > WTB > WTT
  if (TRADE_PATTERNS.WTS.test(body)) return "WTS";
  if (TRADE_PATTERNS.WTB.test(body)) return "WTB";
  if (TRADE_PATTERNS.WTT.test(body)) return "WTT";
  return null;
}

export function parsePrice(body: string): ParsedPrice {
  for (const { regex, multiplier, currency } of PRICE_PATTERNS) {
    const match = body.match(regex);
    if (match) {
      const rawMatch = match[0];
      let numStr = match[1];

      // Handle thousand separators (both . and , are used in different locales)
      if (numStr.includes(".") && numStr.includes(",")) {
        // Assume format like 1.500,00 (European) or 1,500.00 (US)
        if (numStr.lastIndexOf(",") > numStr.lastIndexOf(".")) {
          // European: 1.500,00 -> 1500.00
          numStr = numStr.replace(/\./g, "").replace(",", ".");
        } else {
          // US: 1,500.00 -> 1500.00
          numStr = numStr.replace(/,/g, "");
        }
      } else if (numStr.match(/^\d{1,3}([.,]\d{3})+$/)) {
        // Pure thousand separators (no decimal): 1.500.000 or 1,500,000
        numStr = numStr.replace(/[.,]/g, "");
      } else {
        // Single separator - could be decimal
        // If format is X,XX or X.XX (2 digits after), treat as decimal
        // Otherwise treat as thousand separator for IDR
        const decimalMatch = numStr.match(/[.,](\d+)$/);
        if (
          decimalMatch &&
          decimalMatch[1].length === 2 &&
          currency === "USD"
        ) {
          numStr = numStr.replace(",", ".");
        } else if (decimalMatch && decimalMatch[1].length === 3) {
          // Thousand separator
          numStr = numStr.replace(/[.,]/g, "");
        } else {
          numStr = numStr.replace(",", ".");
        }
      }

      const value = Number.parseFloat(numStr) * multiplier;

      if (!isNaN(value) && value > 0) {
        return {
          raw: rawMatch,
          normalized: value,
          currency,
          confidence: 0.85,
        };
      }
    }
  }

  return {
    raw: "",
    normalized: null,
    currency: "UNKNOWN",
    confidence: 0,
  };
}

export function detectTrade(body: string): TradeDetectionResult {
  const intent = detectTradeIntent(body);

  if (!intent) {
    return { isTrade: false, confidence: 0 };
  }

  const price = parsePrice(body);

  // Calculate overall confidence
  let confidence = 0.5; // Base confidence for having an intent

  if (price.normalized !== null) {
    confidence += 0.3; // Price adds confidence
    confidence = Math.min(confidence, price.confidence);
  }

  return {
    isTrade: true,
    intent,
    price,
    confidence,
  };
}

export function createTradeData(
  body: string,
  existingData?: Partial<PostTradeData>
): PostTradeData | null {
  const result = detectTrade(body);

  if (!result.isTrade || !result.intent) {
    return null;
  }

  return {
    isTrade: true,
    intent: result.intent,
    status: existingData?.status || "ACTIVE",
    displayPrice: result.price?.raw || "",
    normalizedPrice: result.price?.normalized || null,
    currency: result.price?.currency || "IDR",
    unit: existingData?.unit || "pcs",
    parseConfidence: result.confidence,
    parserVersion: PARSER_VERSION,
    parsedAt: Date.now(),
    ...existingData,
  };
}

export function needsReparse(trade: PostTradeData): boolean {
  // Re-parse if confidence is low or price is missing
  return trade.parseConfidence < 0.7 || trade.normalizedPrice === null;
}

// Exchange rate for IDR to USD (approximate)
const IDR_TO_USD_RATE = 15800;

export function formatPrice(price: number | null, currency: string): string {
  if (price === null) return "Negotiable";

  // Convert to USD
  let usdPrice = price;

  // If labeled as IDR, convert to USD
  if (currency === "IDR") {
    usdPrice = price / IDR_TO_USD_RATE;
  }
  // If labeled as USD but price is suspiciously high (likely stored as IDR),
  // also convert. This handles legacy data where normalizedPrice was in IDR
  // but currency was labeled "USD"
  else if (currency === "USD" && price > 10000) {
    usdPrice = price / IDR_TO_USD_RATE;
  }

  // Format as USD
  if (usdPrice >= 1000) {
    return `$${(usdPrice / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }

  return `$${usdPrice.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: usdPrice < 10 ? 2 : 0,
  })}`;
}
