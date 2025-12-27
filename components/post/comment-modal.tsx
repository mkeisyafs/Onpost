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
  MoreHorizontal,
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
}

export function CommentModal({
  post,
  isOpen,
  onClose,
  onUpdate,
}: CommentModalProps) {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
      // Get posts that are replies to this post (using parentId)
      const response = await forumsApi.posts.list(post.threadId, {
        filter: "oldest",
        limit: 50,
      });
      // Filter comments that have this post as parent
      const childComments = response.posts.filter(
        (p) => p.parentId === post.id || p.parentPostId === post.id
      );
      setComments(childComments as Comment[]);
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !isAuthenticated || submitting) return;

    setSubmitting(true);
    try {
      await forumsApi.posts.create({
        threadId: post.threadId,
        body: newComment.trim(),
        userId: user?.id,
        parentId: post.id,
      });
      setNewComment("");
      await fetchComments();
      onUpdate?.();
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden">
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
                  {post.body}
                </p>

                {/* Post Images */}
                {post.extendedData?.images &&
                  post.extendedData.images.length > 0 && (
                    <div className="mt-3 rounded-xl overflow-hidden">
                      {post.extendedData.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt=""
                          className="w-full object-cover"
                        />
                      ))}
                    </div>
                  )}
              </div>
            </div>

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
              comments.map((comment) => {
                const commentAuthor = comment.author || comment.user;
                const commentAuthorId =
                  comment.authorId || comment.userId || "";

                return (
                  <div key={comment.id} className="flex gap-3">
                    <Link href={`/user/${commentAuthorId}`}>
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={commentAuthor?.avatarUrl || undefined}
                        />
                        <AvatarFallback className="text-xs">
                          {commentAuthor?.displayName?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1">
                      <div className="bg-muted rounded-2xl px-4 py-2">
                        <Link
                          href={`/user/${commentAuthorId}`}
                          className="font-semibold text-sm hover:underline"
                        >
                          {commentAuthor?.displayName || "Anonymous"}
                        </Link>
                        <p className="text-sm mt-0.5">{comment.body}</p>
                      </div>
                      <div className="flex items-center gap-4 mt-1 ml-2 text-xs text-muted-foreground">
                        <span>
                          {formatDistanceToNow(new Date(comment.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                        <button className="hover:underline font-medium">
                          Like
                        </button>
                        <button className="hover:underline font-medium">
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Comment Input */}
        <div className="p-4 border-t border-border bg-card sticky bottom-0">
          {isAuthenticated ? (
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
                  className="min-h-[40px] max-h-[120px] resize-none rounded-2xl pr-24 bg-muted border-0"
                  rows={1}
                />
                <div className="absolute right-2 bottom-2 flex items-center gap-1">
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
                  >
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button
                    size="icon"
                    className="h-7 w-7 rounded-full"
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || submitting}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
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
