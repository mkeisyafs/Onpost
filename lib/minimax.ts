// Kolosal AI client for trade parsing and narrative generation
import OpenAI from "openai";

// Initialize Kolosal client using OpenAI SDK
const kolosalClient = new OpenAI({
  apiKey: process.env.KOLOSAL_API_KEY || "",
  baseURL: "https://api.kolosal.ai/v1",
});

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function minimaxChat(
  messages: ChatMessage[],
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  if (!process.env.KOLOSAL_API_KEY) {
    throw new Error("KOLOSAL_API_KEY is not configured");
  }

  const completion = await kolosalClient.chat.completions.create({
    model: "Qwen 3 30BA3B",
    messages: messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 1024,
  });

  return completion.choices[0]?.message?.content || "";
}

export async function parseTradeWithAI(postBody: string): Promise<{
  isTrade: boolean;
  intent: "WTS" | "WTB" | "WTT" | null;
  displayPrice: string | null;
  normalizedPrice: number | null;
  currency: string;
  unit: string;
  accountFeatures: Record<string, unknown> | null;
}> {
  const systemPrompt = `You are a trade post analyzer. Analyze forum posts and extract trade information.
Return ONLY a valid JSON object with this exact structure:
{
  "isTrade": boolean,
  "intent": "WTS" | "WTB" | "WTT" | null,
  "displayPrice": string or null (the raw price as written),
  "normalizedPrice": number or null (price converted to base currency unit),
  "currency": "IDR" | "USD",
  "unit": "pcs" | "bundle" | "account",
  "accountFeatures": object or null
}

Price conversion rules:
- "50rb" or "50k" = 50000 (IDR)
- "1.5jt" or "1,5jt" = 1500000 (IDR)
- "1.500.000" = 1500000 (IDR)
- "$10" or "10 USD" = 10 (USD)

Trade intent keywords:
- WTS/SELL/JUAL/DIJUAL/S> = "WTS"
- WTB/BUY/BELI/CARI/B> = "WTB"
- WTT/TRADE/TUKAR/T> = "WTT"`;

  const text = await minimaxChat(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Analyze this post:\n\n${postBody}` },
    ],
    { temperature: 0.1, maxTokens: 500 }
  );

  // Parse JSON from response
  const cleanedText = text.replace(/```json\n?|\n?```/g, "").trim();
  try {
    return JSON.parse(cleanedText);
  } catch {
    // Return non-trade if parsing fails
    return {
      isTrade: false,
      intent: null,
      displayPrice: null,
      normalizedPrice: null,
      currency: "IDR",
      unit: "pcs",
      accountFeatures: null,
    };
  }
}

export async function generateMarketNarrative(
  marketType: "ITEM_MARKET" | "ACCOUNT_MARKET" | "PHYSICAL_ITEM" | "GENERAL",
  metrics: {
    sellMedian?: number;
    sellCount?: number;
    buyMedian?: number;
    buyCount?: number;
    spread?: number;
    trend?: string;
    totalCount?: number;
    demandPressure?: number;
    bands?: Record<string, { median: number; count: number }>;
    topValueDrivers?: string[];
  },
  previousMetrics?: typeof metrics | null
): Promise<string> {
  // Convert IDR to USD for narrative (assuming prices are in IDR)
  const IDR_TO_USD = 15800;
  const toUSD = (idr: number | undefined) =>
    idr ? Math.round(idr / IDR_TO_USD) : 0;

  let prompt: string;

  if (marketType === "ITEM_MARKET" || marketType === "PHYSICAL_ITEM") {
    const medianChange = previousMetrics?.sellMedian
      ? toUSD(metrics.sellMedian) - toUSD(previousMetrics.sellMedian)
      : 0;
    const volumeChange = previousMetrics?.totalCount
      ? (metrics.totalCount || 0) - previousMetrics.totalCount
      : 0;

    const marketLabel =
      marketType === "PHYSICAL_ITEM" ? "PHYSICAL ITEMS MARKET" : "ITEM MARKET";

    prompt = `Generate a brief market insight (2-3 sentences) for this ${marketLabel}:

Current:
- Sell: $${toUSD(metrics.sellMedian)} USD median (${
      metrics.sellCount || 0
    } listings)
- Buy: $${toUSD(metrics.buyMedian)} USD median (${
      metrics.buyCount || 0
    } listings)
- Spread: $${toUSD(metrics.spread)} USD
- Trend: ${metrics.trend || "N/A"}

${
  previousMetrics
    ? `Changes: Median ${medianChange > 0 ? "+" : ""}$${medianChange}, Volume ${
        volumeChange > 0 ? "+" : ""
      }${volumeChange}`
    : ""
}

Be concise and data-driven. Always use USD for prices.`;
  } else if (marketType === "GENERAL") {
    prompt = `Generate a brief market insight (2-3 sentences) for this GENERAL MARKETPLACE:

- Total: ${metrics.totalCount || 0} listings
- Sell Median: $${toUSD(metrics.sellMedian)} USD

Focus on activity levels and pricing. Always use USD for prices. Be concise.`;
  } else {
    // Account market - convert band medians to USD
    const usdBands: Record<string, { median: number; count: number }> = {};
    if (metrics.bands) {
      for (const [key, value] of Object.entries(metrics.bands)) {
        usdBands[key] = { median: toUSD(value.median), count: value.count };
      }
    }

    prompt = `Generate a brief market insight (2-3 sentences) for this ACCOUNT MARKET:

- Total: ${metrics.totalCount || 0} listings
- Demand Pressure: ${((metrics.demandPressure || 0) * 100).toFixed(0)}%
- Bands: ${JSON.stringify(usdBands)}
- Value Drivers: ${metrics.topValueDrivers?.join(", ") || "N/A"}

Focus on tier activity and demand vs supply. Always use USD for prices. Be concise.`;
  }

  return minimaxChat(
    [
      {
        role: "system",
        content:
          "You are a market analyst. Provide brief, data-driven insights. Always express prices in USD.",
      },
      { role: "user", content: prompt },
    ],
    { temperature: 0.7, maxTokens: 200 }
  );
}
