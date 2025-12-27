import { formatDistanceToNow } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, MessageSquare, Share2, Flag, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { ForumsThread } from "@/lib/types"
import Link from "next/link"

interface ThreadHeaderProps {
  thread: ForumsThread
}

export function ThreadHeader({ thread }: ThreadHeaderProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      {/* Title */}
      <h1 className="text-2xl font-bold text-foreground text-balance">{thread.title}</h1>

      {/* Author & Meta */}
      <div className="mt-4 flex items-center gap-3">
        <Link href={`/user/${thread.authorId}`}>
          <Avatar className="h-10 w-10">
            <AvatarImage src={thread.author?.avatarUrl || undefined} alt={thread.author?.displayName} />
            <AvatarFallback>{thread.author?.displayName?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1">
          <Link href={`/user/${thread.authorId}`} className="font-medium text-foreground hover:underline">
            {thread.author?.displayName || "Anonymous"}
          </Link>
          <p className="text-sm text-muted-foreground">
            Posted{" "}
            {formatDistanceToNow(new Date(thread.createdAt), {
              addSuffix: true,
            })}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {thread.viewCount}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            {thread.postCount}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="mt-4 whitespace-pre-wrap text-foreground">{thread.body}</div>

      {/* Tags */}
      {thread.tags && thread.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {thread.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              #{tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
        <Button variant="ghost" size="sm">
          <Share2 className="mr-1 h-4 w-4" />
          Share
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Flag className="mr-2 h-4 w-4" />
              Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
