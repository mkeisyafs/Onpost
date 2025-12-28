"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import forumsApi from "@/lib/forums-api";
import { ThreadCard } from "./thread-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Plus, TrendingUp, Sparkles } from "lucide-react";
import Link from "next/link";
import type { ForumsThread } from "@/lib/types";

interface ThreadListProps {
  categoryId?: string;
  authorId?: string;
  categoryFilter?: "game-items" | "accounts" | "physical" | "services" | null;
}

export function ThreadList({
  categoryId,
  authorId,
  categoryFilter,
}: ThreadListProps) {
  const [cursor, setCursor] = useState<string | null>(null);
  const [allThreads, setAllThreads] = useState<ForumsThread[]>([]);

  const { data, error, isLoading } = useSWR(
    ["threads", categoryId, authorId, cursor],
    () =>
      forumsApi.threads.list({
        categoryId,
        authorId,
        filter: "newest",
        cursor: cursor || undefined,
        limit: 20,
      }),
    {
      revalidateOnFocus: false,
    }
  );

  useEffect(() => {
    if (data?.threads) {
      if (cursor === null) {
        setAllThreads(data.threads);
      } else {
        setAllThreads((prev) => [...prev, ...data.threads]);
      }
    }
  }, [data, cursor]);

  // Filter threads by category if categoryFilter is provided
  const filteredThreads = categoryFilter
    ? allThreads.filter(
        (thread) => thread.extendedData?.category === categoryFilter
      )
    : allThreads;

  if (error) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <p className="text-destructive mb-4">Failed to load trades</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading && filteredThreads.length === 0) {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ThreadCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Active Empty State
  if (filteredThreads.length === 0) {
    return (
      <div className="space-y-4">
        {/* CTA Card */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Be the First Seller!</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Start the market by posting your first listing. Early sellers get
              the most visibility.
            </p>
            <Button asChild size="lg" className="rounded-full px-8">
              <Link href="/thread/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Listing
              </Link>
            </Button>
          </CardContent>
        </Card>


        {/* Skeleton Preview Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 opacity-30 pointer-events-none">
          {Array.from({ length: 4 }).map((_, i) => (
            <ThreadCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Responsive Grid Layout - 1 to 4 columns */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredThreads.map((thread) => (
          <ThreadCard key={thread.id} thread={thread} />
        ))}
      </div>

      {data?.nextThreadCursor && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => setCursor(data.nextThreadCursor)}
            disabled={isLoading}
            className="rounded-full px-8"
          >
            {isLoading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}

function ThreadCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <Skeleton className="aspect-[3/1] w-full" />
      <div className="p-4 pt-8 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}
