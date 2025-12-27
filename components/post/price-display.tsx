import { cn } from "@/lib/utils"
import { formatPrice } from "@/lib/trade-detection"
import type { PostTradeData } from "@/lib/types"

interface PriceDisplayProps {
  price: number | null
  displayPrice: string
  currency: string
  status?: PostTradeData["status"]
  className?: string
}

export function PriceDisplay({ price, displayPrice, currency, status = "ACTIVE", className }: PriceDisplayProps) {
  const formattedPrice = formatPrice(price, currency)
  const isInactive = status === "SOLD" || status === "FULFILLED" || status === "EXPIRED"

  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span
        className={cn("text-xl font-bold", isInactive ? "text-muted-foreground line-through" : "text-primary")}
        title={`Original: ${displayPrice}`}
      >
        {formattedPrice}
      </span>
      {displayPrice && displayPrice !== formattedPrice && (
        <span className="text-sm text-muted-foreground">({displayPrice})</span>
      )}
    </div>
  )
}
