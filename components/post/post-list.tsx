"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import forumsApi from "@/lib/forums-api"
import { PostCard } from "./post-card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { ForumsPost } from "@/lib/types"

interface PostListProps {
  threadId: string
}

export function PostList({ threadId }: PostListProps) {
  const [cursor, setCursor] = useState<string | null>(null)
  const [allPosts, setAllPosts] = useState<ForumsPost[]>([])

  const { data, error, isLoading, mutate } = useSWR(
    ["posts", threadId, cursor],
    () =>
      forumsApi.posts.list(threadId, {
        filter: "oldest",
        cursor: cursor || undefined,
        limit: 20,
      }),
    {
      revalidateOnFocus: false,
    },
  )

  useEffect(() => {
    if (data?.posts) {
      if (cursor === null) {
        setAllPosts(data.posts)
      } else {
        setAllPosts((prev) => [...prev, ...data.posts])
      }
    }
  }, [data, cursor])

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-destructive">Failed to load posts</p>
        <Button variant="outline" className="mt-4 bg-transparent" onClick={() => mutate()}>
          Try Again
        </Button>
      </div>
    )
  }

  if (isLoading && allPosts.length === 0) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (allPosts.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">No posts yet. Be the first to reply!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {allPosts.map((post) => (
        <PostCard key={post.id} post={post} onUpdate={() => mutate()} />
      ))}

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

function PostCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  )
}
