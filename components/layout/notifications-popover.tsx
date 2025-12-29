"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { formatDistanceToNow } from "date-fns";
import { Bell, Check, CheckCheck, Loader2, MessageSquare, AtSign, Heart } from "lucide-react";
import forumsApi from "@/lib/forums-api";
import { useAuth } from "@/lib/auth-context";
import { cn, getUserAvatarUrl } from "@/lib/utils";
import { ForumsNotification } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function NotificationsPopover() {
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");

  const { data, error, isLoading, mutate } = useSWR(
    isAuthenticated ? ["notifications", activeTab] : null,
    () => forumsApi.notifications.list({ read: activeTab === "unread" ? false : undefined, limit: 20 }),
    {
      refreshInterval: 30000, 
      revalidateOnFocus: true,
    }
  );

  const notifications = data?.data || [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await forumsApi.notifications.markRead(id);
      mutate();
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await forumsApi.notifications.markAllRead();
      mutate();
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  // Helper to get icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "MENTION":
        return <AtSign className="h-4 w-4 text-blue-500" />;
      case "REPLY":
      case "THREAD_REPLY":
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case "LIKE":
        return <Heart className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4 text-primary" />;
    }
  };

  const getNotificationLink = (notification: ForumsNotification) => {
    const { threadId, postId } = notification.data || {};
    if (postId && threadId) return `/thread/${threadId}#post-${postId}`;
    if (threadId) return `/thread/${threadId}`;
    return "#";
  };

  const getNotificationContent = (notification: ForumsNotification) => {
    const { type, data } = notification;
    const notifierName = data?.notifier?.displayName || "Someone";
    
    switch (type) {
      case "MENTION":
        return (
          <span>
            <span className="font-semibold">{notifierName}</span> mentioned you in a post
          </span>
        );
      case "REPLY":
        return (
          <span>
             <span className="font-semibold">{notifierName}</span> replied to your comment
          </span>
        );
      case "THREAD_REPLY":
        return (
          <span>
             <span className="font-semibold">{notifierName}</span> posted in your thread
          </span>
        );
      case "LIKE":
        return (
          <span>
             <span className="font-semibold">{notifierName}</span> liked your post
          </span>
        );
      default:
        return (
          <span>
            New notification from <span className="font-semibold">{notifierName}</span>
          </span>
        );
    }
  };

  if (!isAuthenticated) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b p-4">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-primary"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[300px]">
          {error ? (
             <div className="flex h-full flex-col items-center justify-center p-4 text-center text-red-500">
              <Bell className="mb-2 h-8 w-8 opacity-20" />
              <p>Failed to load notifications</p>
              <Button variant="link" onClick={() => mutate()} className="mt-2">Retry</Button>
            </div>
          ) : isLoading ? (
            <div className="flex h-full items-center justify-center p-4 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <Bell className="mb-2 h-8 w-8 opacity-20" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex gap-3 border-b p-4 transition-colors hover:bg-muted/50",
                    !notification.read && "bg-muted/20"
                  )}
                >
                  <Avatar className="h-9 w-9 border">
                    <AvatarImage src={getUserAvatarUrl(notification.data?.notifier)} />
                    <AvatarFallback>{notification.data?.notifier?.displayName?.charAt(0) || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <Link 
                      href={getNotificationLink(notification)} 
                      onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                      className="block text-sm leading-none hover:underline"
                    >
                      {getNotificationContent(notification)}
                    </Link>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                       {notification.data?.preview}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                       <span className="text-xs text-muted-foreground">
                         {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                       </span>
                       {!notification.read && (
                         <Button
                           variant="ghost"
                           size="icon"
                           className="h-5 w-5 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary"
                           onClick={() => handleMarkAsRead(notification.id)}
                           title="Mark as read"
                         >
                           <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                         </Button>
                       )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
             <div className="border-t bg-muted/20 p-2 text-center">
                 <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                    <Link href="/notifications">View all notifications</Link>
                 </Button>
             </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
