"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bot,
  Send,
  Loader2,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageSquare,
  User,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice, KNOWN_GAME_TAGS } from "@/lib/assistant-utils";
import type {
  AssistantResponse,
  AssistantListing,
} from "@/lib/assistant-utils";
import { CommentModal } from "@/components/post/comment-modal";
import forumsApi from "@/lib/forums-api";
import { useAuth } from "@/lib/auth-context";
import { useAuthModal } from "@/lib/auth-modal-context";
import type { ForumsPost } from "@/lib/types";

// ============================================
// Types
// ============================================

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: AssistantResponse;
  timestamp: string; // Changed to string for localStorage
}

const STORAGE_KEY = "ai_assistant_messages";

// ============================================
// Component
// ============================================

export function AIMarketAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedListing, setSelectedListing] =
    useState<AssistantListing | null>(null);
  const [selectedPost, setSelectedPost] = useState<ForumsPost | null>(null);
  const [isLoadingPost, setIsLoadingPost] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();

  // Detect mobile on mount and handle resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load messages from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed);
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save messages to localStorage when they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll within the chat area only
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  // Clear chat history
  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Handle submit
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const query = input.trim();
    if (!query || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: query,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Build conversation history for context
      const conversationHistory = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          conversationHistory,
        }),
      });

      const data: AssistantResponse = await response.json();

      // Add assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message || data.summary || "Here's what I found:",
        response: data,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle quick tag selection
  const handleTagSelect = (tag: string) => {
    setInput(`find cheapest ${tag} account`);
  };

  // Handle listing click - fetch post and user, then open comment modal
  const handleListingClick = async (listing: AssistantListing) => {
    setSelectedListing(listing);
    setIsLoadingPost(true);

    try {
      // Fetch the full post details
      const post = await forumsApi.posts.get(listing.postId);

      // Fetch author data if not embedded
      if (!post.author && !post.user && (post.authorId || post.userId)) {
        try {
          const authorId = post.authorId || post.userId;
          const author = await forumsApi.users.get(authorId!);
          // Attach author to post
          post.author = author;
        } catch (userError) {
          console.error("Failed to fetch author:", userError);
          // Continue without author data
        }
      }

      setSelectedPost(post);
    } catch (error) {
      console.error("Failed to fetch post:", error);
      // Still show the listing modal even if post fetch fails
    } finally {
      setIsLoadingPost(false);
    }
  };

  // Close modal
  const handleCloseModal = () => {
    setSelectedListing(null);
    setSelectedPost(null);
  };

  return (
    <>
      <Card className="border-border bg-card overflow-hidden">
        {/* Header */}
        <CardHeader
          className="py-3 px-4 cursor-pointer lg:cursor-default"
          onClick={() => isMobile && setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-5 w-5 text-primary" />
              AI Market Assistant
            </CardTitle>
            <div className="flex items-center gap-1">
              {/* Clear chat button */}
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearChat();
                  }}
                  title="Clear chat"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              )}
              {isMobile && (
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  {isCollapsed ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Ask about prices, listings, or market trends.
          </p>
        </CardHeader>

        {/* Content - hidden on mobile when collapsed */}
        <CardContent
          className={cn("px-4 pb-4 pt-0", isMobile && isCollapsed && "hidden")}
        >
          {/* Messages Area */}
          <ScrollArea ref={scrollAreaRef} className="h-[280px] pr-2 mb-3">
            {messages.length === 0 ? (
              <div className="space-y-3">
                {/* Placeholder suggestions */}
                <p className="text-xs text-muted-foreground">Try asking:</p>
                <div className="space-y-2">
                  {[
                    "Find the cheapest Nike shoes",
                    "Cari sepatu New Balance",
                    "Show iPhone listings",
                    "Analyze Genshin account prices",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="block w-full text-left text-xs text-primary hover:underline"
                    >
                      → {suggestion}
                    </button>
                  ))}
                </div>

                {/* Quick tags */}
                <div className="pt-3 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-2">
                    Popular categories:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { value: "shoes", label: "Shoes" },
                      { value: "electronics", label: "Electronics" },
                      { value: "genshin-impact", label: "Genshin" },
                      { value: "mobile-legends", label: "ML" },
                    ].map((tag) => (
                      <Badge
                        key={tag.value}
                        variant="outline"
                        className="text-xs cursor-pointer hover:bg-primary/10"
                        onClick={() => handleTagSelect(tag.label)}
                      >
                        {tag.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onListingClick={handleListingClick}
                  />
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs">Analyzing...</span>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input - Requires Sign In */}
          {isAuthenticated ? (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about prices, listings..."
                disabled={isLoading}
                className="text-sm h-9"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
                className="h-9 w-9 shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          ) : (
            <div className="text-center py-2 px-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm text-muted-foreground mb-2">
                Sign in to use AI Assistant
              </p>
              <button
                onClick={() => openAuthModal("signin")}
                className="text-sm text-primary hover:underline font-medium"
              >
                Sign In →
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comment Modal - shows when we have the post */}
      {selectedPost && (
        <CommentModal
          post={selectedPost}
          isOpen={true}
          onClose={handleCloseModal}
        />
      )}

      {/* Loading/Fallback Modal - shows while loading or if post fetch fails */}
      {selectedListing && !selectedPost && (
        <PostPreviewModal
          listing={selectedListing}
          isLoading={isLoadingPost}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}

// ============================================
// Message Bubble
// ============================================

function MessageBubble({
  message,
  onListingClick,
}: {
  message: Message;
  onListingClick: (listing: AssistantListing) => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-primary text-primary-foreground text-sm rounded-lg px-3 py-2 max-w-[85%]">
          {message.content}
        </div>
      </div>
    );
  }

  const response = message.response;

  // Clarification response
  if (response?.type === "CLARIFICATION") {
    return (
      <div className="space-y-2">
        <div className="bg-muted text-sm rounded-lg px-3 py-2">
          {response.message}
        </div>
        {response.options && (
          <div className="flex flex-wrap gap-1.5 pl-2">
            {response.options.map((option) => (
              <Badge
                key={option}
                variant="outline"
                className="text-xs cursor-pointer hover:bg-primary/10"
              >
                {option}
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Error response
  if (response?.type === "error") {
    return (
      <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-3 py-2">
        {response.message}
      </div>
    );
  }

  // CHAT_RESPONSE - show message first, then any listings
  if (response?.type === "CHAT_RESPONSE") {
    return (
      <div className="space-y-2">
        {/* AI Message */}
        <div className="bg-muted text-sm rounded-lg px-3 py-2 whitespace-pre-wrap">
          {message.content}
        </div>

        {/* Listings if available */}
        {response?.listings && response.listings.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Related listings:</p>
            {response.listings.slice(0, 5).map((listing) => (
              <ListingCard
                key={listing.postId}
                listing={listing}
                onClick={() => onListingClick(listing)}
              />
            ))}
          </div>
        )}

        {/* Metadata */}
        {response?.matched !== undefined && response.matched > 0 && (
          <p className="text-xs text-muted-foreground pl-2">
            📊 Found {response.matched} relevant posts
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Listings (structured first) */}
      {response?.listings && response.listings.length > 0 && (
        <div className="space-y-1.5">
          {response.listings.slice(0, 5).map((listing) => (
            <ListingCard
              key={listing.postId}
              listing={listing}
              onClick={() => onListingClick(listing)}
            />
          ))}
          {response.listings.length > 5 && (
            <p className="text-xs text-muted-foreground pl-2">
              + {response.listings.length - 5} more results
            </p>
          )}
        </div>
      )}

      {/* Stats */}
      {response?.stats && response.stats.count > 0 && (
        <StatsCard
          stats={response.stats}
          windowDays={response.windowDays}
          tag={response.tag}
        />
      )}

      {/* Summary (narrative second) */}
      <div className="bg-muted text-sm rounded-lg px-3 py-2">
        {message.content}
      </div>

      {/* Metadata */}
      {response?.matched !== undefined && (
        <p className="text-xs text-muted-foreground pl-2">
          Analyzed {response.scanned} posts → {response.matched} matched
        </p>
      )}
    </div>
  );
}

// ============================================
// Listing Card (Clickable)
// ============================================

function ListingCard({
  listing,
  onClick,
}: {
  listing: AssistantListing;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full text-left p-2.5 rounded-lg border border-border bg-background hover:bg-muted/50 hover:border-primary/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {listing.price
              ? formatPrice(listing.price, listing.currency)
              : "Price unlisted"}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {listing.seller.displayName === "View Seller"
              ? "Tap to view seller"
              : `by @${listing.seller.displayName}`}
          </p>
        </div>
        <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0" />
      </div>
      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
        {listing.description}
      </p>
    </button>
  );
}

// ============================================
// Post Preview Modal (Fallback/Loading)
// ============================================

function PostPreviewModal({
  listing,
  isLoading,
  onClose,
}: {
  listing: AssistantListing;
  isLoading: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-primary" />
            Post Details
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Price */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <span className="text-sm text-muted-foreground">Price</span>
              <span className="text-xl font-bold text-primary">
                {listing.price
                  ? formatPrice(listing.price, listing.currency)
                  : "Contact seller"}
              </span>
            </div>

            {/* Seller */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">@{listing.seller.displayName}</p>
                <p className="text-xs text-muted-foreground">Seller</p>
              </div>
            </div>

            {/* Description */}
            <div className="p-3 rounded-lg border border-border">
              <p className="text-sm whitespace-pre-wrap">
                {listing.description}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Stats Card
// ============================================

function StatsCard({
  stats,
  windowDays,
  tag,
}: {
  stats: {
    min: number | null;
    median: number | null;
    max: number | null;
    count: number;
  };
  windowDays?: number;
  tag?: string | null;
}) {
  return (
    <div className="p-2.5 rounded-lg border border-border bg-background">
      <div className="flex items-center gap-1.5 text-xs font-medium mb-2">
        <TrendingUp className="h-3.5 w-3.5 text-primary" />
        Price Stats ({stats.count} listings)
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Min</p>
          <p className="text-sm font-medium text-green-600">
            {stats.min ? formatPrice(stats.min) : "-"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Median</p>
          <p className="text-sm font-medium">
            {stats.median ? formatPrice(stats.median) : "-"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Max</p>
          <p className="text-sm font-medium text-orange-600">
            {stats.max ? formatPrice(stats.max) : "-"}
          </p>
        </div>
      </div>
      {windowDays && (
        <p className="text-xs text-muted-foreground text-center mt-1.5">
          Last {windowDays} days
        </p>
      )}
    </div>
  );
}
