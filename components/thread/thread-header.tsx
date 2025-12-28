"use client";

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
  Heart,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ForumsThread } from "@/lib/types";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

interface ThreadHeaderProps {
  thread: ForumsThread;
  postCount?: number;
}

export function ThreadHeader({ thread, postCount }: ThreadHeaderProps) {
  const { user } = useAuth();

  const threadAuthorId = thread.authorId || thread.userId || "";
  const threadAuthor = thread.author || thread.user;
  const isOwner = user?.id === threadAuthorId;

  const coverImage = thread.extendedData?.coverImage;
  const threadIcon = thread.extendedData?.icon;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Cover Image */}
      <div className="relative aspect-[3/1] w-full overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-muted">
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

        {/* Thread Icon - Positioned on bottom of cover */}
        <div className="absolute -bottom-8 left-6">
          <div className="relative h-20 w-20 rounded-2xl overflow-hidden border-4 border-card bg-muted shadow-xl">
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
        <div className="absolute top-4 right-4 flex gap-2">
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
        {/* Title & Author Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground leading-tight">
              {thread.title}
            </h1>

            {/* Author Info */}
            <div className="mt-3 flex items-center gap-3">
              <Link href={`/user/${threadAuthorId}`} className="shrink-0">
                <Avatar className="h-8 w-8 ring-2 ring-background">
                  <AvatarImage
                    src={threadAuthor?.avatarUrl || undefined}
                    alt={threadAuthor?.displayName}
                  />
                  <AvatarFallback className="text-xs">
                    {threadAuthor?.displayName?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="min-w-0">
                <Link
                  href={`/user/${threadAuthorId}`}
                  className="font-medium text-foreground hover:text-primary transition-colors"
                >
                  {threadAuthor?.displayName || "Anonymous"}
                </Link>
                <p className="text-xs text-muted-foreground">
                  Posted{" "}
                  {formatDistanceToNow(new Date(thread.createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>
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
            {thread.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="rounded-full px-3 py-1"
              >
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Bottom Actions */}
        <div className="mt-6 pt-4 border-t border-border flex items-center gap-2">

          {isOwner && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="rounded-full gap-2"
            >
              <Link href={`/thread/${thread.id}/edit`}>
                <Edit className="h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
