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
      <div className="absolute inset-0 bg-background/80 backdrop-blur-2xl border-b border-border/50" />

      {/* Glow effect at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent" />

      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-primary to-accent shadow-lg shadow-primary/25">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="hidden text-xl font-bold sm:block gradient-text">
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
              <Button variant="ghost" size="sm" asChild className="h-9">
                <Link href="/thread/new">
                  <Plus className="h-4 w-4 mr-1" />
                  New Thread
                </Link>
              </Button>

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
                        src={user?.avatarUrl || undefined}
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
                  <DropdownMenuItem asChild className="rounded-md">
                    <Link href={`/user/${user?.id}`}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-md">
                    <Link href="/messages">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Messages
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem
                    onClick={logout}
                    className="rounded-md text-destructive focus:text-destructive"
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

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="relative border-t border-border bg-background/95 backdrop-blur-2xl px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {/* Theme toggle mobile */}
            <Button
              variant="ghost"
              className="justify-start h-10"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
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
                <Button variant="ghost" className="justify-start h-10" asChild>
                  <Link href="/thread/new">
                    <Plus className="mr-2 h-4 w-4" />
                    New Thread
                  </Link>
                </Button>
                <Button variant="ghost" className="justify-start h-10" asChild>
                  <Link href="/messages">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Messages
                  </Link>
                </Button>
                <Button variant="ghost" className="justify-start h-10" asChild>
                  <Link href={`/user/${user?.id}`}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start h-10 text-destructive hover:text-destructive"
                  onClick={logout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="justify-start h-10"
                  onClick={() => {
                    setAuthModalTab("signin");
                    setAuthModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                >
                  Sign In
                </Button>
                <Button
                  className="justify-start h-10 bg-linear-to-r from-primary to-accent"
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
      )}
    </header>
  );
}
