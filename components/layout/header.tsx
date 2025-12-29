"use client";

import type React from "react";
import { useTheme } from "next-themes";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AuthModal } from "@/components/auth/auth-modal";
import {
  Search,
  Menu,
  MessageSquare,
  User,
  LogOut,
  Plus,
  Zap,
  Sun,
  Moon,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getUserAvatarUrl } from "@/lib/utils";
import { NotificationsPopover } from "@/components/layout/notifications-popover";

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"signin" | "signup">(
    "signin"
  );
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="sticky top-0 z-50">
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-2xl border-b border-border/50 w-full" />

      {/* Glow effect at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent" />

      <div className="relative flex h-16 items-center justify-between gap-4 px-4 lg:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg ">
            <svg
              width="68"
              height="63"
              viewBox="0 0 68 63"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="28" y="13" width="14" height="38" fill="#19C63C" />
              <rect x="42" width="13" height="13" fill="#19C63C" />
              <rect x="55" y="13" width="13" height="12" fill="#19C63C" />
              <rect x="41" y="25" width="14" height="13" fill="#19C63C" />
              <rect x="14" y="25" width="14" height="13" fill="#19C63C" />
              <rect y="38" width="14" height="13" fill="#19C63C" />
              <rect x="14" y="51" width="14" height="12" fill="#19C63C" />
            </svg>
          </div>
          <span className="hidden text-xl font-bold sm:block gradient-text ml-2">
            ONPOST
          </span>
        </Link>

        {/* Search bar - centered */}
        <form onSubmit={handleSearch} className="flex-1 max-w-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full pl-10 pr-4 bg-muted/50 border-border rounded-lg focus:bg-muted focus:border-primary"
            />
          </div>
        </form>

        {/* Desktop Navigation - right side */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {isAuthenticated ? (
            <>
              <NotificationsPopover />
              
              <Button variant="ghost" size="icon" asChild className="h-9 w-9">
                <Link href="/messages">
                  <MessageSquare className="h-4 w-4" />
                  <span className="sr-only">Messages</span>
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full border border-border"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage
                        src={getUserAvatarUrl(user)}
                        alt={user?.displayName}
                      />
                      <AvatarFallback className="bg-linear-to-br from-primary to-accent text-primary-foreground text-sm">
                        {user?.displayName?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-48 rounded-lg border-border bg-card"
                >
                  <DropdownMenuItem asChild className="rounded-md focus:bg-primary/10 focus:text-primary dark:focus:bg-primary dark:focus:text-white cursor-pointer transition-colors">
                    <Link href={`/user/${user?.id}`}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-md focus:bg-primary/10 focus:text-primary dark:focus:bg-primary dark:focus:text-white cursor-pointer transition-colors">
                    <Link href="/messages">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Messages
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem
                    onClick={logout}
                    className="rounded-md text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAuthModalTab("signin");
                  setAuthModalOpen(true);
                }}
                className="h-9 px-4"
              >
                Sign In
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setAuthModalTab("signup");
                  setAuthModalOpen(true);
                }}
                className="h-9 px-4 bg-linear-to-r from-primary to-accent"
              >
                Sign Up
              </Button>
              <AuthModal
                open={authModalOpen}
                onOpenChange={setAuthModalOpen}
                defaultTab={authModalTab}
              />
            </>
          )}
        </div>

        {/* Mobile Notifications - visible only when authenticated */}
        {isAuthenticated && (
          <div className="md:hidden shrink-0">
             <NotificationsPopover />
          </div>
        )}

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-9 w-9 shrink-0"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </div>

      {/* Mobile Menu - Fixed Overlay */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop - click to close */}
          <div 
            className="fixed inset-0 top-16 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Menu Content */}
          <div className="fixed left-0 right-0 top-16 z-50 border-b border-border bg-background/95 backdrop-blur-2xl px-4 py-3 md:hidden shadow-lg">
            <nav className="flex flex-col gap-1">
              {/* Theme toggle mobile */}
              <Button
                variant="ghost"
                className="justify-start h-10 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary dark:hover:text-white focus:bg-primary/10 focus:text-primary dark:focus:bg-primary dark:focus:text-white transition-colors"
                onClick={() => {
                  setTheme(theme === "dark" ? "light" : "dark");
                  setMobileMenuOpen(false);
                }}
              >
                {theme === "dark" ? (
                  <>
                    <Sun className="mr-2 h-4 w-4" />
                    Light Mode
                  </>
                ) : (
                  <>
                    <Moon className="mr-2 h-4 w-4" />
                    Dark Mode
                  </>
                )}
              </Button>

              {isAuthenticated ? (
                <>
                  <Button 
                    variant="ghost" 
                    className="justify-start h-10 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary dark:hover:text-white focus:bg-primary/10 focus:text-primary dark:focus:bg-primary dark:focus:text-white transition-colors" 
                    asChild
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link href="/thread/new">
                      <Plus className="mr-2 h-4 w-4" />
                      New Thread
                    </Link>
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="justify-start h-10 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary dark:hover:text-white focus:bg-primary/10 focus:text-primary dark:focus:bg-primary dark:focus:text-white transition-colors" 
                    asChild
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link href="/messages">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Messages
                    </Link>
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="justify-start h-10 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary dark:hover:text-white focus:bg-primary/10 focus:text-primary dark:focus:bg-primary dark:focus:text-white transition-colors" 
                    asChild
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link href={`/user/${user?.id}`}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start h-10 text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive transition-colors"
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    className="justify-start h-10 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary dark:hover:text-white focus:bg-primary/10 focus:text-primary dark:focus:bg-primary dark:focus:text-white transition-colors"
                    onClick={() => {
                      setAuthModalTab("signin");
                      setAuthModalOpen(true);
                      setMobileMenuOpen(false);
                    }}
                  >
                    Sign In
                  </Button>
                  <Button
                    className="justify-start h-10 bg-linear-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                    onClick={() => {
                      setAuthModalTab("signup");
                      setAuthModalOpen(true);
                      setMobileMenuOpen(false);
                    }}
                  >
                    Sign Up
                  </Button>
                </>
              )}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
