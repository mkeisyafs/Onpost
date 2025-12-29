"use client";

import { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, X, ChevronUp, Image, Smile } from "lucide-react";
import Link from "next/link";
import { useAuthModal } from "@/lib/auth-modal-context";

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
  const { openAuthModal } = useAuthModal();

  const {
    data: thread,
    error,
    isLoading,
    mutate,
  } = useSWR(["thread", threadId], () => forumsApi.threads.get(threadId), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000, // Don't refetch for 60 seconds
    shouldRetryOnError: false, // Don't auto-retry on error
  });

  // Fetch posts to get actual count (with error resilience)
  const { data: postsData } = useSWR(
    thread ? ["posts-count", threadId, refreshKey] : null,
    () => forumsApi.posts.list(threadId, { limit: 100, filter: "newest" }),
    {
      revalidateOnFocus: false,
      // Don't spam retries on 500 errors
      shouldRetryOnError: false,
      errorRetryCount: 0,
    }
  );

  // Get actual post count from fetched data
  const actualPostCount = postsData?.posts?.length ?? thread?.postCount ?? 0;

  // Handle scroll to show/hide scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Scroll to hash anchor when page loads (for #post-xxx links)
  useEffect(() => {
    // Wait for thread to load, then scroll to anchor
    if (!isLoading && thread) {
      const hash = window.location.hash;
      if (hash && hash.startsWith("#post-")) {
        // Small delay to ensure DOM is rendered
        setTimeout(() => {
          const element = document.querySelector(hash);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            // Highlight the post briefly
            element.classList.add("ring-2", "ring-primary", "ring-offset-2");
            setTimeout(() => {
              element.classList.remove(
                "ring-2",
                "ring-primary",
                "ring-offset-2"
              );
            }, 3000);
          }
        }, 500);
      }
    }
  }, [isLoading, thread]);

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
        <ThreadHeader thread={thread} postCount={actualPostCount} />

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
                  Post
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({actualPostCount})
                  </span>
                </h2>
              </div>

              {/* System Welcome Message - shown for new threads */}
              {(thread.postCount ?? 0) < 3 && (
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
      <div className="fixed bottom-20 lg:bottom-6 right-6 flex flex-col gap-3 z-50">
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
        {isAuthenticated && !isLocked && (
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
            onClick={() => openAuthModal("signin")}
            size="icon"
            className="h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90"
          >
            <Plus className="h-6 w-6" />
          </Button>
        )}
      </div>

      {/* Create Post Modal */}
      <Dialog open={showPostForm} onOpenChange={setShowPostForm}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
          <DialogHeader className="px-6 py-4 border-b border-border/50 bg-muted/30">
            <DialogTitle className="text-center text-lg font-semibold">
              Create Post
            </DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <CreatePostForm
              threadId={threadId}
              onPostCreated={handlePostCreated}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
