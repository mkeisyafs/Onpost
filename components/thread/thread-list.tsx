"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import forumsApi from "@/lib/forums-api"
import { ThreadCard } from "./thread-card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { ForumsThread } from "@/lib/types"

interface ThreadListProps {
  categoryId?: string
  authorId?: string
}

export function ThreadList({ categoryId, authorId }: ThreadListProps) {
  const [cursor, setCursor] = useState<string | null>(null)
  const [allThreads, setAllThreads] = useState<ForumsThread[]>([])

  const { data, error, isLoading } = useSWR(
    ["threads", categoryId, authorId, cursor],
    () =>
      forumsApi.threads.list({
        categoryId,
        authorId,
        filter: "newest",
        cursor: cursor || undefined,
        limit: 20,
      }),
    {
      revalidateOnFocus: false,
    },
  )

  useEffect(() => {
    if (data?.threads) {
      if (cursor === null) {
        setAllThreads(data.threads)
      } else {
        setAllThreads((prev) => [...prev, ...data.threads])
      }
    }
  }, [data, cursor])

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-destructive">Failed to load threads</p>
        <Button variant="outline" className="mt-4 bg-transparent" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    )
  }

  if (isLoading && allThreads.length === 0) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <ThreadCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (allThreads.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">No threads found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {allThreads.map((thread) => (
        <ThreadCard key={thread.id} thread={thread} />
      ))}

      {data?.nextThreadCursor && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={() => setCursor(data.nextThreadCursor)} disabled={isLoading}>
            {isLoading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  )
}

function ThreadCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </div>
  )
}
