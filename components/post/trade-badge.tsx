import { cn } from "@/lib/utils"
import type { PostTradeData } from "@/lib/types"

interface TradeBadgeProps {
  intent: PostTradeData["intent"]
  status?: PostTradeData["status"]
  size?: "sm" | "md" | "lg"
  className?: string
}

const intentConfig = {
  WTS: {
    label: "WTS",
    fullLabel: "Want to Sell",
    className: "bg-wts/20 text-wts border-wts/30",
  },
  WTB: {
    label: "WTB",
    fullLabel: "Want to Buy",
    className: "bg-wtb/20 text-wtb border-wtb/30",
  },
  WTT: {
    label: "WTT",
    fullLabel: "Want to Trade",
    className: "bg-wtt/20 text-wtt border-wtt/30",
  },
}

const statusConfig = {
  ACTIVE: null, // No extra styling for active
  RESERVED: {
    label: "Reserved",
    className: "bg-reserved/20 text-reserved border-reserved/30",
  },
  SOLD: {
    label: "Sold",
    className: "bg-sold/20 text-sold border-sold/30",
  },
  FULFILLED: {
    label: "Fulfilled",
    className: "bg-wts/20 text-wts border-wts/30",
  },
  EXPIRED: {
    label: "Expired",
    className: "bg-muted text-muted-foreground border-border",
  },
}

const sizeClasses = {
  sm: "px-1.5 py-0.5 text-xs",
  md: "px-2 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
}

export function TradeBadge({ intent, status = "ACTIVE", size = "md", className }: TradeBadgeProps) {
  const intentData = intentConfig[intent]
  const statusData = status !== "ACTIVE" ? statusConfig[status] : null

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span
        className={cn("inline-flex items-center rounded border font-medium", sizeClasses[size], intentData.className)}
        title={intentData.fullLabel}
      >
        {intentData.label}
      </span>
      {statusData && (
        <span
          className={cn("inline-flex items-center rounded border font-medium", sizeClasses[size], statusData.className)}
        >
          {statusData.label}
        </span>
      )}
    </div>
  )
}
