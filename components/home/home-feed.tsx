"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import forumsApi from "@/lib/forums-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, MessageSquare, Share, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import type { ForumsPost, ForumsThread } from "@/lib/types";

const intentStyles: Record<string, string> = {
  WTS: "bg-green-500 text-white",
  WTB: "bg-yellow-500 text-black",
  WTT: "bg-orange-500 text-white",
};

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
              // Filter out replies (posts with parentId) and add thread info to each post for display
              const postsWithThread = postsResponse.posts
                .filter((post) => !post.parentId && !post.parentPostId)
                .map((post) => ({
                  ...post,
                  _threadTitle: thread.title,
                  _threadId: thread.id,
                  _threadViewCount: thread.viewCount || 0,
                  _threadPostCount: thread.postCount || 0,
                }));
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

interface ExtendedPost extends ForumsPost {
  _threadTitle?: string;
  _threadId?: string;
  _threadViewCount?: number;
  _threadPostCount?: number;
}

function FeedPostCard({ post }: { post: ExtendedPost }) {
  const author = post.author || post.user;
  const authorId = post.authorId || post.userId || "";
  const tags = post.extendedData?.tags || [];
  const images = post.extendedData?.images || [];
  const threadTitle = post._threadTitle;
  const threadId = post._threadId;
  const viewCount = post._threadViewCount || 0;

  // Detect intent from body
  const detectIntent = (text: string): "WTS" | "WTB" | "WTT" | null => {
    const upper = text.toUpperCase();
    if (upper.includes("#WTS")) return "WTS";
    if (upper.includes("#WTB")) return "WTB";
    if (upper.includes("#WTT")) return "WTT";
    return null;
  };
  const intent = detectIntent(post.body);

  // Clean body
  const displayBody = post.body
    .replace(/\n\n\[Image \d+\]\s*/g, "")
    .replace(/#(WTS|WTB|WTT)\s*/gi, "")
    .replace(/Price:\s*\S+/gi, "")
    .trim();

  return (
    <Card className="border-border/50 hover:border-border transition-colors">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Link href={`/user/${authorId}`}>
            <Avatar className="h-10 w-10">
              <AvatarImage src={author?.avatarUrl || undefined} />
              <AvatarFallback>
                {author?.displayName?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/user/${authorId}`}
                className="font-semibold hover:underline"
              >
                {author?.displayName || "Anonymous"}
              </Link>
              {intent && (
                <span
                  className={`px-2 py-0.5 text-xs font-bold rounded-full ${intentStyles[intent]}`}
                >
                  {intent}
                </span>
              )}
              <span className="text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(post.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>

            {/* Thread reference */}
            {threadTitle && threadId && (
              <Link
                href={`/thread/${threadId}`}
                className="text-xs text-muted-foreground hover:text-primary"
              >
                in {threadTitle}
              </Link>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs px-2 py-0"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="mt-3 text-foreground whitespace-pre-wrap">
          {displayBody}
        </div>

        {/* Images - Facebook Style */}
        {images.length > 0 && (
          <div className="mt-3 space-y-1">
            {/* Main Image - Full width, maintains aspect ratio */}
            <div className="relative w-full overflow-hidden rounded-xl border border-border bg-muted/50">
              <img
                src={images[0]}
                alt=""
                className="w-full max-h-[500px] object-contain"
              />
            </div>

            {/* Additional Images - Small thumbnails grid */}
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-1">
                {images.slice(1, 5).map((img, idx) => (
                  <div
                    key={idx + 1}
                    className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted/50"
                  >
                    <img
                      src={img}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    {/* Overlay for remaining images count */}
                    {idx === 3 && images.length > 5 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-lg font-bold text-white">
                        +{images.length - 5}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-red-500"
            >
              <Heart className="h-4 w-4" />
              <span className="text-sm">{post.likes?.length || 0}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-primary"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm">Reply</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
            >
              <Share className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {viewCount}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
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
