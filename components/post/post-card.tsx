"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TradeBadge } from "./trade-badge";
import { PriceDisplay } from "./price-display";
import { TradeActions } from "./trade-actions";
import {
  MoreHorizontal,
  Flag,
  MessageSquare,
  Edit,
  Trash,
  Heart,
  Repeat2,
  Share,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import forumsApi from "@/lib/forums-api";
import type { ForumsPost } from "@/lib/types";
import { CommentModal } from "./comment-modal";

interface PostCardProps {
  post: ForumsPost;
  onUpdate?: () => void;
}

export function PostCard({ post, onUpdate }: PostCardProps) {
  const { user: currentUser, isAuthenticated } = useAuth();
  const [showActions, setShowActions] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Normalize author data (API may use either userId/user or authorId/author)
  const postAuthorId = post.authorId || post.userId || "";
  const postAuthor = post.author || post.user;

  // Initialize like state from post data
  const [likeCount, setLikeCount] = useState(post.likes?.length || 0);
  const [isLiked, setIsLiked] = useState(
    post.likes?.some((like) => like.userId === currentUser?.id) || false
  );
  const [isLiking, setIsLiking] = useState(false);

  const trade = post.extendedData?.trade;
  const images = post.extendedData?.images || [];
  const isOwner = currentUser?.id === postAuthorId;

  // Detect intent tag from body
  const detectIntent = (text: string): "WTS" | "WTB" | "WTT" | null => {
    const upper = text.toUpperCase();
    if (upper.includes("#WTS")) return "WTS";
    if (upper.includes("#WTB")) return "WTB";
    if (upper.includes("#WTT")) return "WTT";
    return null;
  };
  const intent = detectIntent(post.body);

  const intentStyles: Record<string, string> = {
    WTS: "bg-green-500 text-white",
    WTB: "bg-yellow-500 text-black",
    WTT: "bg-orange-500 text-white",
  };

  // Remove image placeholders and trade tags from body for display
  const displayBody = post.body
    .replace(/\n\n\[Image \d+\]\s*/g, "")
    .replace(/#(WTS|WTB|WTT)\s*/gi, "")
    .trim();

  // Handle like toggle
  const handleLike = async () => {
    if (!isAuthenticated || isLiking) return;

    setIsLiking(true);
    try {
      if (isLiked) {
        await forumsApi.posts.unlike(post.id, currentUser?.id);
        setIsLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
      } else {
        await forumsApi.posts.like(post.id, currentUser?.id);
        setIsLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <>
      <div
        className="group relative border-b border-border bg-card px-4 py-3 transition-colors hover:bg-muted/30"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className="flex gap-3">
          {/* Author Avatar */}
          <Link href={`/user/${postAuthorId}`} className="shrink-0">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={postAuthor?.avatarUrl || undefined}
                alt={postAuthor?.displayName}
              />
              <AvatarFallback>
                {postAuthor?.displayName?.charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="min-w-0 flex-1">
            {/* Author & Time Row */}
            <div className="flex items-start justify-between">
              <div className="flex flex-wrap items-center gap-1.5">
                <Link
                  href={`/user/${postAuthorId}`}
                  className="font-semibold text-foreground hover:underline"
                >
                  {postAuthor?.displayName || "Anonymous"}
                </Link>
                {intent && (
                  <span
                    className={`px-2 py-0.5 text-xs font-bold rounded-full ${intentStyles[intent]}`}
                  >
                    {intent}
                  </span>
                )}
                <span className="text-muted-foreground">·</span>
                <span className="text-sm text-muted-foreground hover:underline">
                  {formatDistanceToNow(new Date(post.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              {/* More Options */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 rounded-full transition-opacity ${
                      showActions
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Reply
                  </DropdownMenuItem>
                  {isOwner && (
                    <>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                  {!isOwner && (
                    <DropdownMenuItem>
                      <Flag className="mr-2 h-4 w-4" />
                      Report
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Trade Badge */}
            {trade?.isTrade && (
              <div className="mt-1 flex items-center gap-2">
                <TradeBadge intent={trade.intent} status={trade.status} />
                {trade.normalizedPrice !== null && (
                  <PriceDisplay
                    price={trade.normalizedPrice}
                    displayPrice={trade.displayPrice}
                    currency={trade.currency}
                    status={trade.status}
                  />
                )}
              </div>
            )}

            {/* Post Body */}
            <div className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
              {displayBody}
            </div>

            {/* Image Grid - X/Facebook Style */}
            {images.length > 0 && (
              <div
                className={`mt-3 grid gap-0.5 overflow-hidden rounded-2xl border border-border ${
                  images.length === 1
                    ? "grid-cols-1"
                    : images.length === 2
                    ? "grid-cols-2"
                    : images.length === 3
                    ? "grid-cols-2"
                    : "grid-cols-2"
                }`}
              >
                {images.slice(0, 4).map((img, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setLightboxImage(img)}
                    className={`relative overflow-hidden bg-muted ${
                      images.length === 1
                        ? "aspect-video"
                        : images.length === 3 && index === 0
                        ? "row-span-2 aspect-square"
                        : "aspect-square"
                    }`}
                  >
                    {img.startsWith("data:") ? (
                      // Base64 image
                      <img
                        src={img || "/placeholder.svg"}
                        alt={`Image ${index + 1}`}
                        className="h-full w-full object-cover transition-transform hover:scale-105"
                      />
                    ) : (
                      <Image
                        src={img || "/placeholder.svg"}
                        alt={`Image ${index + 1}`}
                        fill
                        className="object-cover transition-transform hover:scale-105"
                      />
                    )}
                    {/* Show +N overlay for more than 4 images */}
                    {index === 3 && images.length > 4 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-2xl font-bold text-white">
                        +{images.length - 4}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Trade Actions */}
            {trade?.isTrade && (
              <TradeActions
                post={post}
                isOwner={isOwner}
                onUpdate={onUpdate}
                className="mt-3"
              />
            )}

            {/* Engagement Actions - X/Facebook Style */}
            <div className="mt-3 flex max-w-md justify-between text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCommentModal(true)}
                className="gap-2 rounded-full px-3 hover:bg-primary/10 hover:text-primary"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm">Comment</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 rounded-full px-3 hover:bg-green-500/10 hover:text-green-500"
              >
                <Repeat2 className="h-4 w-4" />
                <span className="text-sm">0</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                disabled={!isAuthenticated || isLiking}
                className={`gap-2 rounded-full px-3 transition-colors ${
                  isLiked
                    ? "text-red-500 hover:bg-red-500/10"
                    : "hover:bg-red-500/10 hover:text-red-500"
                }`}
              >
                <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                <span className="text-sm">{likeCount}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 rounded-full px-3 hover:bg-primary/10 hover:text-primary"
              >
                <Share className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      <Dialog
        open={!!lightboxImage}
        onOpenChange={() => setLightboxImage(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-[90vw] border-0 bg-transparent p-0 shadow-none">
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute -right-2 -top-2 z-10 rounded-full bg-black/80 p-2 text-white hover:bg-black"
          >
            <X className="h-5 w-5" />
          </button>
          {lightboxImage && (
            <img
              src={lightboxImage || "/placeholder.svg"}
              alt="Full size"
              className="max-h-[85vh] w-auto rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Comment Modal */}
      <CommentModal
        post={post}
        isOpen={showCommentModal}
        onClose={() => setShowCommentModal(false)}
        onUpdate={onUpdate}
      />
    </>
  );
}
