"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Eye, TrendingUp, ImageIcon, Clock } from "lucide-react";
import type { ForumsThread } from "@/lib/types";
import useSWR from "swr";
import forumsApi from "@/lib/forums-api";

interface ThreadCardProps {
  thread: ForumsThread;
}

// Format number with k suffix (1000 = 1k, 1800 = 1.8k)
function formatNumber(num: number): string {
  if (num >= 1000) {
    const formatted = (num / 1000).toFixed(1);
    // Remove trailing .0
    return formatted.endsWith(".0")
      ? formatted.slice(0, -2) + "k"
      : formatted + "k";
  }
  return num.toString();
}

// Detect intent from thread title or body
function detectIntent(
  title: string,
  body: string
): "WTS" | "WTB" | "WTT" | null {
  const combined = `${title} ${body}`.toUpperCase();
  if (
    combined.includes("#WTS") ||
    combined.includes("WTS") ||
    combined.includes("SELLING") ||
    combined.includes("JUAL")
  ) {
    return "WTS";
  }
  if (
    combined.includes("#WTB") ||
    combined.includes("WTB") ||
    combined.includes("BUYING") ||
    combined.includes("BELI")
  ) {
    return "WTB";
  }
  if (
    combined.includes("#WTT") ||
    combined.includes("WTT") ||
    combined.includes("TRADE") ||
    combined.includes("TUKAR")
  ) {
    return "WTT";
  }
  return null;
}

const intentStyles = {
  WTS: "bg-green-500 text-white",
  WTB: "bg-yellow-500 text-black",
  WTT: "bg-orange-500 text-white",
};

const intentLabels = {
  WTS: "SELLING",
  WTB: "BUYING",
  WTT: "TRADING",
};

export function ThreadCard({ thread }: ThreadCardProps) {
  const threadAuthor = thread.author || thread.user;
  const market = thread.extendedData?.market;
  const coverImage = thread.extendedData?.coverImage;
  const threadIcon = thread.extendedData?.icon;
  const hasMarketData = market?.marketEnabled && !market?.analytics?.locked;

  const intent = detectIntent(thread.title, thread.body);

  // Fetch posts to get actual count (with error resilience)
  const { data: postsData } = useSWR(
    ["thread-posts-count", thread.id],
    () => forumsApi.posts.list(thread.id, { limit: 1 }),
    {
      revalidateOnFocus: false,
      // Don't spam retries on 500 errors
      shouldRetryOnError: false,
      errorRetryCount: 0,
    }
  );

  // Use real data from thread or fetched data
  const viewCount = thread.viewCount || 0;
  const postCount = thread.postCount ?? 0;

  return (
    <Link
      href={`/thread/${thread.id}`}
      className="group block rounded-2xl border border-border bg-card overflow-hidden transition-all hover:shadow-xl hover:border-primary/30 hover:-translate-y-0.5"
    >
      {/* Cover with Intent Badge */}
      {/* Cover wrapper (JANGAN overflow-hidden) */}
      <div className="relative aspect-3/1 w-full bg-linear-to-br from-primary/10 via-muted to-primary/5 overflow-visible">
        {/* Inner cover yang boleh overflow-hidden */}
        <div className="absolute inset-0 overflow-hidden">
          {coverImage ? (
            <img
              src={coverImage}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground/20" />
            </div>
          )}
        </div>

        {/* Intent Badge */}
        {intent && (
          <Badge
            className={`absolute top-3 left-3 px-3 py-1 text-sm font-bold shadow-lg ${intentStyles[intent]}`}
          >
            {intentLabels[intent]}
          </Badge>
        )}

        {/* Market Badge */}
        {hasMarketData && (
          <Badge className="absolute top-3 right-3 bg-primary/90 text-primary-foreground border-0 shadow-lg">
            <TrendingUp className="mr-1 h-3 w-3" />
            Market
          </Badge>
        )}

        {/* Thread Icon (aman karena parent overflow-visible) */}
        <div className="absolute -bottom-7 left-4 z-30">
          <div className="h-14 w-14 rounded-xl overflow-hidden border-[3px] border-card bg-muted shadow-lg">
            {threadIcon ? (
              <img
                src={threadIcon}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-linear-to-br from-primary/20 to-primary/5">
                <span className="text-lg font-bold text-primary">
                  {thread.title.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 pt-8">
        <div className="flex gap-3">
          <div className="min-w-0 flex-1">
            {/* Title */}
            <h3 className="font-semibold leading-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors">
              {thread.title}
            </h3>

            {/* Author & Time */}
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Avatar className="h-5 w-5">
                <AvatarImage
                  src={threadAuthor?.avatarUrl || undefined}
                  alt={threadAuthor?.displayName}
                />
                <AvatarFallback className="text-[10px]">
                  {threadAuthor?.displayName?.charAt(0).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">
                {threadAuthor?.displayName || "Anonymous"}
              </span>
              <span>·</span>
              <span>
                {formatDistanceToNow(new Date(thread.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Preview Text */}
        <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
          {thread.body
            .replace(/[#*`]/g, "")
            .replace(/#?(WTS|WTB|WTT)/gi, "")
            .substring(0, 120)
            .trim()}
        </p>

        {/* Tags & Stats with Micro-interactions */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {thread.tags?.slice(0, 2).map((tag) => {
            const label = typeof tag === "string" ? tag : tag.name;
            const tagKey = typeof tag === "string" ? tag : tag.id;
            return (
              <Badge
                key={tagKey}
                variant="secondary"
                className="text-xs px-2 py-0.5 rounded-full bg-muted/50"
              >
                #{label}
              </Badge>
            );
          })}
          {thread.tags && thread.tags.length > 2 && (
            <span className="text-xs text-muted-foreground">
              +{thread.tags.length - 2}
            </span>
          )}

          {/* Micro-interactions - Real Data with k suffix */}
          <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
            {viewCount > 0 && (
              <span className="flex items-center gap-1" title="Views">
                <Eye className="h-3.5 w-3.5" />
                {formatNumber(viewCount)}
              </span>
            )}
            <span className="flex items-center gap-1" title="Posts">
              <MessageSquare className="h-3.5 w-3.5" />
              {formatNumber(postCount)}
            </span>
            <span className="flex items-center gap-1" title="Last activity">
              <Clock className="h-3.5 w-3.5" />
              {formatDistanceToNow(
                new Date(thread.updatedAt || thread.createdAt)
              )}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
