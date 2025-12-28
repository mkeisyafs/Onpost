"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  TrendingUp,
  Loader2,
  Filter,
  Gamepad2,
  Users,
  Package,
  ShoppingBag,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import forumsApi from "@/lib/forums-api";
import type { ForumsThread } from "@/lib/types";

type CategoryFilter =
  | "all"
  | "game-items"
  | "accounts"
  | "physical"
  | "services";
type TypeFilter = "all" | "market" | "discussion";
type SortOption = "newest" | "popular" | "active";

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [allThreads, setAllThreads] = useState<ForumsThread[]>([]);
  const [results, setResults] = useState<ForumsThread[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch all threads once
  useEffect(() => {
    fetchAllThreads();
  }, []);

  // Search on initial load if query exists
  useEffect(() => {
    if (initialQuery && allThreads.length > 0) {
      applyFilters(initialQuery);
    }
  }, [initialQuery, allThreads]);

  // Re-apply filters when filters change
  useEffect(() => {
    if (hasSearched || allThreads.length > 0) {
      applyFilters(query);
    }
  }, [categoryFilter, typeFilter, sortOption]);

  const fetchAllThreads = async () => {
    setIsLoading(true);
    try {
      const response = await forumsApi.threads.list({
        limit: 100,
        filter: "newest",
      });
      if (response.threads) {
        setAllThreads(response.threads);
      }
    } catch (error) {
      console.error("Failed to fetch threads:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = (searchQuery: string) => {
    let filtered = [...allThreads];

    // Text search
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter((thread) => {
        const titleMatch = thread.title.toLowerCase().includes(searchLower);
        const bodyMatch = thread.body?.toLowerCase().includes(searchLower);
        const tagsMatch = thread.tags?.some((tag) =>
          tag.toLowerCase().includes(searchLower)
        );
        return titleMatch || bodyMatch || tagsMatch;
      });
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(
        (thread) => thread.extendedData?.category === categoryFilter
      );
    }

    // Type filter
    if (typeFilter === "market") {
      filtered = filtered.filter(
        (thread) => thread.extendedData?.market?.marketEnabled
      );
    } else if (typeFilter === "discussion") {
      filtered = filtered.filter(
        (thread) => !thread.extendedData?.market?.marketEnabled
      );
    }

    // Sort
    if (sortOption === "newest") {
      filtered.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (sortOption === "popular") {
      filtered.sort((a, b) => (b.postCount || 0) - (a.postCount || 0));
    } else if (sortOption === "active") {
      filtered.sort((a, b) => {
        const aActive = a.extendedData?.market?.validCount || a.postCount || 0;
        const bActive = b.extendedData?.market?.validCount || b.postCount || 0;
        return bActive - aActive;
      });
    }

    setResults(filtered);
    setHasSearched(true);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters(query);
    window.history.replaceState(
      {},
      "",
      `/search?q=${encodeURIComponent(query)}`
    );
  };

  const clearFilters = () => {
    setCategoryFilter("all");
    setTypeFilter("all");
    setSortOption("newest");
  };

  const hasActiveFilters =
    categoryFilter !== "all" || typeFilter !== "all" || sortOption !== "newest";

  const categories = [
    { value: "all", label: "All Categories", icon: null },
    { value: "game-items", label: "Game Items", icon: Gamepad2 },
    { value: "accounts", label: "Accounts", icon: Users },
    { value: "physical", label: "Physical Items", icon: Package },
    { value: "services", label: "Services", icon: ShoppingBag },
  ];

  return (
    <div className="w-full px-4 py-6 lg:px-6 max-w-4xl mx-auto">
      {/* Search Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Search className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Search</h1>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search threads, markets, posts..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-12 text-lg"
              autoFocus
            />
          </div>
          <Button
            type="button"
            variant={showFilters ? "secondary" : "outline"}
            size="lg"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Filter className="h-4 w-4" />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary" />
            )}
          </Button>
          <Button type="submit" size="lg" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Search"
            )}
          </Button>
        </form>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 rounded-xl border border-border bg-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </h3>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear all
                </Button>
              )}
            </div>

            {/* Category Filter */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <Button
                    key={cat.value}
                    variant={
                      categoryFilter === cat.value ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setCategoryFilter(cat.value as CategoryFilter)
                    }
                    className="rounded-full"
                  >
                    {cat.icon && <cat.icon className="h-3 w-3 mr-1" />}
                    {cat.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Type Filter */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Type
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={typeFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTypeFilter("all")}
                  className="rounded-full"
                >
                  All
                </Button>
                <Button
                  variant={typeFilter === "market" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTypeFilter("market")}
                  className="rounded-full"
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Markets Only
                </Button>
                <Button
                  variant={typeFilter === "discussion" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTypeFilter("discussion")}
                  className="rounded-full"
                >
                  Discussions
                </Button>
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Sort by
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={sortOption === "newest" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortOption("newest")}
                  className="rounded-full"
                >
                  Newest
                </Button>
                <Button
                  variant={sortOption === "popular" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortOption("popular")}
                  className="rounded-full"
                >
                  Most Posts
                </Button>
                <Button
                  variant={sortOption === "active" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortOption("active")}
                  className="rounded-full"
                >
                  Most Active
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : hasSearched ? (
        <div className="space-y-4">
          {/* Results Count */}
          <p className="text-muted-foreground">
            {results.length} result{results.length !== 1 ? "s" : ""}
            {query && ` for "${query}"`}
            {hasActiveFilters && " (filtered)"}
          </p>

          {results.length > 0 ? (
            <div className="space-y-3">
              {results.map((thread) => (
                <Link key={thread.id} href={`/thread/${thread.id}`}>
                  <Card className="transition-colors hover:bg-muted/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground truncate">
                              {thread.title}
                            </h3>
                            {thread.extendedData?.market?.marketEnabled && (
                              <Badge variant="secondary" className="shrink-0">
                                <TrendingUp className="mr-1 h-3 w-3" />
                                Market
                              </Badge>
                            )}
                            {thread.extendedData?.category && (
                              <Badge
                                variant="outline"
                                className="shrink-0 text-xs"
                              >
                                {thread.extendedData.category}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {thread.body}
                          </p>
                          {thread.tags && thread.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {thread.tags.slice(0, 3).map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  #{tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right text-xs text-muted-foreground shrink-0">
                          <span>{thread.postCount || 0} posts</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground">
                  Try different keywords or adjust your filters
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Search threads and markets
            </h3>
            <p className="text-muted-foreground">
              Enter keywords or use filters to find what you&apos;re looking for
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full px-4 py-6 lg:px-6 max-w-4xl mx-auto">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-12 w-full mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
