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
  Share,
  Send,
  ImageIcon,
  Smile,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import forumsApi from "@/lib/forums-api";
import type { ForumsPost, ForumsUser } from "@/lib/types";
import Link from "next/link";

interface CommentModalProps {
  post: ForumsPost;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
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
}: CommentModalProps) {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [replies, setReplies] = useState<Record<string, Comment[]>>({});
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [commentImage, setCommentImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyImage, setReplyImage] = useState<string | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const replyImageInputRef = useRef<HTMLInputElement>(null);

  const postAuthor = post.author || post.user;
  const postAuthorId = post.authorId || post.userId || "";

  // Fetch comments (child posts)
  useEffect(() => {
    if (isOpen) {
      fetchComments();
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
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    } finally {
      setLoading(false);
    }
  };

  // Image compression
  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxSize = 800;
          let { width, height } = img;

          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    isReply = false
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      if (isReply) {
        setReplyImage(compressed);
      } else {
        setCommentImage(compressed);
      }
    } catch (err) {
      console.error("Failed to process image:", err);
    }
  };

  const handleSubmitComment = async () => {
    if ((!newComment.trim() && !commentImage) || !isAuthenticated || submitting)
      return;

    setSubmitting(true);
    try {
      await forumsApi.posts.create({
        threadId: post.threadId,
        body: newComment.trim(),
        userId: user?.id,
        parentId: post.id,
        extendedData: commentImage ? { images: [commentImage] } : undefined,
      });
      setNewComment("");
      setCommentImage(null);
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
      (!replyText.trim() && !replyImage) ||
      !isAuthenticated ||
      submittingReply
    )
      return;

    setSubmittingReply(true);
    try {
      await forumsApi.posts.create({
        threadId: post.threadId,
        body: replyText.trim(),
        userId: user?.id,
        parentId: parentCommentId,
        extendedData: replyImage ? { images: [replyImage] } : undefined,
      });
      setReplyText("");
      setReplyImage(null);
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
            <button className="hover:underline font-medium">Like</button>
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
                  <Heart className="h-4 w-4" />
                  {post.likes?.length || 0} likes
                </span>
                <span>{comments.length} comments</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-around mt-3 pt-3 border-t border-border">
              <Button variant="ghost" className="flex-1 gap-2">
                <Heart className="h-5 w-5" />
                Like
              </Button>
              <Button
                variant="ghost"
                className="flex-1 gap-2"
                onClick={() => inputRef.current?.focus()}
              >
                <MessageSquare className="h-5 w-5" />
                Comment
              </Button>
              <Button variant="ghost" className="flex-1 gap-2">
                <Share className="h-5 w-5" />
                Share
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
              <Link href="/login" className="text-primary hover:underline">
                Sign in to comment
              </Link>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
