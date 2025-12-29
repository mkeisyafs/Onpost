"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, TrendingUp, Bot, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useAuthModal } from "@/lib/auth-modal-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AIMarketAssistant } from "@/components/home/ai-market-assistant";

const navItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Market", href: "/markets", icon: TrendingUp },
  { name: "AI", href: "#ai", icon: Bot, action: "ai" },
  { name: "Messages", href: "/messages", icon: MessageSquare },
  { name: "Profile", href: "/user", icon: User },
];

export function MobileNavWrapper() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [showMobileAI, setShowMobileAI] = useState(false);

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm lg:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href) && item.href !== "#ai";

            // AI button
            if (item.action === "ai") {
              return (
                <button
                  key={item.name}
                  onClick={() => setShowMobileAI(true)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors",
                    "text-muted-foreground hover:text-primary"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{item.name}</span>
                </button>
              );
            }

            // Profile - check auth, open modal if not authenticated
            if (item.name === "Profile") {
              if (isAuthenticated && user?.id) {
                return (
                  <Link
                    key={item.name}
                    href={`/user/${user.id}`}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground hover:text-primary"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{item.name}</span>
                  </Link>
                );
              }
              return (
                <button
                  key={item.name}
                  onClick={() => openAuthModal("signin")}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors",
                    "text-muted-foreground hover:text-primary"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{item.name}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile AI Dialog */}
      <Dialog open={showMobileAI} onOpenChange={setShowMobileAI}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden p-0">
          <DialogHeader className="p-4 pb-2 border-b border-border">
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              AI Market Assistant
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(85vh-80px)]">
            <AIMarketAssistant />
          </div>
        </DialogContent>
      </Dialog>

      {/* Spacer for bottom nav - prevents content being hidden */}
      <div className="h-16 lg:hidden" />
    </>
  );
}
