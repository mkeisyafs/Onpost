"use client";

import { useState } from "react";
import forumsApi from "@/lib/forums-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageSquare, Share } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { CommentModal } from "@/components/post/comment-modal";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import type { ForumsPost } from "@/lib/types";

const intentStyles: Record<string, string> = {
  WTS: "bg-green-500 text-white",
  WTB: "bg-yellow-500 text-black",
  WTT: "bg-orange-500 text-white",
};

export interface ExtendedPost extends ForumsPost {
  _threadTitle?: string;
  _threadId?: string;
  _threadViewCount?: number;
  _threadPostCount?: number;
  _commentCount?: number;
}

interface FeedPostCardProps {
  post: ExtendedPost;
  onUpdate?: () => void;
  hideAuthor?: boolean; // Option to hide author info (for profile page)
}

export function FeedPostCard({
  post,
  onUpdate,
  hideAuthor = false,
}: FeedPostCardProps) {
  const { user: currentUser, isAuthenticated } = useAuth();
  const author = post.author || post.user;
  const authorId = post.authorId || post.userId || "";
  const tags = post.extendedData?.tags || [];
  const images = post.extendedData?.images || [];
  const threadTitle = post._threadTitle;
  const threadId = post._threadId;
  const commentCount = post._commentCount || 0;

  // Like state
  const [likeCount, setLikeCount] = useState(post.likes?.length || 0);
  const [isLiked, setIsLiked] = useState(
    post.likes?.some((like) => like.userId === currentUser?.id) || false
  );
  const [isLiking, setIsLiking] = useState(false);

  // Comment modal state
  const [showCommentModal, setShowCommentModal] = useState(false);

  // Handle Like
  const handleLike = async () => {
    if (!isAuthenticated || isLiking) return;

    setIsLiking(true);
    const wasLiked = isLiked;

    // Optimistic update
    setIsLiked(!wasLiked);
    setLikeCount((prev) => (wasLiked ? prev - 1 : prev + 1));

    try {
      if (wasLiked) {
        await forumsApi.posts.unlike(post.id);
      } else {
        await forumsApi.posts.like(post.id);
      }
    } catch (error) {
      // Revert on error
      setIsLiked(wasLiked);
      setLikeCount((prev) => (wasLiked ? prev + 1 : prev - 1));
      console.error("Failed to update like:", error);
    } finally {
      setIsLiking(false);
    }
  };

  // Detect intent from body
  const detectIntent = (text: string): "WTS" | "WTB" | "WTT" | null => {
    const upper = text.toUpperCase();
    if (upper.includes("#WTS")) return "WTS";
    if (upper.includes("#WTB")) return "WTB";
    if (upper.includes("#WTT")) return "WTT";
    return null;
  };
  const intent = detectIntent(post.body);

  // Clean body - keep hashtags visible
  const displayBody = post.body.replace(/\n\n\[Image \d+\]\s*/g, "").trim();

  return (
    <Card className="border-border/50 hover:border-border transition-colors">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          {!hideAuthor && (
            <Link href={`/user/${authorId}`}>
              <Avatar className="h-10 w-10">
                <AvatarImage src={author?.avatarUrl || undefined} />
                <AvatarFallback>
                  {author?.displayName?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
            </Link>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {!hideAuthor && (
                <Link
                  href={`/user/${authorId}`}
                  className="font-semibold hover:underline"
                >
                  {author?.displayName || "Anonymous"}
                </Link>
              )}
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
        <div
          className={cn(
            "mt-3 text-foreground whitespace-pre-wrap",
            hideAuthor && "mt-0"
          )}
        >
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

        {/* Actions - Facebook Style */}
        <div className="mt-4 border-t border-border/50 pt-1">
          {/* Stats row */}
          <div className="flex items-center justify-between px-2 py-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              {likeCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500">
                    <Heart className="h-3 w-3 fill-white text-white" />
                  </span>
                  {likeCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                {commentCount}
              </span>
            </div>
          </div>

          {/* Action buttons row */}
          <div className="flex border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={!isAuthenticated || isLiking}
              className={cn(
                "flex-1 gap-2 rounded-none py-3 h-auto font-normal",
                isLiked
                  ? "text-primary hover:bg-primary/10"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Heart className={cn("h-5 w-5", isLiked ? "fill-current" : "")} />
              <span>Like</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCommentModal(true)}
              className="flex-1 gap-2 rounded-none py-3 h-auto font-normal text-muted-foreground hover:bg-muted"
            >
              <MessageSquare className="h-5 w-5" />
              <span>Comment</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 gap-2 rounded-none py-3 h-auto font-normal text-muted-foreground hover:bg-muted"
            >
              <Share className="h-5 w-5" />
              <span>Share</span>
            </Button>
          </div>
        </div>

        {/* Comment Modal */}
        <CommentModal
          post={post}
          isOpen={showCommentModal}
          onClose={() => setShowCommentModal(false)}
          onUpdate={onUpdate}
        />
      </CardContent>
    </Card>
  );
}
