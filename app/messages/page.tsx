"use client"

import { useState } from "react"
import useSWR from "swr"
import { useAuth } from "@/lib/auth-context"
import forumsApi from "@/lib/forums-api"
import { PMList } from "@/components/messages/pm-list"
import { PMThread } from "@/components/messages/pm-thread"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Inbox, Send } from "lucide-react"
import Link from "next/link"

export default function MessagesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [folder, setFolder] = useState<"inbox" | "sent">("inbox")
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)

  const { data, error, isLoading, mutate } = useSWR(
    isAuthenticated ? ["messages", folder] : null,
    () => forumsApi.messages.list({ folder, limit: 50 }),
    { revalidateOnFocus: false },
  )

  if (authLoading) {
    return <MessagesPageSkeleton />
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Please sign in to view your messages.</p>
            <Button asChild className="mt-4">
              <Link href="/login">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Messages</h1>
        <Button asChild>
          <Link href="/messages/compose">
            <Plus className="mr-1 h-4 w-4" />
            New Message
          </Link>
        </Button>
      </div>

      {/* Folder Tabs */}
      <Tabs value={folder} onValueChange={(v) => setFolder(v as "inbox" | "sent")} className="mb-6">
        <TabsList>
          <TabsTrigger value="inbox" className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            Inbox
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Sent
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Message List */}
        <div className="lg:col-span-2">
          {error ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-destructive">Failed to load messages</p>
                <Button variant="outline" className="mt-4 bg-transparent" onClick={() => mutate()}>
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-3">
                    <div className="flex gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : data?.messages && data.messages.length > 0 ? (
            <PMList
              messages={data.messages}
              selectedId={selectedMessageId}
              onSelect={setSelectedMessageId}
              folder={folder}
            />
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">{folder === "inbox" ? "No messages yet" : "No sent messages"}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Message Thread */}
        <div className="lg:col-span-3">
          {selectedMessageId ? (
            <PMThread messageId={selectedMessageId} onReply={() => mutate()} />
          ) : (
            <Card>
              <CardContent className="flex min-h-[400px] items-center justify-center">
                <p className="text-muted-foreground">Select a message to view</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function MessagesPageSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="mb-6 h-10 w-48" />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-2 lg:col-span-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
        <div className="lg:col-span-3">
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
