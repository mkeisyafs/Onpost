"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { X, Search, ArrowLeft } from "lucide-react";
import { DirectChat } from "./direct-chat";
import { getUserAvatarUrl } from "@/lib/utils";

interface SearchUser {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  extendedData?: {
    profilePhoto?: string;
  };
}

interface NewMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMessageSent?: () => void;
  onSelectUser?: (user: SearchUser) => void;
}

export function NewMessageModal({
  open,
  onOpenChange,
  onMessageSent,
  onSelectUser,
}: NewMessageModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);

  // Search users via our Next.js API route
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setUsers([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const response = await fetch(
        `/api/users/search?q=${encodeURIComponent(query.trim())}`
      );
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Failed to search users:", error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce effect - 600ms delay
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setUsers([]);
      setHasSearched(false);
      return;
    }

    const timeout = setTimeout(() => {
      searchUsers(searchQuery);
    }, 600);

    return () => clearTimeout(timeout);
  }, [searchQuery, searchUsers]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setUsers([]);
      setHasSearched(false);
      setSelectedUser(null);
    }
  }, [open]);

  const handleSelectUser = (user: SearchUser) => {
    // If callback provided, use it to select user in parent page
    if (onSelectUser) {
      onSelectUser(user);
      onOpenChange(false);
    } else {
      // Fallback to old behavior - show chat in modal
      setSelectedUser(user);
    }
  };

  const handleBack = () => {
    setSelectedUser(null);
  };

  const handleMessageSent = () => {
    onMessageSent?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`p-0 gap-0 overflow-hidden transition-all ${
          selectedUser ? "sm:max-w-lg" : "sm:max-w-md"
        }`}
      >
        {!selectedUser ? (
          // SEARCH VIEW
          <>
            <DialogHeader className="p-4 border-b">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => onOpenChange(false)}
                  className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
                <DialogTitle className="text-center flex-1">
                  New Message
                </DialogTitle>
                <div className="w-6" />
              </div>
            </DialogHeader>

            <div className="p-4 border-b">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">To:</span>
                <div className="flex-1">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search username..."
                    className="h-9 bg-transparent border-0 focus-visible:ring-0 px-0 text-sm"
                    autoFocus
                  />
                </div>
              </div>
              {searchQuery.length > 0 && searchQuery.length < 2 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Type at least 2 characters
                </p>
              )}
            </div>

            <ScrollArea className="max-h-[400px]">
              <div className="py-2">
                {isLoading && (
                  <div className="space-y-1">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <Skeleton className="h-11 w-11 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-1" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!isLoading && users.length > 0 && (
                  <div className="space-y-1">
                    {users.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleSelectUser(user)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                      >
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={getUserAvatarUrl(user as any)} />
                          <AvatarFallback className="bg-primary/10">
                            {user.displayName?.[0]?.toUpperCase() ||
                              user.username?.[0]?.toUpperCase() ||
                              "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-foreground truncate block">
                            {user.displayName || user.username}
                          </span>
                          {user.username && (
                            <p className="text-sm text-muted-foreground truncate">
                              @{user.username}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {!isLoading && hasSearched && users.length === 0 && (
                  <div className="py-12 text-center px-4">
                    <Search className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No users found for "{searchQuery}"
                    </p>
                  </div>
                )}

                {!isLoading && !hasSearched && (
                  <div className="py-12 text-center">
                    <Search className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Search for a user to message
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          // CHAT VIEW
          <>
            <DialogHeader className="p-4 border-b">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleBack}
                  className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <DialogTitle className="text-center flex-1">
                  {selectedUser.displayName || selectedUser.username}
                </DialogTitle>
                <button
                  onClick={() => onOpenChange(false)}
                  className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </DialogHeader>

            <div className="h-[500px]">
              <DirectChat
                recipientUser={selectedUser}
                onBack={handleBack}
                onMessageSent={handleMessageSent}
              />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
