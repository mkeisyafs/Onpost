"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ThreadList } from "@/components/thread/thread-list";
import {
  TrendingUp,
  BarChart3,
  Sparkles,
  Gamepad2,
  Users,
  Package,
  ShoppingBag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import forumsApi from "@/lib/forums-api";

const categoryLabels: Record<string, { label: string; icon: React.ReactNode }> =
  {
    "game-items": {
      label: "Game Items",
      icon: <Gamepad2 className="h-5 w-5" />,
    },
    accounts: { label: "Accounts", icon: <Users className="h-5 w-5" /> },
    physical: {
      label: "Physical Items",
      icon: <Package className="h-5 w-5" />,
    },
    services: { label: "Services", icon: <ShoppingBag className="h-5 w-5" /> },
  };

// Inner component that uses useSearchParams
function MarketsContent() {
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get("category") as
    | "game-items"
    | "accounts"
    | "physical"
    | "services"
    | null;

  const [stats, setStats] = useState({ totalMarkets: 0, withInsights: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await forumsApi.threads.list({
          limit: 50,
          filter: "newest",
        });

        if (response.threads) {
          const totalMarkets = response.threads.length;
          const withInsights = response.threads.filter(
            (t) => (t.postCount || 0) >= 10
          ).length;

          setStats({ totalMarkets, withInsights });
        }
      } catch (error) {
        console.error("Failed to fetch market stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const currentCategory = categoryFilter
    ? categoryLabels[categoryFilter]
    : null;

  return (
    <div className="w-full px-4 py-6 lg:px-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          {currentCategory ? (
            <>
              {currentCategory.icon}
              <h1 className="text-2xl font-bold">{currentCategory.label}</h1>
            </>
          ) : (
            <>
              <TrendingUp className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Market</h1>
            </>
          )}
        </div>
        <p className="text-muted-foreground">
          {currentCategory
            ? `Browse ${currentCategory.label.toLowerCase()} listings and markets.`
            : "Structured markets with live pricing and AI-driven insights."}
        </p>

        {/* Stats */}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          {isLoading ? (
            <>
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-7 w-36" />
            </>
          ) : (
            <>
              <Badge
                variant="secondary"
                className="gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border-primary/20"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                {stats.totalMarkets} active markets
              </Badge>
            </>
          )}
        </div>

        {/* Mobile Category Filters */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 lg:hidden scrollbar-hide">
          <a
            href="/markets"
            className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !categoryFilter
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            All Markets
          </a>
          <a
            href="/markets?category=game-items"
            className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              categoryFilter === "game-items"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <Gamepad2 className="h-4 w-4" />
            Game Items
          </a>
          <a
            href="/markets?category=accounts"
            className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              categoryFilter === "accounts"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <Users className="h-4 w-4" />
            Accounts
          </a>
          <a
            href="/markets?category=physical"
            className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              categoryFilter === "physical"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <Package className="h-4 w-4" />
            Physical Items
          </a>
          <a
            href="/markets?category=services"
            className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              categoryFilter === "services"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            Services
          </a>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-6 rounded-xl border border-border/50 bg-muted/50 p-4">
        <h3 className="font-medium mb-1">How Markets Work</h3>
        <p className="text-sm text-muted-foreground">
          Each market is a thread that collects trade listings. When a market
          reaches 10+ valid trades, AI-powered analytics unlock including price
          trends, buyer/seller patterns, and market insights.
        </p>
      </div>

      {/* Thread List (Markets) */}
      <ThreadList
        categoryFilter={categoryFilter}
        categoryLabel={currentCategory?.label}
      />
    </div>
  );
}

// Main page component with Suspense boundary
export default function MarketsPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full px-4 py-6 lg:px-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-4 w-96 mb-6" />
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        </div>
      }
    >
      <MarketsContent />
    </Suspense>
  );
}
