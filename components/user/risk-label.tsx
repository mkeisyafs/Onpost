import { cn } from "@/lib/utils"
import { AlertTriangle, CheckCircle, HelpCircle } from "lucide-react"
import type { UserTrustData } from "@/lib/types"

interface RiskLabelProps {
  trust?: UserTrustData
  className?: string
}

type RiskLevel = "low" | "medium" | "high" | "unknown"

function assessRisk(trust?: UserTrustData): RiskLevel {
  if (!trust) return "unknown"

  const { completedSales, completedBuys, verifiedTransactions } = trust
  const totalTrades = completedSales + completedBuys

  if (verifiedTransactions >= 10 || totalTrades >= 25) {
    return "low"
  }

  if (totalTrades >= 5) {
    return "medium"
  }

  return "high"
}

const riskConfig = {
  low: {
    label: "Low Risk",
    description: "Established trader with verified history",
    icon: CheckCircle,
    className: "bg-wts/10 text-wts border-wts/30",
  },
  medium: {
    label: "Medium Risk",
    description: "Some trading history, use caution",
    icon: AlertTriangle,
    className: "bg-reserved/10 text-reserved border-reserved/30",
  },
  high: {
    label: "High Risk",
    description: "New or unverified trader",
    icon: AlertTriangle,
    className: "bg-sold/10 text-sold border-sold/30",
  },
  unknown: {
    label: "Unknown",
    description: "No trading history available",
    icon: HelpCircle,
    className: "bg-muted text-muted-foreground border-border",
  },
}

export function RiskLabel({ trust, className }: RiskLabelProps) {
  const risk = assessRisk(trust)
  const config = riskConfig[risk]
  const Icon = config.icon

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
          config.className,
        )}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
      <span className="text-xs text-muted-foreground">{config.description}</span>
    </div>
  )
}
