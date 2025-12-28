"use client";

import { useState, useEffect } from "react";
import { HomePostComposer } from "@/components/home/home-post-composer";
import { HomeFeed } from "@/components/home/home-feed";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, TrendingUp, Clock, MessageSquare } from "lucide-react";
import forumsApi from "@/lib/forums-api";

interface FeedStats {
  activeToday: number;
  newPosts: number;
  negotiations: number;
  trendingTags: { tag: string; count: number }[];
}

export default function HomePage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState<FeedStats>({
    activeToday: 0,
    newPosts: 0,
    negotiations: 0,
    trendingTags: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  const handlePostCreated = () => {
    setRefreshKey((prev) => prev + 1);
    // Also refresh stats
    fetchStats();
  };

  const fetchStats = async () => {
    try {
      const response = await forumsApi.threads.list({
        limit: 50,
        filter: "newest",
      });

      if (response.threads) {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Count threads created today
        const threadsToday = response.threads.filter(
          (t) => new Date(t.createdAt) > oneDayAgo
        ).length;

        // Count total posts across threads
        let totalPosts = 0;
        let totalWtb = 0; // WTB = negotiations/requests

        for (const thread of response.threads) {
          totalPosts += thread.postCount || 0;
          if (thread.title.toUpperCase().includes("WTB")) {
            totalWtb++;
          }
        }

        // Count trending by thread titles/tags
        const tagCounts = new Map<string, number>();
        for (const thread of response.threads) {
          // Extract potential game tags from title
          const title = thread.title.toLowerCase();
          for (const game of [
            "mobile-legends",
            "genshin",
            "uma-musume",
            "valorant",
            "roblox",
          ]) {
            if (title.includes(game.split("-")[0])) {
              tagCounts.set(game, (tagCounts.get(game) || 0) + 1);
            }
          }
        }

        const trendingTags = Array.from(tagCounts.entries())
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 4);

        setStats({
          activeToday: response.threads.length,
          newPosts: totalPosts,
          negotiations: totalWtb,
          trendingTags,
        });
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="w-full px-4 py-6 lg:px-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Flame className="h-6 w-6 text-orange-500" />
          <h1 className="text-2xl font-bold">Live Feed</h1>
        </div>
        <p className="text-muted-foreground">
          Post anything. Trade freely. Markets form when activity grows.
        </p>

        {/* Stats - Real Data */}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          {isLoading ? (
            <>
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-7 w-36" />
            </>
          ) : (
            <>
              <Badge
                variant="secondary"
                className="gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-600 border-green-500/20"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                {stats.activeToday} active markets
              </Badge>
              <Badge
                variant="secondary"
                className="gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-600 border-blue-500/20"
              >
                <Clock className="h-3.5 w-3.5" />
                {stats.newPosts} total posts
              </Badge>
              {stats.negotiations > 0 && (
                <Badge
                  variant="secondary"
                  className="gap-1.5 px-3 py-1.5 bg-purple-500/10 text-purple-600 border-purple-500/20"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  {stats.negotiations} WTB requests
                </Badge>
              )}
            </>
          )}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Feed */}
        <div className="lg:col-span-2">
          {/* Post Composer */}
          <HomePostComposer onPostCreated={handlePostCreated} />

          {/* Feed */}
          <HomeFeed refreshKey={refreshKey} />
        </div>

        {/* Right Sidebar - Trending */}
        <div className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            {/* Trending Tags - Real Data */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                Trending Now
              </h3>
              <div className="space-y-2">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-1.5"
                    >
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  ))
                ) : stats.trendingTags.length > 0 ? (
                  stats.trendingTags.map((item) => (
                    <div
                      key={item.tag}
                      className="flex items-center justify-between py-1.5"
                    >
                      <span className="text-sm text-muted-foreground">
                        #{item.tag}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.count} posts
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No trending tags yet
                  </p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold mb-3">Quick Actions</h3>
              <div className="space-y-2 text-sm">
                <a
                  href="/markets"
                  className="block text-primary hover:underline"
                >
                  → View Market Analytics
                </a>
                <a
                  href="/thread/new"
                  className="block text-primary hover:underline"
                >
                  → Create Market Thread
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
