"use client"

import { useState } from "react"
import useSWR from "swr"
import forumsApi from "@/lib/forums-api"
import { ThreadHeader } from "./thread-header"
import { ThreadTabs } from "./thread-tabs"
import { PostList } from "@/components/post/post-list"
import { MarketPanel } from "@/components/market/market-panel"
import { InsightsPanel } from "@/components/market/insights-panel"
import { ThreadSkeleton } from "./thread-skeleton"
import { CreatePostForm } from "@/components/post/create-post-form"
import { useAuth } from "@/lib/auth-context"

interface ThreadViewProps {
  threadId: string
}

type TabValue = "posts" | "market" | "insights"

export function ThreadView({ threadId }: ThreadViewProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("posts")
  const { isAuthenticated } = useAuth()

  const {
    data: thread,
    error,
    isLoading,
    mutate,
  } = useSWR(["thread", threadId], () => forumsApi.threads.get(threadId), {
    revalidateOnFocus: false,
  })

  if (isLoading) {
    return <ThreadSkeleton />
  }

  if (error || !thread) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <h2 className="text-lg font-semibold text-foreground">Thread not found</h2>
          <p className="mt-2 text-muted-foreground">This thread may have been deleted or does not exist.</p>
        </div>
      </div>
    )
  }

  const market = thread.extendedData?.market
  const hasMarket = market?.marketEnabled

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <ThreadHeader thread={thread} />

      {hasMarket && <ThreadTabs activeTab={activeTab} onTabChange={setActiveTab} market={market} />}

      <div className="mt-6">
        {activeTab === "posts" && (
          <div className="space-y-6">
            <PostList threadId={threadId} />
            {isAuthenticated && !thread.isLocked && (
              <CreatePostForm threadId={threadId} onPostCreated={() => mutate()} />
            )}
          </div>
        )}
        {activeTab === "market" && hasMarket && <MarketPanel market={market} />}
        {activeTab === "insights" && hasMarket && <InsightsPanel market={market} />}
      </div>
    </div>
  )
}
