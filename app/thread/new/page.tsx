"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import forumsApi from "@/lib/forums-api"
import Link from "next/link"
import type { ThreadMarketData, Tag } from "@/lib/types"

export default function NewThreadPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])
  const [enableMarket, setEnableMarket] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [loadingMeta, setLoadingMeta] = useState(true)

  useEffect(() => {
    async function fetchMeta() {
      try {
        const tagsRes = await forumsApi.tags.list()
        setAvailableTags(tagsRes)
      } catch (err) {
        // Tags are optional, don't block thread creation
        console.error("Failed to fetch tags:", err)
      } finally {
        setLoadingMeta(false)
      }
    }
    fetchMeta()
  }, [])

  const handleAddTag = (tagId: string) => {
    const tag = availableTags.find((t) => t.id === tagId)
    if (tag && !selectedTags.find((t) => t.id === tagId)) {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const handleRemoveTag = (tagId: string) => {
    setSelectedTags(selectedTags.filter((t) => t.id !== tagId))
  }

  if (isLoading || loadingMeta) {
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
            <p className="text-muted-foreground">Please sign in to create a thread.</p>
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
    if (!title.trim() || !body.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const marketData: ThreadMarketData | undefined = enableMarket
        ? {
            marketEnabled: true,
            marketTypeFinal: null,
            marketTypeCandidate: "UNKNOWN",
            windowDays: 14,
            thresholdValid: 50,
            validCount: 0,
            lastWindowCutoffAt: 0,
            lastProcessed: {
              mode: "OLDEST",
              cursor: null,
              lastPostIdProcessed: "",
              at: 0,
            },
            classification: {
              confidence: 0,
              method: "RULE",
              version: "1.0.0",
              classifiedAt: Date.now(),
              lockedAt: null,
            },
            analytics: {
              locked: true,
              updatedAt: Date.now(),
              snapshot: null,
              narrative: null,
              narrativeUpdatedAt: null,
              version: "1.0.0",
            },
          }
        : undefined

      const thread = await forumsApi.threads.create({
        title: title.trim(),
        body: body.trim(),
        tags: selectedTags.length > 0 ? selectedTags.map((t) => t.id) : undefined,
        extendedData: marketData ? { market: marketData } : undefined,
      })

      router.push(`/thread/${thread.id}`)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else if (typeof err === "object" && err !== null && "error" in err) {
        setError(String((err as { error: unknown }).error))
      } else {
        setError("Failed to create thread. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create New Thread</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Enter thread title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Content</Label>
              <Textarea
                id="body"
                placeholder="Write your thread content..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                required
              />
            </div>

            {availableTags.length > 0 && (
              <div className="space-y-2">
                <Label>Tags (optional)</Label>
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedTags.map((tag) => (
                      <Badge key={tag.id} variant="secondary" className="gap-1">
                        {tag.name}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag.id)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <Select onValueChange={handleAddTag}>
                  <SelectTrigger>
                    <SelectValue placeholder="Add a tag..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTags
                      .filter((tag) => !selectedTags.find((t) => t.id === tag.id))
                      .map((tag) => (
                        <SelectItem key={tag.id} value={tag.id}>
                          {tag.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="font-medium text-foreground">Enable Market Analytics</p>
                <p className="text-sm text-muted-foreground">
                  Track prices and generate insights for trade posts in this thread
                </p>
              </div>
              <Switch checked={enableMarket} onCheckedChange={setEnableMarket} />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim() || !body.trim()}>
              {isSubmitting ? "Creating..." : "Create Thread"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
