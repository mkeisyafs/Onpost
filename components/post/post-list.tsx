"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import forumsApi from "@/lib/forums-api";
import { PostCard } from "./post-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RefreshCw } from "lucide-react";
import type { ForumsPost } from "@/lib/types";

interface PostListProps {
  threadId: string;
}

// Retry configuration
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

// Fallback configurations to try when primary fails
const FETCH_CONFIGS = [
  { filter: "oldest" as const, limit: 20 },
  { filter: "newest" as const, limit: 20 },
  { filter: "newest" as const, limit: 10 },
  { filter: "oldest" as const, limit: 10 },
];

export function PostList({ threadId }: PostListProps) {
  const [cursor, setCursor] = useState<string | null>(null);
  const [allPosts, setAllPosts] = useState<ForumsPost[]>([]);
  const [configIndex, setConfigIndex] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [hasFailed, setHasFailed] = useState(false);
  const [failedPermanently, setFailedPermanently] = useState(false);

  const currentConfig = FETCH_CONFIGS[configIndex];

  // Custom fetcher with error handling
  const fetchPosts = useCallback(async () => {
    try {
      const result = await forumsApi.posts.list(threadId, {
        filter: currentConfig.filter,
        cursor: cursor || undefined,
        limit: currentConfig.limit,
      });
      // Reset error state on success
      setHasFailed(false);
      setRetryCount(0);
      return result;
    } catch (error) {
      console.error(`[PostList] Fetch failed with config:`, currentConfig, error);
      throw error;
    }
  }, [threadId, cursor, currentConfig]);

  const { data, error, isLoading, mutate, isValidating } = useSWR(
    // Include config in key so SWR refetches when we change it
    failedPermanently ? null : ["posts", threadId, cursor, configIndex],
    fetchPosts,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // Don't refetch for 60 seconds
      shouldRetryOnError: false, // Don't auto-retry on error
      errorRetryCount: 0, // Disable error retry
    }
  );

  // Handle successful data
  useEffect(() => {
    if (data?.posts) {
      if (cursor === null) {
        setAllPosts(data.posts);
      } else {
        setAllPosts((prev) => [...prev, ...data.posts]);
      }
    }
  }, [data, cursor]);

  // Handle errors with fallback logic
  useEffect(() => {
    if (error && !isValidating) {
      setHasFailed(true);

      // Check if we should retry with same config
      if (retryCount < MAX_RETRIES) {
        const timer = setTimeout(() => {
          console.log(`[PostList] Retry ${retryCount + 1}/${MAX_RETRIES} with same config`);
          setRetryCount((prev) => prev + 1);
          mutate();
        }, RETRY_DELAY_MS * (retryCount + 1));
        return () => clearTimeout(timer);
      }

      // Try next fallback config
      if (configIndex < FETCH_CONFIGS.length - 1) {
        console.log(`[PostList] Trying fallback config ${configIndex + 1}`);
        setConfigIndex((prev) => prev + 1);
        setRetryCount(0);
      } else {
        // All configs failed - give up
        console.error(`[PostList] All fallback configs failed for thread ${threadId}`);
        setFailedPermanently(true);
      }
    }
  }, [error, isValidating, retryCount, configIndex, mutate, threadId]);

  // Manual retry handler
  const handleManualRetry = useCallback(() => {
    setConfigIndex(0);
    setRetryCount(0);
    setHasFailed(false);
    setFailedPermanently(false);
    setCursor(null);
    setAllPosts([]);
    // Small delay to ensure state is reset
    setTimeout(() => mutate(), 100);
  }, [mutate]);

  // Permanent failure state
  if (failedPermanently) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <AlertCircle className="h-10 w-10 mx-auto text-destructive/60 mb-3" />
        <p className="text-foreground font-medium mb-1">Unable to load posts</p>
        <p className="text-sm text-muted-foreground mb-4">
          This thread may have data issues. Try again later or view a different thread.
        </p>
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleManualRetry}
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  // Temporary error state (while retrying)
  if (error && hasFailed && !isValidating) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground mb-2">Having trouble loading posts...</p>
        <p className="text-xs text-muted-foreground mb-4">
          Trying alternative methods ({configIndex + 1}/{FETCH_CONFIGS.length})
        </p>
        <div className="flex justify-center">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading && allPosts.length === 0) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Empty state
  if (allPosts.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          No posts yet. Be the first to Post!
        </p>
      </div>
    );
  }

  // Filter out replies/comments (posts with parentId) - they will be shown inside their parent posts
  const mainPosts = allPosts.filter(
    (post) => !post.parentId && !post.parentPostId
  );
  // Get all replies grouped by parent
  const repliesByParent = allPosts.reduce((acc, post) => {
    const parentId = post.parentId || post.parentPostId;
    if (parentId) {
      if (!acc[parentId]) acc[parentId] = [];
      acc[parentId].push(post);
    }
    return acc;
  }, {} as Record<string, ForumsPost[]>);

  return (
    <div className="space-y-4">
      {/* Show notice if using fallback config */}
      {configIndex > 0 && (
        <div className="text-xs text-muted-foreground text-center py-2">
          Showing posts in {currentConfig.filter === "newest" ? "newest first" : "oldest first"} order
        </div>
      )}

      {mainPosts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          replies={repliesByParent[post.id] || []}
          onUpdate={() => mutate()}
        />
      ))}

      {data?.nextPostCursor && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => setCursor(data.nextPostCursor)}
            disabled={isLoading || isValidating}
          >
            {isLoading || isValidating ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
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
  );
}
