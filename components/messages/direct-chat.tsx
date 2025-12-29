"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import forumsApi from "@/lib/forums-api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Send,
  Loader2,
  MessageCircle,
  Smile,
  ImageIcon,
  ThumbsUp,
} from "lucide-react";
import { cn, getUserAvatarUrl } from "@/lib/utils";
import type { ForumsPrivateMessage } from "@/lib/types";

interface ChatUser {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  extendedData?: {
    profilePhoto?: string;
  };
}

interface DirectChatProps {
  recipientUser: ChatUser;
  onBack?: () => void;
  onMessageSent?: () => void;
}

export function DirectChat({ recipientUser, onMessageSent }: DirectChatProps) {
  const { user } = useAuth();
  const [messageBody, setMessageBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localMessages, setLocalMessages] = useState<ForumsPrivateMessage[]>(
    []
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch existing conversation with this user
  const {
    data: inboxData,
    isLoading: inboxLoading,
    mutate: mutateInbox,
  } = useSWR(
    user ? ["messages-with-user", recipientUser.id] : null,
    async () => {
      const inbox = await forumsApi.messages.list({
        folder: "inbox",
        limit: 100,
      });
      const sent = await forumsApi.messages.list({
        folder: "sent",
        limit: 100,
      });

      const allMessages = [
        ...(inbox.privateMessages || []),
        ...(sent.privateMessages || []),
      ];
      const userMessages = allMessages.filter(
        (msg) =>
          msg.senderId === recipientUser.id ||
          msg.recipientId === recipientUser.id
      );

      return userMessages.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    },
    {
      revalidateOnFocus: false,
      refreshInterval: 30000,
      dedupingInterval: 10000,
    }
  );

  // Update local messages when fetched data changes
  useEffect(() => {
    if (inboxData) {
      setLocalMessages(inboxData);
    }
  }, [inboxData]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageBody.trim()) return;

    const tempMessage: ForumsPrivateMessage = {
      id: `temp-${Date.now()}`,
      title: "Chat",
      body: messageBody.trim(),
      senderId: user?.id || "",
      recipientId: recipientUser.id,
      read: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Optimistically add message
    setLocalMessages((prev) => [...prev, tempMessage]);
    setMessageBody("");
    setIsSubmitting(true);

    try {
      await forumsApi.messages.send({
        title: `Chat`,
        body: tempMessage.body,
        recipientId: recipientUser.id,
      });

      setTimeout(() => {
        mutateInbox();
        onMessageSent?.();
      }, 500);
    } catch (err) {
      console.error("Failed to send message:", err);
      setLocalMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle enter key to send
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !isSubmitting &&
      messageBody.trim()
    ) {
      e.preventDefault();
      handleSendMessage(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {inboxLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={cn("flex gap-2", i % 2 === 0 && "flex-row-reverse")}
              >
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                <Skeleton className="h-10 w-40 rounded-[18px]" />
              </div>
            ))}
          </div>
        ) : localMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-4">
            <Avatar className="h-16 w-16 mb-3">
              <AvatarImage src={getUserAvatarUrl(recipientUser as any)} />
              <AvatarFallback className="bg-linear-to-br from-blue-500 to-purple-600 text-white text-xl">
                {recipientUser.displayName?.[0]?.toUpperCase() ||
                  recipientUser.username?.[0]?.toUpperCase() ||
                  "U"}
              </AvatarFallback>
            </Avatar>
            <p className="font-semibold">
              {recipientUser.displayName || recipientUser.username}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Start a conversation
            </p>
          </div>
        ) : (
          <>
            {localMessages.map((msg, index) => {
              const isOwn = msg.senderId === user?.id;
              const showAvatar =
                !isOwn &&
                (index === 0 ||
                  localMessages[index - 1]?.senderId !== msg.senderId);

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex items-end gap-2",
                    isOwn ? "justify-end" : "justify-start"
                  )}
                >
                  {!isOwn && (
                    <div className="w-6">
                      {showAvatar && (
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={getUserAvatarUrl(recipientUser as any)}
                          />
                          <AvatarFallback className="text-[10px] bg-linear-to-br from-blue-500 to-purple-600 text-white">
                            {recipientUser.displayName?.[0]?.toUpperCase() ||
                              "?"}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[70%] rounded-[18px] px-3 py-1.5",
                      isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area - Messenger Style */}
      <div className="border-t border-border p-2">
        <form onSubmit={handleSendMessage} className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-primary shrink-0"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-primary shrink-0"
          >
            <Smile className="h-4 w-4" />
          </Button>

          <Input
            placeholder="Aa"
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            onKeyDown={handleKeyPress}
            className="flex-1 h-9 rounded-full bg-muted border-0 text-sm"
            disabled={isSubmitting}
          />

          {messageBody.trim() ? (
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              disabled={isSubmitting}
              className="h-8 w-8 rounded-full text-primary shrink-0"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-primary shrink-0"
            >
              <ThumbsUp className="h-4 w-4" />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
