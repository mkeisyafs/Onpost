import { cn } from "@/lib/utils"
import { Check, Clock, XCircle, AlertCircle } from "lucide-react"
import type { PostTradeData } from "@/lib/types"

interface StatusBadgeProps {
  status: PostTradeData["status"]
  size?: "sm" | "md"
  showIcon?: boolean
  className?: string
}

const statusConfig = {
  ACTIVE: {
    label: "Active",
    icon: Clock,
    className: "bg-primary/10 text-primary border-primary/20",
  },
  RESERVED: {
    label: "Reserved",
    icon: AlertCircle,
    className: "bg-reserved/10 text-reserved border-reserved/20",
  },
  SOLD: {
    label: "Sold",
    icon: Check,
    className: "bg-sold/10 text-sold border-sold/20",
  },
  FULFILLED: {
    label: "Fulfilled",
    icon: Check,
    className: "bg-wts/10 text-wts border-wts/20",
  },
  EXPIRED: {
    label: "Expired",
    icon: XCircle,
    className: "bg-muted text-muted-foreground border-border",
  },
}

export function StatusBadge({ status, size = "md", showIcon = true, className }: StatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border font-medium",
        size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-xs",
        config.className,
        className,
      )}
    >
      {showIcon && <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />}
      {config.label}
    </span>
  )
}
