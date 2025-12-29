"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import useSWR from "swr";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { useAuthModal } from "@/lib/auth-modal-context";
import forumsApi from "@/lib/forums-api";
import { NewMessageModal } from "@/components/messages/new-message-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Plus,
  MessageCircle,
  Send,
  Loader2,
  Search,
  ImageIcon,
  ThumbsUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ForumsPrivateMessage } from "@/lib/types";

interface ConversationUser {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string | null;
}

interface Conversation {
  id: string;
  user: ConversationUser;
  lastMessage: ForumsPrivateMessage;
  unread: boolean;
  allMessages: ForumsPrivateMessage[];
}

export default function MessagesPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingMessages, setPendingMessages] = useState<
    ForumsPrivateMessage[]
  >([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Fetch ALL messages once and group by conversation
  const {
    data: allData,
    isLoading,
    mutate,
  } = useSWR(
    isAuthenticated && user?.id ? ["all-messages", user.id] : null,
    async () => {
      console.log("Fetching all messages...");
      const [inbox, sent] = await Promise.all([
        forumsApi.messages.list({ folder: "inbox", limit: 100 }),
        forumsApi.messages.list({ folder: "sent", limit: 100 }),
      ]);

      console.log("Inbox response:", inbox);
      console.log("Sent response:", sent);

      // Combine all messages
      const combinedMessages = [
        ...(inbox.privateMessages || []),
        ...(sent.privateMessages || []),
      ];

      // De-duplicate messages by ID (same message can appear in both inbox and sent)
      const messageMap = new Map<string, ForumsPrivateMessage>();
      for (const msg of combinedMessages) {
        if (!messageMap.has(msg.id)) {
          messageMap.set(msg.id, msg);
        }
      }
      const allMessages = Array.from(messageMap.values());

      console.log("Total messages after dedup:", allMessages.length);
      console.log("All messages:", allMessages);
      console.log("Current user ID:", user?.id);

      // Group by conversation partner
      const conversationMap = new Map<string, Conversation>();

      for (const msg of allMessages) {
        const otherUserId =
          msg.senderId === user?.id ? msg.recipientId : msg.senderId;
        const otherUser =
          msg.senderId === user?.id ? msg.recipient : msg.sender;

        // Skip if we can't determine the other user ID
        if (!otherUserId) {
          console.log("Skipping message - no otherUserId:", msg.id);
          continue;
        }

        const existing = conversationMap.get(otherUserId);

        if (!existing) {
          // Create a placeholder user if the user object is not populated
          const conversationUser: ConversationUser = otherUser
            ? {
                id: otherUserId,
                username: otherUser.username || "User",
                displayName: otherUser.displayName,
                avatarUrl: otherUser.avatarUrl,
              }
            : {
                id: otherUserId,
                username: "User",
                displayName: undefined,
                avatarUrl: undefined,
              };

          conversationMap.set(otherUserId, {
            id: otherUserId,
            user: conversationUser,
            lastMessage: msg,
            unread: msg.recipientId === user?.id && !(msg.read ?? msg.isRead),
            allMessages: [msg],
          });
        } else {
          existing.allMessages.push(msg);
          if (
            new Date(msg.createdAt) > new Date(existing.lastMessage.createdAt)
          ) {
            existing.lastMessage = msg;
          }
          if (msg.recipientId === user?.id && !(msg.read ?? msg.isRead)) {
            existing.unread = true;
          }
          // Update user info if we have better data
          if (
            otherUser &&
            !existing.user.displayName &&
            otherUser.displayName
          ) {
            existing.user.displayName = otherUser.displayName;
            existing.user.username =
              otherUser.username || existing.user.username;
            existing.user.avatarUrl = otherUser.avatarUrl;
          }
        }
      }

      // Sort messages within each conversation
      for (const conv of conversationMap.values()) {
        conv.allMessages.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }

      // Sort conversations by last message
      const conversations = Array.from(conversationMap.values()).sort(
        (a, b) =>
          new Date(b.lastMessage.createdAt).getTime() -
          new Date(a.lastMessage.createdAt).getTime()
      );

      // Fetch user data for conversations that only have placeholder names
      const usersToFetch = conversations.filter(
        (conv) => conv.user.username === "User" && !conv.user.displayName
      );

      if (usersToFetch.length > 0) {
        console.log(
          "Fetching user data for:",
          usersToFetch.map((c) => c.user.id)
        );
        try {
          const userPromises = usersToFetch.map((conv) =>
            forumsApi.users.get(conv.user.id).catch(() => null)
          );
          const users = await Promise.all(userPromises);

          users.forEach((userData, index) => {
            if (userData) {
              const conv = usersToFetch[index];
              conv.user.username = userData.username || conv.user.username;
              conv.user.displayName = userData.displayName;
              conv.user.avatarUrl = userData.avatarUrl;
            }
          });
        } catch (error) {
          console.error("Failed to fetch user data:", error);
        }
      }

      console.log("Conversations:", conversations.length);
      return conversations;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000, // Don't refetch for 10 seconds
    }
  );

  // Get selected conversation
  const selectedConversation = allData?.find((c) => c.id === selectedUserId);

  // Get messages for selected conversation (from cached data + pending)
  const chatMessages = selectedConversation
    ? [
        ...selectedConversation.allMessages,
        ...pendingMessages.filter((pm) => pm.recipientId === selectedUserId),
      ]
    : [];

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      (!messageBody.trim() && !selectedImage) ||
      !selectedConversation ||
      !user?.id
    )
      return;

    // Build message body with image if present
    let finalBody = messageBody.trim();
    let imageDataUrl = "";

    if (selectedImageFile) {
      // Convert image to base64 data URL for display
      const reader = new FileReader();
      imageDataUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(selectedImageFile);
      });
    }

    const tempMessage: ForumsPrivateMessage = {
      id: `pending-${Date.now()}`,
      title: "Chat",
      body: finalBody || (imageDataUrl ? "📷 Image" : ""),
      senderId: user.id,
      recipientId: selectedConversation.user.id,
      read: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      extendedData: imageDataUrl ? { imageUrl: imageDataUrl } : undefined,
    };

    // Add to pending immediately
    setPendingMessages((prev) => [...prev, tempMessage]);
    setMessageBody("");
    clearSelectedImage();
    setIsSending(true);

    try {
      // Send message with extendedData for image
      await forumsApi.messages.send({
        title: `Chat`,
        body: finalBody || (imageDataUrl ? "📷 Image" : ""),
        recipientId: selectedConversation.user.id,
        extendedData: imageDataUrl ? { imageUrl: imageDataUrl } : undefined,
      });

      console.log("Message sent successfully");

      // Refresh data after 2 seconds
      setTimeout(() => {
        mutate();
        setPendingMessages([]);
      }, 2000);
    } catch (error) {
      console.error("Failed to send message:", error);
      setPendingMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
    } finally {
      setIsSending(false);
    }
  };

  // Send quick emoji (thumbs up)
  const sendQuickEmoji = async (emoji: string) => {
    if (!selectedConversation || !user?.id || isSending) return;

    const tempMessage: ForumsPrivateMessage = {
      id: `pending-${Date.now()}`,
      title: "Chat",
      body: emoji,
      senderId: user.id,
      recipientId: selectedConversation.user.id,
      read: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setPendingMessages((prev) => [...prev, tempMessage]);
    setIsSending(true);

    try {
      await forumsApi.messages.send({
        title: "Chat",
        body: emoji,
        recipientId: selectedConversation.user.id,
      });

      setTimeout(() => {
        mutate();
        setPendingMessages([]);
      }, 2000);
    } catch (error) {
      console.error("Failed to send emoji:", error);
      setPendingMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
    } finally {
      setIsSending(false);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !isSending &&
      (messageBody.trim() || selectedImage)
    ) {
      e.preventDefault();
      handleSendMessage(e as unknown as React.FormEvent);
    }
  };

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setSelectedImage(previewUrl);
      setSelectedImageFile(file);
    }
  };

  // Clear selected image
  const clearSelectedImage = () => {
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage);
    }
    setSelectedImage(null);
    setSelectedImageFile(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  // Filter conversations by search
  const filteredConversations = allData?.filter((conv) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.user.displayName?.toLowerCase().includes(query) ||
      conv.user.username.toLowerCase().includes(query)
    );
  });

  if (authLoading) {
    return <MessagesPageSkeleton />;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Your Messages</h2>
            <p className="text-muted-foreground mb-6">
              Sign in to send and receive private messages
            </p>
            <Button size="lg" onClick={() => openAuthModal("signin")}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] min-h-[600px] flex">
      {/* Left: Conversation List */}
      <div className="w-[360px] border-r border-border flex flex-col bg-card shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold text-foreground">Chats</h1>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => mutate()}
                className="h-9 w-9 rounded-full"
                title="Refresh"
              ></Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowNewMessage(true)}
                className="h-9 w-9 rounded-full bg-muted"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Messenger"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-muted/50 rounded-full border-0"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-2 space-y-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-28 mb-2" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations && filteredConversations.length > 0 ? (
            <div className="p-2">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedUserId(conv.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors",
                    selectedUserId === conv.id
                      ? "bg-primary/10"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className="relative">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={conv.user.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/20 text-lg">
                        {conv.user.displayName?.[0]?.toUpperCase() ||
                          conv.user.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-green-500 border-2 border-card" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "font-semibold truncate text-[15px]",
                          conv.unread && "text-foreground"
                        )}
                      >
                        {conv.user.displayName || conv.user.username}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <p
                        className={cn(
                          "text-[13px] truncate flex-1",
                          conv.unread
                            ? "text-foreground font-semibold"
                            : "text-muted-foreground"
                        )}
                      >
                        {conv.lastMessage.senderId === user?.id ? "You: " : ""}
                        {conv.lastMessage.extendedData?.imageUrl ||
                        conv.lastMessage.body.includes("📷") ||
                        conv.lastMessage.body.includes("[Image attached]") ||
                        conv.lastMessage.body.startsWith("[Image]")
                          ? "📷 Image"
                          : conv.lastMessage.body.slice(0, 35)}
                      </p>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        ·{" "}
                        {formatDistanceToNow(
                          new Date(conv.lastMessage.createdAt),
                          { addSuffix: false }
                        )}
                      </span>
                    </div>
                  </div>
                  {conv.unread && (
                    <div className="h-3 w-3 rounded-full bg-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <MessageCircle className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-sm">
                No conversations yet
              </p>
              <Button
                variant="link"
                className="mt-2 text-primary"
                onClick={() => setShowNewMessage(true)}
              >
                Start a new chat
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Right: Chat Area */}
      <div className="flex-1 flex flex-col bg-background">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-card">
              <Link
                href={`/user/${selectedConversation.user.id}`}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={selectedConversation.user.avatarUrl || undefined}
                    />
                    <AvatarFallback className="bg-primary/20">
                      {selectedConversation.user.displayName?.[0]?.toUpperCase() ||
                        selectedConversation.user.username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
                </div>
                <div>
                  <p className="font-semibold text-[15px] hover:underline">
                    {selectedConversation.user.displayName ||
                      selectedConversation.user.username}
                  </p>
                  <p className="text-xs text-muted-foreground">Active now</p>
                </div>
              </Link>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Avatar className="h-20 w-20 mb-4">
                    <AvatarImage
                      src={selectedConversation.user.avatarUrl || undefined}
                    />
                    <AvatarFallback className="bg-primary/20 text-2xl">
                      {selectedConversation.user.displayName?.[0]?.toUpperCase() ||
                        selectedConversation.user.username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-semibold text-lg">
                    {selectedConversation.user.displayName ||
                      selectedConversation.user.username}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start a conversation
                  </p>
                </div>
              ) : (
                <>
                  {chatMessages.map((msg, index) => {
                    const isOwn = msg.senderId === user?.id;
                    const showAvatar =
                      !isOwn &&
                      (index === 0 ||
                        chatMessages[index - 1]?.senderId !== msg.senderId);
                    const isPending = msg.id.startsWith("pending-");

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex items-end gap-2",
                          isOwn ? "justify-end" : "justify-start"
                        )}
                      >
                        {!isOwn && (
                          <div className="w-7">
                            {showAvatar && (
                              <Avatar className="h-7 w-7">
                                <AvatarImage
                                  src={
                                    selectedConversation.user.avatarUrl ||
                                    undefined
                                  }
                                />
                                <AvatarFallback className="text-xs bg-primary/20">
                                  {selectedConversation.user.displayName?.[0]?.toUpperCase() ||
                                    "?"}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        )}
                        <div
                          className={cn(
                            "max-w-[65%] rounded-[18px] overflow-hidden",
                            isOwn
                              ? isPending
                                ? "bg-primary/80 text-primary-foreground"
                                : "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}
                        >
                          {/* Check if message has image in extendedData or body */}
                          {msg.extendedData?.imageUrl ? (
                            // Render image from extendedData
                            <>
                              <img
                                src={msg.extendedData.imageUrl}
                                alt="Shared image"
                                className="max-w-full"
                              />
                              {msg.body && msg.body !== "📷 Image" && (
                                <p className="text-[15px] whitespace-pre-wrap leading-snug px-3 py-2">
                                  {msg.body}
                                </p>
                              )}
                            </>
                          ) : msg.body.startsWith("[Image]") ? (
                            <>
                              {/* Extract and render image for old pending format */}
                              {(() => {
                                const parts = msg.body.split("\n");
                                const dataUrl = parts[1];
                                const text = parts.slice(2).join("\n").trim();
                                return (
                                  <>
                                    {dataUrl &&
                                      dataUrl.startsWith("data:image") && (
                                        <img
                                          src={dataUrl}
                                          alt="Shared image"
                                          className="max-w-full"
                                        />
                                      )}
                                    {text && (
                                      <p className="text-[15px] whitespace-pre-wrap leading-snug px-3 py-2">
                                        {text}
                                      </p>
                                    )}
                                  </>
                                );
                              })()}
                            </>
                          ) : (
                            <p className="text-[15px] whitespace-pre-wrap leading-snug px-3 py-2">
                              {msg.body}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input - Messenger Style */}
            <div className="px-3 py-2 border-t border-border bg-card">
              {/* Image Preview */}
              {selectedImage && (
                <div className="mb-2 relative inline-block">
                  <img
                    src={selectedImage}
                    alt="Selected"
                    className="max-h-32 rounded-lg border border-border"
                  />
                  <button
                    type="button"
                    onClick={clearSelectedImage}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />

              <form
                onSubmit={handleSendMessage}
                className="flex items-center gap-2"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => imageInputRef.current?.click()}
                  className="h-9 w-9 rounded-full text-primary shrink-0"
                >
                  <ImageIcon className="h-5 w-5" />
                </Button>

                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    placeholder="Aa"
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="rounded-full bg-muted border-0 pr-10"
                    disabled={isSending}
                  />
                </div>

                {messageBody.trim() || selectedImage ? (
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon"
                    disabled={isSending}
                    className="h-9 w-9 rounded-full text-primary shrink-0"
                  >
                    {isSending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-primary shrink-0"
                    disabled={isSending}
                    onClick={() => sendQuickEmoji("👍")}
                  >
                    <ThumbsUp className="h-5 w-5" />
                  </Button>
                )}
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-muted/20">
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <MessageCircle className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Your Messages</h2>
            <p className="text-muted-foreground mb-6 max-w-[320px]">
              Send private messages to a friend or group
            </p>
            <Button
              size="lg"
              onClick={() => setShowNewMessage(true)}
              className="rounded-full px-6"
            >
              Send Message
            </Button>
          </div>
        )}
      </div>

      {/* New Message Modal */}
      <NewMessageModal
        open={showNewMessage}
        onOpenChange={setShowNewMessage}
        onMessageSent={() => mutate()}
      />
    </div>
  );
}

function MessagesPageSkeleton() {
  return (
    <div className="h-[calc(100vh-120px)] min-h-[600px] flex">
      <div className="w-[360px] border-r p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <Skeleton className="h-10 w-full rounded-full" />
        <div className="space-y-2 pt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-28 mb-2" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Skeleton className="h-24 w-24 rounded-full mx-auto mb-4" />
          <Skeleton className="h-6 w-32 mx-auto mb-2" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </div>
    </div>
  );
}
