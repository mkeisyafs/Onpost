"use client";

import { useState, useRef, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Heart,
  MessageSquare,
  Send,
  ImageIcon,
  Smile,
  X,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAuthModal } from "@/lib/auth-modal-context";
import forumsApi from "@/lib/forums-api";
import { uploadImage, compressImage } from "@/lib/file-api";
import type { ForumsPost, ForumsUser } from "@/lib/types";
import Link from "next/link";

interface CommentModalProps {
  post: ForumsPost;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  onCommentsLoaded?: (count: number) => void;
  onLikeUpdate?: (isLiked: boolean, likeCount: number) => void;
}

interface Comment {
  id: string;
  body: string;
  userId?: string;
  authorId?: string;
  user?: ForumsUser;
  author?: ForumsUser;
  createdAt: string;
  likes?: Array<{ userId: string }>;
  parentId?: string;
  parentPostId?: string;
  extendedData?: {
    images?: string[];
  };
}

export function CommentModal({
  post,
  isOpen,
  onClose,
  onUpdate,
  onCommentsLoaded,
  onLikeUpdate,
}: CommentModalProps) {
  const { user, isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [comments, setComments] = useState<Comment[]>([]);
  const [replies, setReplies] = useState<Record<string, Comment[]>>({});
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [commentImage, setCommentImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingComment, setUploadingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyImage, setReplyImage] = useState<string | null>(null);
  const [replyImageFile, setReplyImageFile] = useState<File | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [uploadingReply, setUploadingReply] = useState(false);
  const [commentImageFile, setCommentImageFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const replyImageInputRef = useRef<HTMLInputElement>(null);

  // Like state for the post
  const [likeCount, setLikeCount] = useState(post.likes?.length || 0);
  const [isLiked, setIsLiked] = useState(
    post.likes?.some((like) => like.userId === user?.id) || false
  );
  const [isLiking, setIsLiking] = useState(false);

  const postAuthor = post.author || post.user;
  const postAuthorId = post.authorId || post.userId || "";

  // Handle Like for the post
  const handleLikePost = async () => {
    if (!isAuthenticated || isLiking) {
      if (!isAuthenticated) {
        openAuthModal("signin");
      }
      return;
    }

    setIsLiking(true);
    const wasLiked = isLiked;

    // Optimistic update
    const newIsLiked = !wasLiked;
    const newLikeCount = wasLiked ? likeCount - 1 : likeCount + 1;
    setIsLiked(newIsLiked);
    setLikeCount(newLikeCount);

    try {
      if (wasLiked) {
        await forumsApi.posts.unlike(post.id);
      } else {
        await forumsApi.posts.like(post.id);
      }
      // Call like update callback to sync with parent
      onLikeUpdate?.(newIsLiked, newLikeCount);
    } catch (error) {
      // Revert on error
      setIsLiked(wasLiked);
      setLikeCount(likeCount);
      console.error("Failed to update like:", error);
    } finally {
      setIsLiking(false);
    }
  };

  // Fetch comments (child posts)
  useEffect(() => {
    if (isOpen) {
      fetchComments();
      // Reset like state when modal opens with fresh post data
      setLikeCount(post.likes?.length || 0);
      setIsLiked(post.likes?.some((like) => like.userId === user?.id) || false);
    }
  }, [isOpen, post.id]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const response = await forumsApi.posts.list(post.threadId, {
        filter: "oldest",
        limit: 100,
      });

      // Filter comments that have this post as parent (top-level comments)
      const topLevelComments = response.posts.filter(
        (p) => p.parentId === post.id || p.parentPostId === post.id
      );

      // Group replies by parent comment
      const repliesMap: Record<string, Comment[]> = {};
      topLevelComments.forEach((comment) => {
        const commentReplies = response.posts.filter(
          (p) => p.parentId === comment.id || p.parentPostId === comment.id
        );
        if (commentReplies.length > 0) {
          repliesMap[comment.id] = commentReplies as Comment[];
        }
      });

      setComments(topLevelComments as Comment[]);
      setReplies(repliesMap);

      // Notify parent of actual comment count
      onCommentsLoaded?.(topLevelComments.length);
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    } finally {
      setLoading(false);
    }
  };

  // Image selection - now stores file for upload
  const handleImageSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    isReply = false
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    if (isReply) {
      setReplyImage(previewUrl);
      setReplyImageFile(file);
    } else {
      setCommentImage(previewUrl);
      setCommentImageFile(file);
    }
  };

  const handleSubmitComment = async () => {
    if (
      (!newComment.trim() && !commentImageFile) ||
      !isAuthenticated ||
      submitting
    )
      return;

    setSubmitting(true);
    try {
      // Upload image to file server if present
      let uploadedImageUrl: string | undefined;
      if (commentImageFile) {
        setUploadingComment(true);
        try {
          const compressed = await compressImage(commentImageFile, 800, 0.8);
          const result = await uploadImage(compressed);
          uploadedImageUrl = result.url;
        } catch (uploadErr) {
          console.error("Failed to upload image:", uploadErr);
        }
        setUploadingComment(false);
      }

      await forumsApi.posts.create({
        threadId: post.threadId,
        body: newComment.trim(),
        userId: user?.id,
        parentId: post.id,
        extendedData: uploadedImageUrl
          ? { images: [uploadedImageUrl] }
          : undefined,
      });
      setNewComment("");
      setCommentImage(null);
      setCommentImageFile(null);
      await fetchComments();
      onUpdate?.();
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentCommentId: string) => {
    if (
      (!replyText.trim() && !replyImageFile) ||
      !isAuthenticated ||
      submittingReply
    )
      return;

    setSubmittingReply(true);
    try {
      // Upload image to file server if present
      let uploadedImageUrl: string | undefined;
      if (replyImageFile) {
        setUploadingReply(true);
        try {
          const compressed = await compressImage(replyImageFile, 800, 0.8);
          const result = await uploadImage(compressed);
          uploadedImageUrl = result.url;
        } catch (uploadErr) {
          console.error("Failed to upload image:", uploadErr);
        }
        setUploadingReply(false);
      }

      await forumsApi.posts.create({
        threadId: post.threadId,
        body: replyText.trim(),
        userId: user?.id,
        parentId: parentCommentId,
        extendedData: uploadedImageUrl
          ? { images: [uploadedImageUrl] }
          : undefined,
      });
      setReplyText("");
      setReplyImage(null);
      setReplyImageFile(null);
      setReplyingTo(null);
      await fetchComments();
      onUpdate?.();
    } catch (err) {
      console.error("Failed to post reply:", err);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  const handleReplyKeyDown = (e: React.KeyboardEvent, commentId: string) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitReply(commentId);
    }
  };

  // Render a single comment with optional replies
  const renderComment = (comment: Comment, isReply = false) => {
    const commentAuthor = comment.author || comment.user;
    const commentAuthorId = comment.authorId || comment.userId || "";
    const commentReplies = replies[comment.id] || [];
    const hasImage =
      comment.extendedData?.images && comment.extendedData.images.length > 0;

    return (
      <div key={comment.id} className={`flex gap-3 ${isReply ? "ml-10" : ""}`}>
        <Link href={`/user/${commentAuthorId}`}>
          <Avatar className={isReply ? "h-7 w-7" : "h-8 w-8"}>
            <AvatarImage src={commentAuthor?.avatarUrl || undefined} />
            <AvatarFallback className="text-xs">
              {commentAuthor?.displayName?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1">
          <div className="bg-muted rounded-2xl px-4 py-2 inline-block max-w-full">
            <Link
              href={`/user/${commentAuthorId}`}
              className="font-semibold text-sm hover:underline"
            >
              {commentAuthor?.displayName || "Anonymous"}
            </Link>
            {comment.body && (
              <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">
                {comment.body}
              </p>
            )}
            {hasImage && (
              <div className="mt-2">
                {comment.extendedData?.images?.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt=""
                    className="max-w-xs rounded-lg object-cover"
                    style={{ maxHeight: "200px" }}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 ml-2 text-xs text-muted-foreground">
            <span>
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
              })}
            </span>
            {!isReply && (
              <button
                className="hover:underline font-medium"
                onClick={() => {
                  setReplyingTo(replyingTo === comment.id ? null : comment.id);
                  setReplyText("");
                  setReplyImage(null);
                }}
              >
                Reply
              </button>
            )}
          </div>

          {/* Reply Input */}
          {replyingTo === comment.id && !isReply && isAuthenticated && (
            <div className="mt-3 flex gap-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.avatarUrl || undefined} />
                <AvatarFallback className="text-xs">
                  {user?.displayName?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="relative">
                  <Textarea
                    placeholder={`Reply to ${
                      commentAuthor?.displayName || "Anonymous"
                    }...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => handleReplyKeyDown(e, comment.id)}
                    className="min-h-[36px] max-h-[100px] resize-none rounded-2xl pr-20 bg-muted border-0 text-sm py-2"
                    rows={1}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <input
                      ref={replyImageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageSelect(e, true)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full"
                      onClick={() => replyImageInputRef.current?.click()}
                    >
                      <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      size="icon"
                      className="h-6 w-6 rounded-full"
                      onClick={() => handleSubmitReply(comment.id)}
                      disabled={
                        (!replyText.trim() && !replyImage) || submittingReply
                      }
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {replyImage && (
                  <div className="mt-2 relative inline-block">
                    <img
                      src={replyImage}
                      alt="Preview"
                      className="max-h-20 rounded-lg"
                    />
                    <button
                      onClick={() => setReplyImage(null)}
                      className="absolute -top-1 -right-1 h-5 w-5 bg-destructive rounded-full flex items-center justify-center"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Nested Replies */}
          {commentReplies.length > 0 && (
            <div className="mt-3 space-y-3">
              {commentReplies.map((reply) => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 border-b border-border sticky top-0 bg-card z-10">
          <DialogTitle className="text-center">
            {postAuthor?.displayName || "Anonymous"}&apos;s Post
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-180px)]">
          {/* Original Post */}
          <div className="p-4 border-b border-border">
            {/* Post Author */}
            <div className="flex items-start gap-3">
              <Link href={`/user/${postAuthorId}`}>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={postAuthor?.avatarUrl || undefined} />
                  <AvatarFallback>
                    {postAuthor?.displayName?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/user/${postAuthorId}`}
                    className="font-semibold hover:underline"
                  >
                    {postAuthor?.displayName || "Anonymous"}
                  </Link>
                  <span className="text-sm text-muted-foreground">
                    ·{" "}
                    {formatDistanceToNow(new Date(post.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="mt-2 text-foreground whitespace-pre-wrap">
                  {post.body
                    .replace(/\n\n\[Image \d+\]\s*/g, "")
                    .replace(/\[Image \d+\]/g, "")
                    .trim()}
                </p>
              </div>
            </div>

            {/* Post Images */}
            {post.extendedData?.images &&
              post.extendedData.images.length > 0 && (
                <div className="mt-4 flex justify-center">
                  <div className="flex flex-col items-center gap-3 w-full">
                    {post.extendedData.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt=""
                        className="max-w-full rounded-xl object-contain mx-auto"
                        style={{ maxHeight: "500px" }}
                      />
                    ))}
                  </div>
                </div>
              )}

            {/* Post Stats */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  {likeCount > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500">
                      <Heart className="h-3 w-3 fill-white text-white" />
                    </span>
                  )}
                  {likeCount > 0 ? likeCount : <Heart className="h-4 w-4" />}{" "}
                  {likeCount === 0 && "0"} likes
                </span>
                <span>{comments.length} comments</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-around mt-3 pt-3 border-t border-border">
              <Button
                variant="ghost"
                className={`flex-1 gap-2 ${isLiked ? "text-red-500" : ""}`}
                onClick={handleLikePost}
                disabled={isLiking}
              >
                <Heart className={`h-5 w-5 ${isLiked ? "fill-current" : ""}`} />
                {isLiked ? "Liked" : "Like"}
              </Button>
              <Button
                variant="ghost"
                className="flex-1 gap-2"
                onClick={() => inputRef.current?.focus()}
              >
                <MessageSquare className="h-5 w-5" />
                Comment
              </Button>
            </div>
          </div>

          {/* Comments Section */}
          <div className="p-4 space-y-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading comments...
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No comments yet. Be the first to comment!
              </div>
            ) : (
              comments.map((comment) => renderComment(comment))
            )}
          </div>
        </ScrollArea>

        {/* Comment Input */}
        <div className="p-4 border-t border-border bg-card sticky bottom-0">
          {isAuthenticated ? (
            <div className="space-y-3">
              {/* Image Preview */}
              {commentImage && (
                <div className="relative inline-block">
                  <img
                    src={commentImage}
                    alt="Preview"
                    className="max-h-24 rounded-lg"
                  />
                  <button
                    onClick={() => setCommentImage(null)}
                    className="absolute -top-2 -right-2 h-6 w-6 bg-destructive rounded-full flex items-center justify-center shadow-md"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {user?.displayName?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 relative">
                  <Textarea
                    ref={inputRef}
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="min-h-[40px] max-h-[120px] resize-none rounded-2xl pr-28 bg-muted border-0"
                    rows={1}
                  />
                  <div className="absolute right-2 bottom-2 flex items-center gap-1">
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageSelect(e, false)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full"
                    >
                      <Smile className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      size="icon"
                      className="h-7 w-7 rounded-full"
                      onClick={handleSubmitComment}
                      disabled={
                        (!newComment.trim() && !commentImage) || submitting
                      }
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-2">
              <button
                onClick={() => openAuthModal("signin")}
                className="text-primary hover:underline"
              >
                Sign in to comment
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
