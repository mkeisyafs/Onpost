"use client"

import { formatDistanceToNow } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ForumsPrivateMessage } from "@/lib/types"

interface PMListProps {
  messages: ForumsPrivateMessage[]
  selectedId: string | null
  onSelect: (id: string) => void
  folder: "inbox" | "sent"
}

export function PMList({ messages, selectedId, onSelect, folder }: PMListProps) {
  return (
    <div className="space-y-2">
      {messages.map((message) => {
        const isSelected = message.id === selectedId
        const otherUser = folder === "inbox" ? message.sender : message.recipient

        return (
          <Card
            key={message.id}
            className={cn(
              "cursor-pointer transition-colors hover:bg-card/80",
              isSelected && "border-primary bg-primary/5",
              !message.isRead && folder === "inbox" && "border-l-2 border-l-primary",
            )}
            onClick={() => onSelect(message.id)}
          >
            <CardContent className="p-3">
              <div className="flex gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={otherUser?.avatarUrl || undefined} />
                  <AvatarFallback>{otherUser?.displayName?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "truncate text-sm",
                        !message.isRead && folder === "inbox" ? "font-semibold text-foreground" : "text-foreground",
                      )}
                    >
                      {otherUser?.displayName || "Unknown"}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "truncate text-sm",
                      !message.isRead && folder === "inbox" ? "font-medium text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {message.title}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{message.body}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
