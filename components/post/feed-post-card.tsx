"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import forumsApi from "@/lib/forums-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageSquare, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { CommentModal } from "@/components/post/comment-modal";
import { useAuth } from "@/lib/auth-context";
import { useAuthModal } from "@/lib/auth-modal-context";
import { cn } from "@/lib/utils";
import type { ForumsPost } from "@/lib/types";

const intentStyles: Record<string, string> = {
  WTS: "bg-green-500 text-white shadow-lg shadow-green-500/25",
  WTB: "bg-yellow-500 text-black shadow-lg shadow-yellow-500/25",
  WTT: "bg-orange-500 text-white shadow-lg shadow-orange-500/25",
};

const intentBgStyles: Record<string, string> = {
  WTS: "bg-green-500/5 border-green-500/20",
  WTB: "bg-blue-500/5 border-blue-500/20",
  WTT: "bg-orange-500/5 border-orange-500/20",
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
  hideAuthor?: boolean;
}

// Extract price from post body
function extractPrice(body: string): {
  price: number | null;
  displayPrice: string | null;
  currency: string;
} {
  // Match common price patterns
  const patterns = [
    // $500 or $ 500
    /\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+)/i,
    // 500 USD
    /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+)\s*USD/i,
    // Rp 500.000 or Rp500rb
    /Rp\.?\s?(\d{1,3}(?:[.,]\d{3})*|\d+)\s*(rb|ribu|k|jt|juta)?/i,
    // 500rb or 500k (Indonesian)
    /(\d+)\s*(rb|ribu|k|jt|juta)/i,
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      let numStr = match[1].replace(/[,\.]/g, "");
      let num = parseInt(numStr, 10);
      const suffix = match[2]?.toLowerCase();

      // Handle Indonesian suffixes
      if (suffix === "rb" || suffix === "ribu" || suffix === "k") {
        num *= 1000;
      } else if (suffix === "jt" || suffix === "juta") {
        num *= 1000000;
      }

      // Determine currency
      const isUSD = /\$|USD/i.test(match[0]);
      const currency = isUSD ? "USD" : "IDR";

      // Convert IDR to USD for display
      const displayNum = currency === "IDR" ? Math.round(num / 15800) : num;

      return {
        price: displayNum,
        displayPrice: `$${displayNum.toLocaleString()}`,
        currency: "USD",
      };
    }
  }

  return { price: null, displayPrice: null, currency: "USD" };
}

export function FeedPostCard({
  post,
  onUpdate,
  hideAuthor = false,
}: FeedPostCardProps) {
  const { user: currentUser, isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();
  const router = useRouter();
  const author = post.author || post.user;
  const authorId = post.authorId || post.userId || "";
  const tags = post.extendedData?.tags || [];
  const images = post.extendedData?.images || [];
  const threadTitle = post._threadTitle;
  const threadId = post._threadId || post.threadId;

  // Comment count
  const [commentCount, setCommentCount] = useState(post._commentCount || 0);

  useEffect(() => {
    const fetchCommentCount = async () => {
      try {
        const response = await forumsApi.posts.list(post.threadId, {
          filter: "oldest",
          limit: 100,
        });
        const count = response.posts.filter(
          (p) => p.parentId === post.id || p.parentPostId === post.id
        ).length;
        setCommentCount(count);
      } catch (err) {
        // Silently fail
      }
    };

    if (!post._commentCount) {
      fetchCommentCount();
    }
  }, [post.id, post.threadId, post._commentCount]);

  // Like state - prefer post.likes, fallback to extendedData.likedBy
  const likedByUsers = post.extendedData?.likedBy || [];
  const initialLikeCount = post.likes?.length || likedByUsers.length || 0;
  const initialIsLiked =
    post.likes?.some((like) => like.userId === currentUser?.id) ||
    likedByUsers.includes(currentUser?.id || "") ||
    false;

  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [isLiking, setIsLiking] = useState(false);

  // Load likes from localStorage on mount (fallback until API is fixed)
  useEffect(() => {
    if (!currentUser) return;

    const storageKey = `post_likes_${post.id}`;
    const storedLikes = localStorage.getItem(storageKey);

    if (storedLikes) {
      try {
        const likedUsers: string[] = JSON.parse(storedLikes);
        setLikeCount(likedUsers.length);
        setIsLiked(likedUsers.includes(currentUser.id));
      } catch {
        // Invalid stored data, ignore
      }
    }
  }, [post.id, currentUser]);

  // Comment modal state
  const [showCommentModal, setShowCommentModal] = useState(false);

  const handleCommentUpdate = () => {
    setCommentCount((prev) => prev + 1);
    onUpdate?.();
  };

  const handleLike = async () => {
    if (!isAuthenticated || isLiking || !currentUser) return;

    setIsLiking(true);
    const wasLiked = isLiked;
    const storageKey = `post_likes_${post.id}`;

    // Optimistic update
    setIsLiked(!wasLiked);
    setLikeCount((prev) => (wasLiked ? prev - 1 : prev + 1));

    try {
      // Call API like/unlike
      if (wasLiked) {
        await forumsApi.posts.unlike(post.id);
      } else {
        await forumsApi.posts.like(post.id);
      }

      // Update localStorage for persistence
      const storedLikes = localStorage.getItem(storageKey);
      let likedUsers: string[] = storedLikes ? JSON.parse(storedLikes) : [];

      if (wasLiked) {
        likedUsers = likedUsers.filter((id) => id !== currentUser.id);
      } else {
        if (!likedUsers.includes(currentUser.id)) {
          likedUsers.push(currentUser.id);
        }
      }

      localStorage.setItem(storageKey, JSON.stringify(likedUsers));
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
    if (upper.includes("#WTS") || upper.includes("WTS")) return "WTS";
    if (upper.includes("#WTB") || upper.includes("WTB")) return "WTB";
    if (upper.includes("#WTT") || upper.includes("WTT")) return "WTT";
    return null;
  };
  const intent = detectIntent(post.body);

  // Extract price from body
  const priceInfo = extractPrice(post.body);

  // Clean body - keep hashtags visible
  const displayBody = post.body.replace(/\n\n\[Image \d+\]\s*/g, "").trim();

  // Handle contact seller - navigate to chat and select user
  const handleContactSeller = () => {
    if (!isAuthenticated) {
      openAuthModal("signin");
      return;
    }
    // Store the user to message in sessionStorage for the messages page to pick up
    sessionStorage.setItem(
      "contact_user",
      JSON.stringify({
        id: authorId,
        displayName: author?.displayName || "User",
        avatarUrl: author?.avatarUrl,
      })
    );
    // Navigate to messages page
    router.push("/messages");
  };

  return (
    <Card
      className={cn(
        "border-border/50 hover:border-border transition-all duration-300 hover:shadow-lg",
        intentBgStyles[intent || ""] || ""
      )}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          {!hideAuthor && (
            <Link href={`/user/${authorId}`}>
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarImage src={author?.avatarUrl || undefined} />
                <AvatarFallback className="bg-linear-to-br from-primary to-accent text-primary-foreground font-bold">
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

              {author && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 border border-yellow-500/20">
                  New
                </span>
              )}

              {intent && (
                <span
                  className={cn(
                    "px-2.5 py-0.5 text-xs font-bold rounded-full",
                    intentStyles[intent]
                  )}
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

            {/* Thread reference - more visible */}
            {threadTitle && threadId && (
              <Link
                href={`/thread/${threadId}`}
                className="text-sm text-primary/80 hover:text-primary hover:underline mt-0.5 block"
              >
                In {threadTitle}
              </Link>
            )}
          </div>
        </div>

        {/* Price Display */}
        {intent && priceInfo.displayPrice && (
          <div className="mt-3 flex items-center gap-2">
            <span
              className={cn(
                "px-2 py-0.5 text-xs font-bold rounded",
                intentStyles[intent]
              )}
            >
              {intent}
            </span>
            <span className="text-2xl font-bold text-primary">
              {priceInfo.displayPrice}
            </span>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
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
            <div className="relative w-full overflow-hidden rounded-xl border border-border bg-muted/50">
              <img
                src={images[0]}
                alt=""
                className="w-full max-h-[500px] object-contain"
              />
            </div>

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

        {/* Contact Seller Button - only for trade posts */}
        {intent && authorId !== currentUser?.id && (
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleContactSeller}
              className="gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Contact Seller
            </Button>
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
                  : "text-foreground/70 hover:bg-secondary hover:text-foreground"
              )}
            >
              <Heart className={cn("h-5 w-5", isLiked ? "fill-current" : "")} />
              <span>Like</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCommentModal(true)}
              className="flex-1 gap-2 rounded-none py-3 h-auto font-normal text-foreground/70 hover:bg-secondary hover:text-foreground"
            >
              <MessageSquare className="h-5 w-5" />
              <span>Comment</span>
            </Button>
          </div>
        </div>

        {/* Comment Modal */}
        <CommentModal
          post={post}
          isOpen={showCommentModal}
          onClose={() => setShowCommentModal(false)}
          onUpdate={handleCommentUpdate}
          onCommentsLoaded={(count) => setCommentCount(count)}
          onLikeUpdate={(liked, count) => {
            setIsLiked(liked);
            setLikeCount(count);
          }}
        />
      </CardContent>
    </Card>
  );
}
