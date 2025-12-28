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
  Flame,
  Plus,
  Package,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth/auth-modal";
import forumsApi from "@/lib/forums-api";
import type { ForumsThread } from "@/lib/types";

const navigation = [
  { name: "Live Feed", href: "/", icon: Home },
  { name: "Market Analytics", href: "/markets", icon: TrendingUp },
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
  const { user, isAuthenticated, logout } = useAuth();
  const [hotMarkets, setHotMarkets] = useState<HotMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [wtbCount, setWtbCount] = useState(0);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"signin" | "signup">(
    "signin"
  );

  // Fetch real hot markets data from threads
  useEffect(() => {
    const fetchHotMarkets = async () => {
      try {
        const response = await forumsApi.threads.list({
          limit: 20,
          filter: "newest",
        });

        if (response.threads && response.threads.length > 0) {
          // Fetch post counts for each thread
          const marketsData: HotMarket[] = [];
          let totalWtb = 0;

          // Fetch post counts in parallel (limit to first 10 for performance)
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

            // Check for WTB in thread title
            if (thread.title.toUpperCase().includes("WTB")) {
              totalWtb++;
            }

            marketsData.push({
              name: name.length > 20 ? name.substring(0, 20) + "..." : name,
              slug,
              active: count,
              threadId: thread.id,
            });
          }

          // Sort by activity and take top 5
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
    <aside className="hidden w-60 shrink-0 border-r border-border lg:block">
      <div className="sticky top-14 flex h-[calc(100vh-3.5rem)] flex-col gap-6 overflow-y-auto p-4">
        {/* Create Button */}
        <Button asChild className="w-full rounded-full gap-2" size="lg">
          <Link href="/thread/new">
            <Plus className="h-4 w-4" />
            Create Thread{" "}
          </Link>
        </Button>

        {/* Main Navigation */}
        <nav className="flex flex-col gap-1">
          {navigation.map((item) => {
            // Precise URL matching including query params
            let isActive = false;
            if (item.href === "/") {
              // Home: only active when exactly at "/"
              isActive = pathname === "/";
            } else if (item.href === "/markets") {
              // Market Analytics: active only when at /markets without category query
              isActive = pathname === "/markets" && !currentCategory;
            } else if (item.href.includes("?category=")) {
              // Category links: active when path + category param matches
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
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Hot Markets - Real Data */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 px-3 text-xs font-semibold uppercase text-muted-foreground">
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            Hot Markets
          </h3>
          <div className="space-y-1">
            {isLoading ? (
              // Skeleton loading
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-6" />
                </div>
              ))
            ) : hotMarkets.length > 0 ? (
              hotMarkets.map((market) => (
                <Link
                  key={market.slug}
                  href={`/thread/${market.threadId}`}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-secondary/50"
                >
                  <span className="text-muted-foreground hover:text-foreground truncate max-w-32">
                    {market.name}
                  </span>
                  <Badge
                    variant="secondary"
                    className="h-5 px-1.5 text-xs bg-green-500/10 text-green-600"
                  >
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

        {/* Community Requests Banner - Real Count */}
        {wtbCount > 0 && (
          <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-yellow-500 text-black text-xs">WTB</Badge>
              <span className="text-xs font-medium">Requests Open</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {wtbCount} buyers looking for items
            </p>
          </div>
        )}

        {/* Footer - User Profile */}
        <div className="mt-auto border-t border-border pt-4">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <Link href={`/user/${user.id}`}>
                <Avatar className="h-9 w-9">
                  <AvatarImage
                    src={user.avatarUrl || undefined}
                    alt={user.displayName}
                  />
                  <AvatarFallback>
                    {user.displayName?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/user/${user.id}`}
                  className="font-medium text-sm text-foreground hover:underline truncate block"
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
                className="h-8 w-8 shrink-0"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => setAuthModalOpen(true)}
                >
                  Sign In
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
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
