import { cn } from "@/lib/utils"
import { Shield, ShieldCheck } from "lucide-react"
import type { UserTrustData } from "@/lib/types"

interface TrustBadgeProps {
  trust?: UserTrustData
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  className?: string
}

function getTrustLevel(trust?: UserTrustData) {
  if (!trust) {
    return {
      level: "new",
      label: "New User",
      icon: Shield,
      className: "bg-muted text-muted-foreground border-border",
    }
  }

  const { completedSales, completedBuys, verifiedTransactions } = trust
  const totalTrades = completedSales + completedBuys

  if (verifiedTransactions >= 50 || totalTrades >= 100) {
    return {
      level: "trusted",
      label: "Trusted Seller",
      icon: ShieldCheck,
      className: "bg-wts/10 text-wts border-wts/30",
    }
  }

  if (verifiedTransactions >= 10 || totalTrades >= 25) {
    return {
      level: "verified",
      label: "Verified",
      icon: ShieldCheck,
      className: "bg-primary/10 text-primary border-primary/30",
    }
  }

  if (totalTrades >= 5) {
    return {
      level: "active",
      label: "Active Trader",
      icon: Shield,
      className: "bg-secondary text-foreground border-border",
    }
  }

  return {
    level: "new",
    label: "New User",
    icon: Shield,
    className: "bg-muted text-muted-foreground border-border",
  }
}

const sizeClasses = {
  sm: "px-1.5 py-0.5 text-xs gap-1",
  md: "px-2 py-1 text-sm gap-1.5",
  lg: "px-3 py-1.5 text-base gap-2",
}

const iconSizes = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
}

export function TrustBadge({ trust, size = "md", showLabel = true, className }: TrustBadgeProps) {
  const { label, icon: Icon, className: levelClassName } = getTrustLevel(trust)

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-medium",
        sizeClasses[size],
        levelClassName,
        className,
      )}
    >
      <Icon className={iconSizes[size]} />
      {showLabel && label}
    </span>
  )
}
