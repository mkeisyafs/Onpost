// MiniMax AI client for trade parsing and narrative generation

const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL || "https://api.minimax.io/v1"
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY

interface MiniMaxMessage {
  role: "system" | "user" | "assistant"
  content: string
}

interface MiniMaxCompletionRequest {
  model: string
  messages: MiniMaxMessage[]
  temperature?: number
  max_tokens?: number
}

interface MiniMaxCompletionResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

export async function minimaxChat(
  messages: MiniMaxMessage[],
  options: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  if (!MINIMAX_API_KEY) {
    throw new Error("MINIMAX_API_KEY is not configured")
  }

  const response = await fetch(`${MINIMAX_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MINIMAX_API_KEY}`,
    },
    body: JSON.stringify({
      model: "MiniMax-M2.1",
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1024,
    } as MiniMaxCompletionRequest),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`MiniMax API error: ${response.status} - ${errorText}`)
  }

  const data = (await response.json()) as MiniMaxCompletionResponse
  return data.choices[0]?.message?.content || ""
}

export async function parseTradeWithAI(postBody: string): Promise<{
  isTrade: boolean
  intent: "WTS" | "WTB" | "WTT" | null
  displayPrice: string | null
  normalizedPrice: number | null
  currency: string
  unit: string
  accountFeatures: Record<string, unknown> | null
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
- WTT/TRADE/TUKAR/T> = "WTT"`

  const text = await minimaxChat(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Analyze this post:\n\n${postBody}` },
    ],
    { temperature: 0.1, maxTokens: 500 },
  )

  // Parse JSON from response
  const cleanedText = text.replace(/```json\n?|\n?```/g, "").trim()
  try {
    return JSON.parse(cleanedText)
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
    }
  }
}

export async function generateMarketNarrative(
  marketType: "ITEM_MARKET" | "ACCOUNT_MARKET",
  metrics: {
    sellMedian?: number
    sellCount?: number
    buyMedian?: number
    buyCount?: number
    spread?: number
    trend?: string
    totalCount?: number
    demandPressure?: number
    bands?: Record<string, { median: number; count: number }>
    topValueDrivers?: string[]
  },
  previousMetrics?: typeof metrics | null,
): Promise<string> {
  let prompt: string

  if (marketType === "ITEM_MARKET") {
    const medianChange = previousMetrics?.sellMedian ? (metrics.sellMedian || 0) - previousMetrics.sellMedian : 0
    const volumeChange = previousMetrics?.totalCount ? (metrics.totalCount || 0) - previousMetrics.totalCount : 0

    prompt = `Generate a brief market insight (2-3 sentences) for this ITEM MARKET:

Current:
- Sell: ${metrics.sellMedian?.toLocaleString() || "N/A"} IDR median (${metrics.sellCount || 0} listings)
- Buy: ${metrics.buyMedian?.toLocaleString() || "N/A"} IDR median (${metrics.buyCount || 0} listings)
- Spread: ${metrics.spread?.toLocaleString() || "N/A"} IDR
- Trend: ${metrics.trend || "N/A"}

${previousMetrics ? `Changes: Median ${medianChange > 0 ? "+" : ""}${medianChange.toLocaleString()}, Volume ${volumeChange > 0 ? "+" : ""}${volumeChange}` : ""}

Be concise and data-driven.`
  } else {
    prompt = `Generate a brief market insight (2-3 sentences) for this ACCOUNT MARKET:

- Total: ${metrics.totalCount || 0} listings
- Demand Pressure: ${((metrics.demandPressure || 0) * 100).toFixed(0)}%
- Bands: ${JSON.stringify(metrics.bands || {})}
- Value Drivers: ${metrics.topValueDrivers?.join(", ") || "N/A"}

Focus on tier activity and demand vs supply. Be concise.`
  }

  return minimaxChat(
    [
      { role: "system", content: "You are a market analyst. Provide brief, data-driven insights." },
      { role: "user", content: prompt },
    ],
    { temperature: 0.7, maxTokens: 200 },
  )
}
