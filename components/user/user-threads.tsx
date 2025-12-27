"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import forumsApi from "@/lib/forums-api"
import { ThreadCard } from "@/components/thread/thread-card"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { ForumsThread } from "@/lib/types"

interface UserThreadsProps {
  userId: string
}

export function UserThreads({ userId }: UserThreadsProps) {
  const [cursor, setCursor] = useState<string | null>(null)
  const [allThreads, setAllThreads] = useState<ForumsThread[]>([])

  const { data, error, isLoading } = useSWR(
    ["user-threads", userId, cursor],
    () =>
      forumsApi.users.getThreads(userId, {
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
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-destructive">Failed to load threads</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading && allThreads.length === 0) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (allThreads.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No threads created yet</p>
        </CardContent>
      </Card>
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
