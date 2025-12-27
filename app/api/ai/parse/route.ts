import { type NextRequest, NextResponse } from "next/server"
import { parseTradeWithAI } from "@/lib/minimax"

// MiniMax parse proxy - extracts trade data from post body
export async function POST(request: NextRequest) {
  try {
    const { body } = await request.json()

    if (!body || typeof body !== "string") {
      return NextResponse.json({ error: "Body is required" }, { status: 400 })
    }

    const tradeData = await parseTradeWithAI(body)

    return NextResponse.json({
      trade: {
        isTrade: tradeData.isTrade,
        intent: tradeData.intent,
        status: "ACTIVE",
        displayPrice: tradeData.displayPrice || "",
        normalizedPrice: tradeData.normalizedPrice,
        currency: tradeData.currency,
        unit: tradeData.unit,
        parseConfidence: 0.9, // AI parsing has higher confidence
        parserVersion: "1.0.0-minimax",
        parsedAt: Date.now(),
        accountFeatures: tradeData.accountFeatures,
      },
    })
  } catch (error) {
    console.error("AI parse error:", error)
    const message = error instanceof Error ? error.message : "Failed to parse trade data"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
