"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  TrendingUp,
  Gamepad2,
  ShoppingBag,
  Users,
  Flame,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const navigation = [
  { name: "Live Feed", href: "/", icon: Home },
  { name: "Market Analytics", href: "/markets", icon: TrendingUp },
  { name: "Game Items", href: "/markets?category=game-items", icon: Gamepad2 },
  { name: "Accounts", href: "/markets?category=accounts", icon: Users },
  { name: "Services", href: "/markets?category=services", icon: ShoppingBag },
];

// Hot Markets with active trade counts
const hotMarkets = [
  { name: "Mobile Legends", slug: "mobile-legends", active: 12 },
  { name: "Genshin Impact", slug: "genshin-impact", active: 8 },
  { name: "Uma Musume", slug: "uma-musume", active: 5 },
  { name: "Valorant", slug: "valorant", active: 4 },
  { name: "Roblox", slug: "roblox", active: 3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border lg:block">
      <div className="sticky top-14 flex h-[calc(100vh-3.5rem)] flex-col gap-6 overflow-y-auto p-4">
        {/* Create Button */}
        <Button asChild className="w-full rounded-full gap-2" size="lg">
          <Link href="/thread/new">
            <Plus className="h-4 w-4" />
            Create Post
          </Link>
        </Button>

        {/* Main Navigation */}
        <nav className="flex flex-col gap-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" &&
                pathname.startsWith(item.href.split("?")[0]));
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

        {/* Hot Markets */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 px-3 text-xs font-semibold uppercase text-muted-foreground">
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            Hot Markets
          </h3>
          <div className="space-y-1">
            {hotMarkets.map((market) => (
              <Link
                key={market.slug}
                href={`/markets?tag=${market.slug}`}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-secondary/50"
              >
                <span className="text-muted-foreground hover:text-foreground">
                  {market.name}
                </span>
                <Badge
                  variant="secondary"
                  className="h-5 px-1.5 text-xs bg-green-500/10 text-green-600"
                >
                  {market.active}
                </Badge>
              </Link>
            ))}
          </div>
        </div>

        {/* Community Requests Banner */}
        <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-yellow-500 text-black text-xs">WTB</Badge>
            <span className="text-xs font-medium">Requests Open</span>
          </div>
          <p className="text-xs text-muted-foreground">
            6 buyers looking for items
          </p>
        </div>

        {/* Footer */}
        <div className="mt-auto border-t border-border pt-4 text-xs text-muted-foreground">
          <p className="font-medium">ONPOST Marketplace</p>
          <p className="mt-0.5 text-[11px]">AI-Powered Trading Platform</p>
        </div>
      </div>
    </aside>
  );
}
