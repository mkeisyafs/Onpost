"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import forumsApi from "@/lib/forums-api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FeedPostCard,
  type ExtendedPost,
} from "@/components/post/feed-post-card";
import type { ForumsPost } from "@/lib/types";
import { RefreshCw, ArrowDown } from "lucide-react";

interface HomeFeedProps {
  refreshKey?: number;
}

// Minimum interval between fetches (60 seconds - increased for optimization)
const MIN_FETCH_INTERVAL = 60 * 1000;

// Cache for storing fetched data
let postsCache: ForumsPost[] | null = null;
let lastFetchTime = 0;
let isFetching = false; // Prevent concurrent fetches

export function HomeFeed({ refreshKey }: HomeFeedProps) {
  const [posts, setPosts] = useState<ForumsPost[]>(postsCache || []);
  const [isLoading, setIsLoading] = useState(!postsCache);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const lastRefreshKey = useRef(refreshKey);

  const PULL_THRESHOLD = 80; // pixels to trigger refresh

  // Core fetch function with cache, throttling, and deduplication
  const fetchPosts = useCallback(async (forceRefresh = false) => {
    const now = Date.now();

    // Skip if currently fetching (prevent concurrent requests)
    if (isFetching) {
      console.log("[HomeFeed] Skipping - fetch already in progress");
      return;
    }

    // Skip if not enough time has passed and we have cached data (unless forced)
    if (
      !forceRefresh &&
      postsCache &&
      now - lastFetchTime < MIN_FETCH_INTERVAL
    ) {
      console.log("[HomeFeed] Skipping fetch - using cached data");
      setPosts(postsCache);
      setIsLoading(false);
      return;
    }

    // Mark as fetching
    isFetching = true;

    // Set loading state appropriately
    if (!postsCache) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      // Fetch posts directly from /posts endpoint (much more efficient!)
      const postsResponse = await forumsApi.posts.listAll({
        limit: 50,
        filter: "newest",
      });

      if (!postsResponse.posts || postsResponse.posts.length === 0) {
        setPosts([]);
        postsCache = [];
        lastFetchTime = now;
        return;
      }

      // Filter out replies (only show main posts)
      const mainPosts = postsResponse.posts.filter(
        (post) => !post.parentId && !post.parentPostId
      );

      // Sort by createdAt descending (should already be sorted but just in case)
      mainPosts.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Limit to 50 posts for performance
      const finalPosts = mainPosts.slice(0, 50);

      // Update cache
      postsCache = finalPosts;
      lastFetchTime = now;

      setPosts(finalPosts);
    } catch (err) {
      // Use friendly error message, suppress technical details
      const errorMessage = err instanceof Error ? err.message : "";
      // Only show error if it's not a 401 (session expired) - silently fail for auth issues
      if (errorMessage.includes("session has expired")) {
        setError(null); // Suppress auth errors, just show empty or cached data
      } else {
        setError(
          errorMessage || "Unable to load feed. Pull down to try again."
        );
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      isFetching = false; // Release lock
    }
  }, []);

  // Handle manual refresh (from pull-to-refresh)
  const handleRefresh = useCallback(async () => {
    console.log("[HomeFeed] Manual refresh triggered");
    await fetchPosts(true);
  }, [fetchPosts]);

  // Fetch posts on mount and when refreshKey changes
  useEffect(() => {
    // If refreshKey changed, force refresh
    const shouldForce = lastRefreshKey.current !== refreshKey;
    lastRefreshKey.current = refreshKey;

    fetchPosts(shouldForce);
  }, [refreshKey, fetchPosts]);

  // Pull-to-refresh touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling) return;

      const touchY = e.touches[0].clientY;
      const diff = touchY - touchStartY.current;

      if (diff > 0 && containerRef.current?.scrollTop === 0) {
        // Apply resistance effect
        const resistance = Math.min(diff * 0.5, PULL_THRESHOLD * 1.5);
        setPullDistance(resistance);
      }
    },
    [isPulling]
  );

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= PULL_THRESHOLD) {
      await handleRefresh();
    }
    setPullDistance(0);
    setIsPulling(false);
  }, [pullDistance, handleRefresh]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <FeedPostSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <p className="text-xl mb-2">🎉 Be the first to post!</p>
          <p className="text-muted-foreground">
            Start the conversation or list something for trade.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center transition-all duration-200 overflow-hidden"
        style={{
          height: pullDistance > 0 ? `${pullDistance}px` : 0,
          top: `-${pullDistance}px`,
          opacity: pullDistance / PULL_THRESHOLD,
        }}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw
            className={`h-5 w-5 ${
              pullDistance >= PULL_THRESHOLD ? "animate-spin" : ""
            }`}
            style={{
              transform: `rotate(${(pullDistance / PULL_THRESHOLD) * 180}deg)`,
            }}
          />
          <span className="text-sm">
            {pullDistance >= PULL_THRESHOLD
              ? "Release to refresh"
              : "Pull down to refresh"}
          </span>
        </div>
      </div>

      {/* Refreshing indicator */}
      {isRefreshing && (
        <div className="flex items-center justify-center py-3 mb-4 bg-muted/50 rounded-lg">
          <RefreshCw className="h-4 w-4 animate-spin mr-2 text-primary" />
          <span className="text-sm text-muted-foreground">Refreshing...</span>
        </div>
      )}

      {/* Posts list with pull effect */}
      <div
        className="space-y-4 transition-transform duration-200"
        style={{
          transform:
            pullDistance > 0 ? `translateY(${pullDistance}px)` : "none",
        }}
      >
        {posts.map((post) => (
          <FeedPostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}

function FeedPostSkeleton() {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
