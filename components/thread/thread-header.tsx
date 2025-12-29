"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Eye,
  MessageSquare,
  Share2,
  Flag,
  MoreHorizontal,
  Edit,
  ImageIcon,
  Trash2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ForumsThread } from "@/lib/types";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import forumsApi from "@/lib/forums-api";

interface ThreadHeaderProps {
  thread: ForumsThread;
  postCount?: number;
  onDeleted?: () => void;
}

export function ThreadHeader({
  thread,
  postCount,
  onDeleted,
}: ThreadHeaderProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const threadAuthorId = thread.authorId || thread.userId || "";
  const threadAuthor = thread.author || thread.user;
  const isOwner = user?.id === threadAuthorId;

  const coverImage = thread.extendedData?.coverImage;
  const threadIcon = thread.extendedData?.icon;

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await forumsApi.threads.delete(thread.id);
      onDeleted?.();
      router.push("/");
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete thread"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Cover Image */}
      <div className="relative aspect-[3/1] w-full overflow-visible bg-gradient-to-br from-primary/20 via-primary/10 to-muted">
        {/* Inner cover that clips ONLY the image */}
        <div className="absolute inset-0 overflow-hidden">
          {coverImage ? (
            <img
              src={coverImage}
              alt="Thread cover"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground/20" />
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>

        {/* Thread Icon - now safe (not clipped) */}
        <div className="absolute -bottom-8 left-6 z-30">
          <div className="h-20 w-20 rounded-2xl overflow-hidden border-4 border-card bg-muted shadow-xl">
            {threadIcon ? (
              <img
                src={threadIcon}
                alt="Thread icon"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <span className="text-2xl font-bold text-primary">
                  {thread.title.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons on cover */}
        <div className="absolute top-4 right-4 z-40 flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 text-white border-0"
          >
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 text-white border-0"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isOwner && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href={`/thread/${thread.id}/edit`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Thread
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem>
                <Flag className="mr-2 h-4 w-4" />
                Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="p-6 pt-12">
        {/* Title Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground leading-tight">
              {thread.title}
            </h1>

            {/* Created date */}
            <p className="mt-2 text-sm text-muted-foreground">
              Created{" "}
              {formatDistanceToNow(new Date(thread.createdAt), {
                addSuffix: true,
              })}
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground shrink-0">
            {thread.viewCount !== undefined && thread.viewCount > 0 && (
              <div className="flex flex-col items-center">
                <span className="font-semibold text-foreground">
                  {thread.viewCount}
                </span>
                <span className="text-xs flex items-center gap-1">
                  <Eye className="h-3 w-3" /> views
                </span>
              </div>
            )}
            <div className="flex flex-col items-center">
              <span className="font-semibold text-foreground">
                {postCount ?? thread.postCount ?? 0}
              </span>
              <span className="text-xs flex items-center gap-1">
                <MessageSquare className="h-3 w-3" /> Post
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="mt-6 text-foreground whitespace-pre-wrap leading-relaxed">
          {thread.body}
        </div>

        {/* Tags */}
        {thread.tags && thread.tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {thread.tags.map((tag) => {
              const tagName = typeof tag === "string" ? tag : tag.name;
              const tagKey = typeof tag === "string" ? tag : tag.id;
              return (
                <Badge
                  key={tagKey}
                  variant="secondary"
                  className="rounded-full px-3 py-1"
                >
                  #{tagName}
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Thread
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this thread? This action cannot be
              undone. All posts and comments will also be permanently deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 p-4 rounded-lg bg-muted/50 border">
            <p className="font-medium text-foreground line-clamp-2">
              {thread.title}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {postCount ?? thread.postCount ?? 0} posts will be deleted
            </p>
          </div>

          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Thread
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
