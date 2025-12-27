import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface TrendIndicatorProps {
  trend: "RISING" | "STABLE" | "DECLINING"
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  className?: string
}

const trendConfig = {
  RISING: {
    icon: TrendingUp,
    label: "Rising",
    className: "text-wts",
  },
  STABLE: {
    icon: Minus,
    label: "Stable",
    className: "text-muted-foreground",
  },
  DECLINING: {
    icon: TrendingDown,
    label: "Declining",
    className: "text-sold",
  },
}

const sizeClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
}

const iconSizes = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
}

export function TrendIndicator({ trend, size = "md", showLabel = true, className }: TrendIndicatorProps) {
  const config = trendConfig[trend]
  const Icon = config.icon

  return (
    <span className={cn("inline-flex items-center gap-1 font-medium", sizeClasses[size], config.className, className)}>
      <Icon className={iconSizes[size]} />
      {showLabel && config.label}
    </span>
  )
}
