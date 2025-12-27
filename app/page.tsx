"use client";

import { useState } from "react";
import { HomePostComposer } from "@/components/home/home-post-composer";
import { HomeFeed } from "@/components/home/home-feed";
import { Badge } from "@/components/ui/badge";
import { Flame, TrendingUp, Clock, MessageSquare } from "lucide-react";

export default function HomePage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePostCreated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Demo stats
  const stats = {
    activeToday: 12,
    newPosts: 8,
    negotiations: 3,
  };

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

        {/* Stats */}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <Badge
            variant="secondary"
            className="gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-600 border-green-500/20"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            {stats.activeToday} active trades
          </Badge>
          <Badge
            variant="secondary"
            className="gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-600 border-blue-500/20"
          >
            <Clock className="h-3.5 w-3.5" />
            {stats.newPosts} new posts
          </Badge>
          <Badge
            variant="secondary"
            className="gap-1.5 px-3 py-1.5 bg-purple-500/10 text-purple-600 border-purple-500/20"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {stats.negotiations} negotiations
          </Badge>
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
            {/* Trending Tags */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                Trending Now
              </h3>
              <div className="space-y-2">
                {[
                  "mobile-legends",
                  "genshin-impact",
                  "uma-musume",
                  "valorant",
                ].map((tag, i) => (
                  <div
                    key={tag}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm text-muted-foreground">
                      #{tag}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {12 - i * 2} posts
                    </span>
                  </div>
                ))}
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
