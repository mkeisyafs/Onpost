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
import { RefreshCw } from "lucide-react";

interface HomeFeedProps {
  refreshKey?: number;
}

// Minimum interval between fetches (30 seconds - reduced for better UX)
const MIN_FETCH_INTERVAL = 30 * 1000;

// Module-level cache (persists across mounts for performance)
let postsCache: ExtendedPost[] | null = null;
let lastFetchTime = 0;
let cacheVersion = 0; // Incremented when cache is invalidated

// Cache for thread titles to avoid fetching same thread multiple times
const threadTitleCache = new Map<string, string>();

// Set of callbacks to notify HomeFeed instances when cache is invalidated
const cacheInvalidationListeners = new Set<() => void>();

/**
 * Call this function to invalidate the HomeFeed cache and trigger a refetch.
 * Use this after creating a post, liking a post, or any action that should
 * update the feed.
 */
export function invalidateHomeFeedCache() {
  console.log("[HomeFeed] Cache invalidated externally");
  postsCache = null;
  lastFetchTime = 0;
  cacheVersion++;
  // Notify all mounted HomeFeed instances
  cacheInvalidationListeners.forEach((listener) => listener());
}

export function HomeFeed({ refreshKey }: HomeFeedProps) {
  const [posts, setPosts] = useState<ExtendedPost[]>(postsCache || []);
  const [isLoading, setIsLoading] = useState(!postsCache);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const lastRefreshKey = useRef(refreshKey);
  
  // Per-component fetch lock (prevents issues with global lock getting stuck)
  const isFetchingRef = useRef(false);
  // Track if component is mounted (for cleanup)
  const isMountedRef = useRef(true);
  // Track cache version to detect invalidation
  const lastCacheVersionRef = useRef(cacheVersion);

  const PULL_THRESHOLD = 80; // pixels to trigger refresh

  // Core fetch function with cache, throttling, and deduplication
  const fetchPosts = useCallback(async (forceRefresh = false) => {
    const now = Date.now();

    // Check if cache was invalidated externally
    if (lastCacheVersionRef.current !== cacheVersion) {
      forceRefresh = true;
      lastCacheVersionRef.current = cacheVersion;
    }

    // Skip if currently fetching (prevent concurrent requests)
    // But allow if forceRefresh AND we've been waiting too long (safety valve)
    if (isFetchingRef.current) {
      console.log("[HomeFeed] Skipping - fetch already in progress");
      return;
    }

    // Skip if not enough time has passed and we have cached data (unless forced)
    if (
      !forceRefresh &&
      postsCache &&
      postsCache.length > 0 &&
      now - lastFetchTime < MIN_FETCH_INTERVAL
    ) {
      console.log("[HomeFeed] Skipping fetch - using cached data");
      // Still sync local state with cache in case it was updated elsewhere
      setPosts(postsCache);
      setIsLoading(false);
      return;
    }

    // Mark as fetching
    isFetchingRef.current = true;

    // Set loading state appropriately
    if (!postsCache || postsCache.length === 0) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      console.log("[HomeFeed] Fetching posts...", { forceRefresh });
      
      // Fetch posts directly from /posts endpoint (much more efficient!)
      const postsResponse = await forumsApi.posts.listAll({
        limit: 50,
        filter: "newest",
      });

      // Check if component unmounted during fetch
      if (!isMountedRef.current) {
        return;
      }

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

      // Enrich posts with thread titles
      // 1. Identify missing thread titles
      const threadIdsToFetch = Array.from(
        new Set(
          finalPosts
            .map((p) => p.threadId)
            .filter((id) => id && !threadTitleCache.has(id))
        )
      );

      // 2. Fetch missing threads (in parallel, but be handled gracefully)
      if (threadIdsToFetch.length > 0) {
        try {
          await Promise.allSettled(
            threadIdsToFetch.map(async (id) => {
              try {
                const thread = await forumsApi.threads.get(id);
                if (thread && thread.title) {
                  threadTitleCache.set(id, thread.title);
                }
              } catch (e) {
                // Ignore individual thread fetch errors
                console.warn(`Failed to fetch thread info for ${id}`, e);
              }
            })
          );
        } catch (e) {
          console.error("Error fetching thread titles", e);
        }
      }

      // Check again if component unmounted
      if (!isMountedRef.current) {
        return;
      }

      // 3. Map to ExtendedPost
      const enrichedPosts: ExtendedPost[] = finalPosts.map((post) => ({
        ...post,
        _threadTitle: threadTitleCache.get(post.threadId),
        _threadId: post.threadId,
      }));

      // Update cache
      postsCache = enrichedPosts;
      lastFetchTime = now;
      lastCacheVersionRef.current = cacheVersion;

      console.log("[HomeFeed] Fetch complete, got", enrichedPosts.length, "posts");
      setPosts(enrichedPosts);
    } catch (err) {
      // Check if component unmounted
      if (!isMountedRef.current) {
        return;
      }
      
      // Use friendly error message, suppress technical details
      const errorMessage = err instanceof Error ? err.message : "";
      // Only show error if it's not a 401 (session expired) - silently fail for auth issues
      if (errorMessage.includes("session has expired")) {
        setError(null); // Suppress auth errors, just show empty or cached data
      } else {
        console.error("[HomeFeed] Fetch error:", err);
        setError(
          errorMessage || "Unable to load feed. Pull down to try again."
        );
      }
    } finally {
      // Always release lock
      isFetchingRef.current = false;
      
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  // Handle manual refresh (from pull-to-refresh)
  const handleRefresh = useCallback(async () => {
    console.log("[HomeFeed] Manual refresh triggered");
    await fetchPosts(true);
  }, [fetchPosts]);

  // Track mounted state and cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      // Release lock on unmount to prevent stuck state
      isFetchingRef.current = false;
    };
  }, []);

  // Subscribe to cache invalidation events
  useEffect(() => {
    const handleCacheInvalidation = () => {
      console.log("[HomeFeed] Cache invalidation received, refetching...");
      fetchPosts(true);
    };

    cacheInvalidationListeners.add(handleCacheInvalidation);
    
    return () => {
      cacheInvalidationListeners.delete(handleCacheInvalidation);
    };
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
