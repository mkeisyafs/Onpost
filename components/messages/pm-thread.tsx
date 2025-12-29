"use client"

import type React from "react"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { formatDistanceToNow } from "date-fns"
import { useAuth } from "@/lib/auth-context"
import forumsApi from "@/lib/forums-api"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Send, Trash } from "lucide-react"
import { cn, getUserAvatarUrl } from "@/lib/utils"
import Link from "next/link"

interface PMThreadProps {
  messageId: string
  onReply?: () => void
}

export function PMThread({ messageId, onReply }: PMThreadProps) {
  const { user } = useAuth()
  const [replyBody, setReplyBody] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch message and thread
  const {
    data: message,
    error: messageError,
    isLoading: messageLoading,
    mutate: mutateMessage,
  } = useSWR(["message", messageId], () => forumsApi.messages.get(messageId), {
    revalidateOnFocus: false,
  })

  const {
    data: thread,
    error: threadError,
    isLoading: threadLoading,
    mutate: mutateThread,
  } = useSWR(["message-thread", messageId], () => forumsApi.messages.getThread(messageId), {
    revalidateOnFocus: false,
  })

  // Mark as read when viewing
  useEffect(() => {
    if (message && !message.isRead && message.recipientId === user?.id) {
      forumsApi.messages.markRead(messageId)
    }
  }, [message, messageId, user?.id])

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyBody.trim() || !message) return

    setIsSubmitting(true)
    setError(null)

    try {
      const recipientId = message.senderId === user?.id ? message.recipientId : message.senderId

      await forumsApi.messages.send({
        title: `Re: ${message.title}`,
        body: replyBody.trim(),
        recipientId,
        parentMessageId: message.id,
        extendedData: message.extendedData,
      })

      setReplyBody("")
      mutateThread()
      onReply?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reply")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (messageLoading || threadLoading) {
    return (
      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (messageError || threadError || !message) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-destructive">Failed to load message</p>
          <Button variant="outline" className="mt-4 bg-transparent" onClick={() => mutateMessage()}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  const allMessages = thread || [message]
  const otherUser = message.senderId === user?.id ? message.recipient : message.sender

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="border-b border-border">
        <h2 className="font-semibold text-foreground">{message.title}</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Conversation with</span>
            <Link href={`/user/${otherUser?.id}`} className="font-medium text-foreground hover:underline">
              {otherUser?.displayName || "Unknown"}
            </Link>
          </div>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4 overflow-y-auto p-4">
        {allMessages.map((msg) => {
          const isOwn = msg.senderId === user?.id
          const sender = isOwn && user ? user : msg.sender

          return (
            <div key={msg.id} className={cn("flex gap-3", isOwn && "flex-row-reverse")}>
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={getUserAvatarUrl(sender)} />
                <AvatarFallback>{sender?.displayName?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
              </Avatar>
              <div className={cn("max-w-[80%]", isOwn && "text-right")}>
                <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{sender?.displayName}</span>
                  <span>·</span>
                  <span>{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</span>
                </div>
                <div
                  className={cn(
                    "rounded-lg p-3",
                    isOwn ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
                  )}
                >
                  <p className="whitespace-pre-wrap text-sm">{msg.body}</p>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>

      <CardFooter className="border-t border-border p-4">
        <form onSubmit={handleReply} className="flex w-full gap-2">
          <Textarea
            placeholder="Type your reply..."
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            rows={2}
            className="flex-1 resize-none"
          />
          <Button type="submit" disabled={isSubmitting || !replyBody.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardFooter>
    </Card>
  )
}
