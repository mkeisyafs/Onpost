"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, Gamepad2, ShoppingBag, Users, TrendingUp, Tag } from "lucide-react"

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "All Markets", href: "/markets", icon: TrendingUp },
  { name: "Game Items", href: "/category/game-items", icon: Gamepad2 },
  { name: "Accounts", href: "/category/accounts", icon: Users },
  { name: "Services", href: "/category/services", icon: ShoppingBag },
]

const popularTags = ["mobile-legends", "genshin-impact", "valorant", "ff", "roblox"]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-56 shrink-0 border-r border-border lg:block">
      <div className="sticky top-14 flex h-[calc(100vh-3.5rem)] flex-col gap-6 overflow-y-auto p-4">
        {/* Main Navigation */}
        <nav className="flex flex-col gap-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Popular Tags */}
        <div>
          <h3 className="mb-2 flex items-center gap-2 px-3 text-xs font-semibold uppercase text-muted-foreground">
            <Tag className="h-3 w-3" />
            Popular Tags
          </h3>
          <div className="flex flex-wrap gap-1.5 px-1">
            {popularTags.map((tag) => (
              <Link
                key={tag}
                href={`/tag/${tag}`}
                className="rounded-md bg-secondary px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
              >
                #{tag}
              </Link>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto border-t border-border pt-4 text-xs text-muted-foreground">
          <p>ONPOST Marketplace</p>
          <p className="mt-1">Powered by Foru.ms</p>
        </div>
      </div>
    </aside>
  )
}
