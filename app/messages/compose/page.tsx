"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import useSWR from "swr"
import { useAuth } from "@/lib/auth-context"
import forumsApi from "@/lib/forums-api"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, ArrowLeft } from "lucide-react"
import Link from "next/link"

function ComposePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  const recipientId = searchParams.get("recipientId")
  const linkedPostId = searchParams.get("linkedPostId")
  const subject = searchParams.get("subject")

  const [recipientUsername, setRecipientUsername] = useState("")
  const [title, setTitle] = useState(subject || "")
  const [body, setBody] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch recipient if ID provided
  const { data: recipient } = useSWR(recipientId ? ["user", recipientId] : null, () =>
    forumsApi.users.get(recipientId!),
  )

  // Fetch linked post if provided
  const { data: linkedPost } = useSWR(linkedPostId ? ["post", linkedPostId] : null, () =>
    forumsApi.posts.get(linkedPostId!),
  )

  useEffect(() => {
    if (recipient) {
      setRecipientUsername(recipient.username)
    }
  }, [recipient])

  useEffect(() => {
    if (linkedPost) {
      const trade = linkedPost.extendedData?.trade
      if (trade) {
        setBody(
          `Hi, I'm interested in your listing:\n\n` +
            `Price: ${trade.displayPrice || "Negotiable"}\n` +
            `---\n\n` +
            `[Your message here]`,
        )
      }
    }
  }, [linkedPost])

  if (authLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Please sign in to send messages.</p>
            <Button asChild className="mt-4">
              <Link href="/login">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recipientUsername.trim() || !title.trim() || !body.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      // Look up recipient by username if we don't have ID
      let finalRecipientId = recipientId
      if (!finalRecipientId) {
        const user = await forumsApi.users.getByUsername(recipientUsername.trim())
        finalRecipientId = user.id
      }

      await forumsApi.messages.send({
        title: title.trim(),
        body: body.trim(),
        recipientId: finalRecipientId,
        extendedData: linkedPostId ? { linkedPostId } : undefined,
      })

      router.push("/messages")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/messages">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <CardTitle>New Message</CardTitle>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Recipient */}
            <div className="space-y-2">
              <Label htmlFor="recipient">To</Label>
              {recipient ? (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/50 p-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={recipient.avatarUrl || undefined} />
                    <AvatarFallback>{recipient.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{recipient.displayName}</p>
                    <p className="text-sm text-muted-foreground">@{recipient.username}</p>
                  </div>
                </div>
              ) : (
                <Input
                  id="recipient"
                  placeholder="Enter username"
                  value={recipientUsername}
                  onChange={(e) => setRecipientUsername(e.target.value)}
                  required
                />
              )}
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="title">Subject</Label>
              <Input
                id="title"
                placeholder="Message subject"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Body */}
            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                placeholder="Write your message..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                required
              />
            </div>

            {/* Linked Post Info */}
            {linkedPost && (
              <div className="rounded-lg border border-border bg-secondary/50 p-3">
                <p className="text-xs text-muted-foreground">Linked to listing:</p>
                <p className="mt-1 text-sm text-foreground line-clamp-2">{linkedPost.body}</p>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button type="button" variant="outline" asChild>
              <Link href="/messages">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting || !recipientUsername.trim() || !title.trim() || !body.trim()}>
              <Send className="mr-1 h-4 w-4" />
              {isSubmitting ? "Sending..." : "Send Message"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

export default function ComposePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl px-4 py-8">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <ComposePageContent />
    </Suspense>
  )
}
