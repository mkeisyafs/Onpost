"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  TrendingUp,
  Gamepad2,
  ShoppingBag,
  Users,
  Package,
  Plus,
  LogOut,
  Zap,
  Flame,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserAvatarUrl } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth/auth-modal";
import forumsApi from "@/lib/forums-api";
import type { ForumsThread } from "@/lib/types";

const navigation = [
  { name: "Live Feed", href: "/", icon: Home },
  { name: "Market", href: "/markets", icon: TrendingUp },
  { name: "Game Items", href: "/markets?category=game-items", icon: Gamepad2 },
  { name: "Accounts", href: "/markets?category=accounts", icon: Users },
  { name: "Physical Items", href: "/markets?category=physical", icon: Package },
  { name: "Services", href: "/markets?category=services", icon: ShoppingBag },
];

interface HotMarket {
  name: string;
  slug: string;
  active: number;
  threadId?: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get("category");
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [hotMarkets, setHotMarkets] = useState<HotMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [wtbCount, setWtbCount] = useState(0);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"signin" | "signup">(
    "signin"
  );
  const [hasMounted, setHasMounted] = useState(false);

  // Track client-side mount to prevent hydration mismatch
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Fetch real hot markets data from threads
  useEffect(() => {
    const fetchHotMarkets = async () => {
      try {
        const response = await forumsApi.threads.list({
          limit: 20,
          filter: "newest",
        });

        if (response.threads && response.threads.length > 0) {
          const marketsData: HotMarket[] = [];
          let totalWtb = 0;

          const threadsToProcess = response.threads.slice(0, 10);
          const postCountPromises = threadsToProcess.map(async (thread) => {
            try {
              const postsResponse = await forumsApi.posts.list(thread.id, {
                limit: 1,
              });
              return {
                thread,
                count: postsResponse.count ?? postsResponse.posts?.length ?? 0,
              };
            } catch {
              return { thread, count: 0 };
            }
          });

          const results = await Promise.all(postCountPromises);

          for (const { thread, count } of results) {
            const name = thread.title;
            const slug = thread.id;

            if (thread.title.toUpperCase().includes("WTB")) {
              totalWtb++;
            }

            marketsData.push({
              name: name.length > 25 ? name.substring(0, 25) + "..." : name,
              slug,
              active: count,
              threadId: thread.id,
            });
          }

          const sortedMarkets = marketsData
            .sort((a, b) => b.active - a.active)
            .slice(0, 5);

          setHotMarkets(sortedMarkets);
          setWtbCount(totalWtb);
        }
      } catch (error) {
        console.error("Failed to fetch hot markets:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHotMarkets();
  }, []);

  return (
    <aside className="hidden w-72 shrink-0 lg:block">
      <div className="sticky top-16 flex h-[calc(100vh-4rem)] flex-col gap-4 overflow-y-auto p-4">
        {/* Create Button - Gradient */}
        <Button
          asChild
          className="w-full rounded-xl gap-2 h-11 text-sm font-semibold bg-linear-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/20 transition-all"
        >
          <Link href="/thread/new">
            <div className="relative">
              <Plus className="h-4 w-4" />
            </div>
            Create Thread
          </Link>
        </Button>

        {/* Main Navigation */}
        <nav className="flex flex-col gap-1 p-2 rounded-2xl bg-muted/50 border border-border/50">
          {navigation.map((item) => {
            let isActive = false;
            if (item.href === "/") {
              isActive = pathname === "/";
            } else if (item.href === "/markets") {
              isActive = pathname === "/markets" && !currentCategory;
            } else if (item.href.includes("?category=")) {
              const category = item.href.split("category=")[1];
              isActive =
                pathname === "/markets" && currentCategory === category;
            } else {
              isActive =
                pathname === item.href || pathname.startsWith(item.href);
            }
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:bg-background hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isActive ? "text-primary-foreground" : ""
                  )}
                />
                {item.name}
                {isActive && (
                  <div className="ml-auto h-2 w-2 rounded-full bg-primary-foreground shadow animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Hot Markets */}
        <div className="p-3 rounded-2xl bg-muted/50 border border-border/50">
          <h3 className="mb-3 flex items-center gap-2 px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Flame className="h-4 w-4 text-orange-500" />
            Hot Markets
            <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">
              {hotMarkets.length}
            </span>
          </h3>
          <div className="space-y-1">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <Skeleton className="h-4 w-28 rounded bg-muted" />
                  <Skeleton className="h-6 w-8 rounded-full bg-muted" />
                </div>
              ))
            ) : hotMarkets.length > 0 ? (
              hotMarkets.map((market, index) => (
                <Link
                  key={market.slug}
                  href={`/thread/${market.threadId}`}
                  className={cn(
                    "group flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-all duration-200",
                    "hover:bg-background"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold shrink-0",
                        index === 0
                          ? "bg-yellow-500/20 text-yellow-600"
                          : index === 1
                          ? "bg-gray-400/20 text-gray-500"
                          : index === 2
                          ? "bg-orange-600/20 text-orange-500"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="text-muted-foreground group-hover:text-foreground truncate transition-colors">
                      {market.name}
                    </span>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "h-5 px-2 text-xs font-medium",
                      "bg-primary/10 text-primary border-primary/20",
                      "group-hover:bg-primary/20 transition-colors"
                    )}
                  >
                    <Zap className="mr-0.5 h-2.5 w-2.5" />
                    {market.active}
                  </Badge>
                </Link>
              ))
            ) : (
              <p className="px-3 text-xs text-muted-foreground">
                No active markets yet
              </p>
            )}
          </div>
        </div>

        {/* Community Requests Banner */}
        {wtbCount > 0 && (
          <div className="rounded-2xl bg-linear-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-yellow-500 text-black text-xs font-bold">
                WTB
              </Badge>
              <span className="text-sm font-semibold">Requests Open</span>
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-yellow-600 font-bold">{wtbCount}</span>{" "}
              buyers looking for items
            </p>
            <div className="mt-2 flex -space-x-2">
              {Array.from({ length: Math.min(wtbCount, 5) }).map((_, i) => (
                <div
                  key={i}
                  className="h-6 w-6 rounded-full border-2 border-background bg-linear-to-br from-yellow-400 to-orange-500"
                />
              ))}
            </div>
          </div>
        )}

        {/* Footer - User Profile */}
        <div className="mt-auto p-3 rounded-2xl bg-muted/50 border border-border/50">
          {!hasMounted ? (
            // Loading skeleton - renders the same on server and client
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ) : isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <Link href={`/user/${user.id}`} className="relative">
                <Avatar className="h-10 w-10 border-2 border-primary/30">
                  <AvatarImage
                    src={getUserAvatarUrl(user)}
                    alt={user.displayName}
                  />
                  <AvatarFallback className="bg-linear-to-br from-primary to-accent text-primary-foreground font-bold">
                    {user.displayName?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/user/${user.id}`}
                  className="font-semibold text-sm text-foreground hover:text-primary truncate block transition-colors"
                >
                  {user.displayName || user.username}
                </Link>
                <p className="text-xs text-muted-foreground truncate">
                  @{user.username}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="h-8 w-8 shrink-0 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Button
                  className="w-full rounded-xl h-9 font-medium bg-linear-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                  size="sm"
                  onClick={() => setAuthModalOpen(true)}
                >
                  Sign In
                </Button>
                <Button
                  variant="outline"
                  className="w-full rounded-xl h-9 font-medium border-border bg-background hover:bg-muted"
                  size="sm"
                  onClick={() => {
                    setAuthModalTab("signup");
                    setAuthModalOpen(true);
                  }}
                >
                  Sign Up
                </Button>
              </div>
              <AuthModal
                open={authModalOpen}
                onOpenChange={setAuthModalOpen}
                defaultTab={authModalTab}
              />
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
