"use client";

import { useState, useEffect } from "react";
import forumsApi from "@/lib/forums-api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FeedPostCard,
  type ExtendedPost,
} from "@/components/post/feed-post-card";
import type { ForumsPost } from "@/lib/types";

interface HomeFeedProps {
  refreshKey?: number;
}

export function HomeFeed({ refreshKey }: HomeFeedProps) {
  const [posts, setPosts] = useState<ForumsPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch posts from all threads and combine them
  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch recent threads
        const threadsResponse = await forumsApi.threads.list({
          limit: 10,
          filter: "newest",
        });

        if (!threadsResponse.threads || threadsResponse.threads.length === 0) {
          setPosts([]);
          return;
        }

        // Fetch posts from each thread and combine
        const allPosts: ForumsPost[] = [];

        for (const thread of threadsResponse.threads.slice(0, 5)) {
          try {
            const postsResponse = await forumsApi.posts.list(thread.id, {
              limit: 10,
              filter: "newest",
            });
            if (postsResponse.posts) {
              // Get all posts for counting replies
              const allThreadPosts = postsResponse.posts;

              // Filter out replies (posts with parentId) and add thread info to each post for display
              const postsWithThread = allThreadPosts
                .filter((post) => !post.parentId && !post.parentPostId)
                .map((post) => {
                  // Count replies to this post
                  const commentCount = allThreadPosts.filter(
                    (p) => p.parentId === post.id || p.parentPostId === post.id
                  ).length;

                  return {
                    ...post,
                    _threadTitle: thread.title,
                    _threadId: thread.id,
                    _threadViewCount: thread.viewCount || 0,
                    _threadPostCount: thread.postCount || 0,
                    _commentCount: commentCount,
                  };
                });
              allPosts.push(...postsWithThread);
            }
          } catch {
            // Skip threads that fail to load posts
          }
        }

        // Sort by createdAt descending
        allPosts.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setPosts(allPosts.slice(0, 20));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load feed");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, [refreshKey]);

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
    <div className="space-y-4">
      {posts.map((post) => (
        <FeedPostCard key={post.id} post={post} />
      ))}
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
