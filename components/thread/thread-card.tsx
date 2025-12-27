import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Eye, TrendingUp, Lock } from "lucide-react"
import type { ForumsThread } from "@/lib/types"

interface ThreadCardProps {
  thread: ForumsThread
}

export function ThreadCard({ thread }: ThreadCardProps) {
  const market = thread.extendedData?.market
  const hasMarketData = market?.marketEnabled && !market.analytics.locked

  return (
    <Link
      href={`/thread/${thread.id}`}
      className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-card/80"
    >
      <div className="flex gap-4">
        {/* Author Avatar */}
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={thread.author?.avatarUrl || undefined} alt={thread.author?.displayName} />
          <AvatarFallback>{thread.author?.displayName?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          {/* Title & Market Indicator */}
          <div className="flex items-start gap-2">
            <h3 className="font-semibold leading-tight text-foreground line-clamp-2">{thread.title}</h3>
            {hasMarketData && (
              <Badge variant="outline" className="shrink-0 border-primary/50 text-primary">
                <TrendingUp className="mr-1 h-3 w-3" />
                Market
              </Badge>
            )}
            {market?.marketEnabled && market.analytics.locked && (
              <Badge variant="outline" className="shrink-0">
                <Lock className="mr-1 h-3 w-3" />
                {market.validCount}/{market.thresholdValid}
              </Badge>
            )}
          </div>

          {/* Author & Time */}
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span>{thread.author?.displayName || "Anonymous"}</span>
            <span>·</span>
            <span>
              {formatDistanceToNow(new Date(thread.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>

          {/* Preview Text */}
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
            {thread.body.replace(/[#*`]/g, "").substring(0, 200)}
          </p>

          {/* Tags & Stats */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {thread.tags?.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {thread.tags && thread.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">+{thread.tags.length - 3} more</span>
            )}
            <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {thread.postCount}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {thread.viewCount}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
