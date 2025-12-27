"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import forumsApi from "@/lib/forums-api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TradeBadge } from "@/components/post/trade-badge"
import { PriceDisplay } from "@/components/post/price-display"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import type { ForumsPost } from "@/lib/types"

interface UserListingsProps {
  userId: string
}

export function UserListings({ userId }: UserListingsProps) {
  const [cursor, setCursor] = useState<string | null>(null)
  const [allPosts, setAllPosts] = useState<ForumsPost[]>([])

  const { data, error, isLoading } = useSWR(
    ["user-listings", userId, cursor],
    () =>
      forumsApi.users.getPosts(userId, {
        cursor: cursor || undefined,
        limit: 20,
      }),
    {
      revalidateOnFocus: false,
    },
  )

  useEffect(() => {
    if (data?.posts) {
      // Filter to only trade posts
      const tradePosts = data.posts.filter((p) => p.extendedData?.trade?.isTrade)
      if (cursor === null) {
        setAllPosts(tradePosts)
      } else {
        setAllPosts((prev) => [...prev, ...tradePosts])
      }
    }
  }, [data, cursor])

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-destructive">Failed to load listings</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading && allPosts.length === 0) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <Skeleton className="h-16 w-16 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (allPosts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No trade listings yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {allPosts.map((post) => {
        const trade = post.extendedData?.trade
        if (!trade) return null

        return (
          <Link key={post.id} href={`/thread/${post.threadId}#post-${post.id}`}>
            <Card className="transition-colors hover:bg-card/80">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <TradeBadge intent={trade.intent} status={trade.status} size="sm" />
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="mt-2 text-foreground line-clamp-2">{post.body}</p>
                  </div>
                  {trade.normalizedPrice !== null && (
                    <PriceDisplay
                      price={trade.normalizedPrice}
                      displayPrice={trade.displayPrice}
                      currency={trade.currency}
                      status={trade.status}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}

      {data?.nextPostCursor && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={() => setCursor(data.nextPostCursor)} disabled={isLoading}>
            {isLoading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  )
}
