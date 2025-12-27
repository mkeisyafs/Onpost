"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TradeBadge } from "./trade-badge"
import { hasHighLikelihoodTradePattern, createTradeData } from "@/lib/trade-detection"
import forumsApi from "@/lib/forums-api"
import { useAuth } from "@/lib/auth-context"
import { ImageIcon, X, Smile, MapPin, Send } from "lucide-react"

interface CreatePostFormProps {
  threadId: string
  onPostCreated?: () => void
}

export function CreatePostForm({ threadId, onPostCreated }: CreatePostFormProps) {
  const { user, isAuthenticated } = useAuth()
  const [body, setBody] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detectedTrade, setDetectedTrade] = useState<ReturnType<typeof createTradeData> | null>(null)
  const [images, setImages] = useState<{ url: string; file?: File }[]>([])
  const [isFocused, setIsFocused] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Detect trade pattern as user types
  useEffect(() => {
    if (body.trim() && hasHighLikelihoodTradePattern(body)) {
      const tradeData = createTradeData(body)
      setDetectedTrade(tradeData)
    } else {
      setDetectedTrade(null)
    }
  }, [body])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file)
        setImages((prev) => [...prev, { url, file }])
      }
    })

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => {
      const newImages = [...prev]
      URL.revokeObjectURL(newImages[index].url)
      newImages.splice(index, 1)
      return newImages
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim() && images.length === 0) return

    setIsSubmitting(true)
    setError(null)

    try {
      // Convert images to base64 for storage in extendedData
      const imageDataPromises = images.map(async (img) => {
        if (img.file) {
          return new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(img.file!)
          })
        }
        return img.url
      })
      const imageUrls = await Promise.all(imageDataPromises)

      // Build post body - include image placeholders if any
      let postBody = body.trim()
      if (imageUrls.length > 0) {
        postBody += "\n\n" + imageUrls.map((_, i) => `[Image ${i + 1}]`).join(" ")
      }

      // Build extendedData
      const extendedData: Record<string, unknown> = {}
      if (detectedTrade) {
        extendedData.trade = detectedTrade
      }
      if (imageUrls.length > 0) {
        extendedData.images = imageUrls
      }

      await forumsApi.posts.create({
        threadId,
        body: postBody,
        extendedData: Object.keys(extendedData).length > 0 ? extendedData : undefined,
      })

      // Cleanup
      images.forEach((img) => URL.revokeObjectURL(img.url))
      setBody("")
      setImages([])
      setDetectedTrade(null)
      onPostCreated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Please log in to reply to this thread.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`border-border/50 transition-all ${isFocused ? "ring-1 ring-primary/50" : ""}`}>
      <form onSubmit={handleSubmit}>
        <CardContent className="p-4">
          <div className="flex gap-3">
            {/* Avatar */}
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={user?.avatarUrl || `/placeholder.svg?height=40&width=40&query=avatar`} />
              <AvatarFallback>{user?.displayName?.[0] || user?.username?.[0] || "U"}</AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-3">
              {/* Text Input - X/Facebook style */}
              <Textarea
                placeholder="What's happening?"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                rows={isFocused || body ? 3 : 1}
                className="min-h-0 resize-none border-0 bg-transparent p-0 text-base placeholder:text-muted-foreground/60 focus-visible:ring-0"
              />

              {/* Image Previews */}
              {images.length > 0 && (
                <div
                  className={`grid gap-2 ${images.length === 1 ? "grid-cols-1" : images.length === 2 ? "grid-cols-2" : images.length === 3 ? "grid-cols-2" : "grid-cols-2"}`}
                >
                  {images.map((img, index) => (
                    <div
                      key={index}
                      className={`relative overflow-hidden rounded-xl ${images.length === 3 && index === 0 ? "row-span-2" : ""}`}
                    >
                      <img
                        src={img.url || "/placeholder.svg"}
                        alt={`Upload ${index + 1}`}
                        className="h-full w-full object-cover"
                        style={{ maxHeight: images.length === 1 ? "400px" : "200px" }}
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white transition-colors hover:bg-black"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Trade Detection Badge */}
              {detectedTrade && (
                <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Detected as:</span>
                  <TradeBadge intent={detectedTrade.intent} size="sm" />
                  {detectedTrade.displayPrice && (
                    <span className="font-medium text-foreground">{detectedTrade.displayPrice}</span>
                  )}
                </div>
              )}

              {/* Error */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Action Bar */}
              <div className="flex items-center justify-between border-t border-border/50 pt-3">
                <div className="flex items-center gap-1">
                  {/* Image Upload */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                    id="image-upload"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 rounded-full p-0 text-primary hover:bg-primary/10"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 rounded-full p-0 text-primary hover:bg-primary/10"
                    disabled
                  >
                    <Smile className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 rounded-full p-0 text-primary hover:bg-primary/10"
                    disabled
                  >
                    <MapPin className="h-5 w-5" />
                  </Button>
                </div>

                {/* Post Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting || (!body.trim() && images.length === 0)}
                  className="rounded-full px-5 font-semibold"
                >
                  {isSubmitting ? (
                    "Posting..."
                  ) : (
                    <>
                      <Send className="mr-1.5 h-4 w-4" />
                      Post
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </form>
    </Card>
  )
}
