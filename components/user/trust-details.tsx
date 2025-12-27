"use client"

import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import forumsApi from "@/lib/forums-api"
import { ShieldCheck, TrendingUp, ShoppingCart, CheckCircle } from "lucide-react"
import type { UserTrustData, ForumsPost } from "@/lib/types"

interface TrustDetailsProps {
  trust: UserTrustData
  userId: string
}

export function TrustDetails({ trust, userId }: TrustDetailsProps) {
  // Optionally compute fresh trust stats from user's posts
  const { data: postsData } = useSWR(
    ["user-posts-trust", userId],
    async () => {
      const response = await forumsApi.users.getPosts(userId, { limit: 100 })
      return response.posts
    },
    {
      revalidateOnFocus: false,
    },
  )

  // Compute stats from posts if available
  const computedStats = postsData ? computeTrustFromPosts(postsData) : trust

  const totalTrades = computedStats.completedSales + computedStats.completedBuys
  const nextMilestone = getNextMilestone(totalTrades)
  const progress = nextMilestone ? (totalTrades / nextMilestone.target) * 100 : 100

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <CardTitle>Trust Score</CardTitle>
        </div>
        <CardDescription>Trading history and verification status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-3">
          {/* Completed Sales */}
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-wts/10 p-3">
              <TrendingUp className="h-5 w-5 text-wts" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{computedStats.completedSales}</p>
              <p className="text-sm text-muted-foreground">Completed Sales</p>
            </div>
          </div>

          {/* Completed Buys */}
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-wtb/10 p-3">
              <ShoppingCart className="h-5 w-5 text-wtb" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{computedStats.completedBuys}</p>
              <p className="text-sm text-muted-foreground">Completed Buys</p>
            </div>
          </div>

          {/* Verified Transactions */}
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <CheckCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{computedStats.verifiedTransactions}</p>
              <p className="text-sm text-muted-foreground">Verified</p>
            </div>
          </div>
        </div>

        {/* Progress to Next Level */}
        {nextMilestone && (
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress to {nextMilestone.label}</span>
              <span className="text-foreground">
                {totalTrades} / {nextMilestone.target}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function computeTrustFromPosts(posts: ForumsPost[]): UserTrustData {
  let completedSales = 0
  let completedBuys = 0
  let verifiedTransactions = 0

  for (const post of posts) {
    const trade = post.extendedData?.trade
    if (!trade?.isTrade) continue

    if (trade.status === "SOLD" || trade.status === "FULFILLED") {
      if (trade.intent === "WTS") {
        completedSales++
        if (trade.verified?.buyerConfirmed) {
          verifiedTransactions++
        }
      } else if (trade.intent === "WTB") {
        completedBuys++
        if (trade.verified?.buyerConfirmed) {
          verifiedTransactions++
        }
      }
    }
  }

  return {
    completedSales,
    completedBuys,
    verifiedTransactions,
    computedAt: Date.now(),
  }
}

function getNextMilestone(totalTrades: number) {
  const milestones = [
    { target: 5, label: "Active Trader" },
    { target: 25, label: "Verified" },
    { target: 100, label: "Trusted Seller" },
  ]

  return milestones.find((m) => totalTrades < m.target) || null
}
