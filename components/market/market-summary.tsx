import type { LucideIcon } from "lucide-react"
import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface MarketSummaryProps {
  title: string
  value: string | React.ReactNode
  description?: string
  icon?: LucideIcon
  trend?: "RISING" | "STABLE" | "DECLINING"
  className?: string
}

export function MarketSummary({ title, value, description, icon: Icon, trend, className }: MarketSummaryProps) {
  return (
    <Card className={cn(className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <div className="text-2xl font-bold text-foreground">{value}</div>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {Icon && (
            <div
              className={cn(
                "rounded-lg p-2",
                trend === "RISING" && "bg-wts/10 text-wts",
                trend === "DECLINING" && "bg-sold/10 text-sold",
                trend === "STABLE" && "bg-muted text-muted-foreground",
                !trend && "bg-primary/10 text-primary",
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
