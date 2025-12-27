"use client";

import { useState, useRef, useEffect } from "react";
import useSWR from "swr";
import forumsApi from "@/lib/forums-api";
import { ThreadHeader } from "./thread-header";
import { ThreadTabs } from "./thread-tabs";
import { PostList } from "@/components/post/post-list";
import { MarketPanel } from "@/components/market/market-panel";
import { InsightsPanel } from "@/components/market/insights-panel";
import { ThreadSkeleton } from "./thread-skeleton";
import { CreatePostForm } from "@/components/post/create-post-form";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Plus, X, ChevronUp } from "lucide-react";
import Link from "next/link";

interface ThreadViewProps {
  threadId: string;
}

type TabValue = "posts" | "market" | "insights";

export function ThreadView({ threadId }: ThreadViewProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("posts");
  const [refreshKey, setRefreshKey] = useState(0);
  const [showPostForm, setShowPostForm] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { isAuthenticated } = useAuth();
  const postFormRef = useRef<HTMLDivElement>(null);

  const {
    data: thread,
    error,
    isLoading,
    mutate,
  } = useSWR(["thread", threadId], () => forumsApi.threads.get(threadId), {
    revalidateOnFocus: false,
  });

  // Handle scroll to show/hide scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handlePostCreated = () => {
    setRefreshKey((prev) => prev + 1);
    mutate();
    setShowPostForm(false);
  };

  const handleFABClick = () => {
    if (!isAuthenticated) {
      return;
    }
    setShowPostForm(true);
    setTimeout(() => {
      postFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isLoading) {
    return <ThreadSkeleton />;
  }

  if (error || !thread) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <div className="h-16 w-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
            <X className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Thread not found
          </h2>
          <p className="mt-2 text-muted-foreground">
            This thread may have been deleted or does not exist.
          </p>
          <Button asChild className="mt-6 rounded-full px-8">
            <Link href="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const market = thread.extendedData?.market;
  const hasMarket = market?.marketEnabled;
  const isLocked = thread.isLocked || thread.locked;

  return (
    <>
      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Thread Header */}
        <ThreadHeader thread={thread} />

        {/* Market Tabs */}
        {hasMarket && (
          <ThreadTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            market={market}
          />
        )}

        {/* Content Area */}
        <div className="mt-6">
          {activeTab === "posts" && (
            <div className="space-y-4">
              {/* Posts Section Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  Replies
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({thread.postCount || 0})
                  </span>
                </h2>
              </div>

              {/* System Welcome Message - shown for new threads */}
              {(thread.postCount || 0) < 3 && (
                <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-lg">🏪</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      This market is open for trading!
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Post your WTS/WTB/WTT offers to activate price analytics
                      and connect with traders.
                    </p>
                  </div>
                </div>
              )}

              {/* Post List */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <PostList threadId={threadId} key={refreshKey} />
              </div>

              {/* Create Post Form */}
              {isAuthenticated && !isLocked && showPostForm && (
                <div
                  ref={postFormRef}
                  className="animate-in slide-in-from-bottom-4 duration-300"
                >
                  <div className="rounded-xl border border-primary/30 bg-card p-4 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Write a Reply</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => setShowPostForm(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <CreatePostForm
                      threadId={threadId}
                      onPostCreated={handlePostCreated}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "market" && hasMarket && (
            <MarketPanel market={market} />
          )}
          {activeTab === "insights" && hasMarket && (
            <InsightsPanel market={market} />
          )}
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
        {/* Scroll to Top */}
        {showScrollTop && (
          <Button
            onClick={scrollToTop}
            size="icon"
            variant="secondary"
            className="h-12 w-12 rounded-full shadow-lg animate-in fade-in slide-in-from-bottom-2"
          >
            <ChevronUp className="h-5 w-5" />
          </Button>
        )}

        {/* New Post FAB */}
        {isAuthenticated && !isLocked && !showPostForm && (
          <Button
            onClick={handleFABClick}
            size="icon"
            className="h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 animate-in fade-in zoom-in"
          >
            <Plus className="h-6 w-6" />
          </Button>
        )}

        {/* Login Prompt FAB */}
        {!isAuthenticated && (
          <Button
            asChild
            size="icon"
            className="h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90"
          >
            <Link href="/login">
              <Plus className="h-6 w-6" />
            </Link>
          </Button>
        )}
      </div>
    </>
  );
}
