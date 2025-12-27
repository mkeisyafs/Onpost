"use client";

import type React from "react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageIcon, X, Send, DollarSign } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import forumsApi from "@/lib/forums-api";
import Link from "next/link";

// Available tags for selection
const GAME_TAGS = [
  "mobile-legends",
  "genshin-impact",
  "uma-musume",
  "valorant",
  "roblox",
  "ff",
  "honkai",
  "pubg",
  "cod",
];

const CATEGORY_TAGS = [
  "game-items",
  "accounts",
  "services",
  "top-up",
  "boosting",
];

interface HomePostComposerProps {
  onPostCreated?: () => void;
}

export function HomePostComposer({ onPostCreated }: HomePostComposerProps) {
  const { user, isAuthenticated } = useAuth();
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIntent, setSelectedIntent] = useState<
    "WTS" | "WTB" | "WTT" | null
  >(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [price, setPrice] = useState("");
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [images, setImages] = useState<{ url: string; file?: File }[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const intentStyles = {
    WTS: {
      active: "bg-green-500 text-white",
      inactive: "bg-green-500/10 text-green-600 hover:bg-green-500/20",
    },
    WTB: {
      active: "bg-yellow-500 text-black",
      inactive: "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20",
    },
    WTT: {
      active: "bg-orange-500 text-white",
      inactive: "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20",
    },
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        setImages((prev) => [
          ...prev,
          { url: URL.createObjectURL(file), file },
        ]);
      }
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].url);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement("img");
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      img.onload = () => {
        const MAX_SIZE = 1024;
        let { width, height } = img;
        if (width > MAX_SIZE || height > MAX_SIZE) {
          const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() && images.length === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Compress images
      const imageUrls = await Promise.all(
        images.filter((img) => img.file).map((img) => compressImage(img.file!))
      );

      // Build post body with intent tag
      const intentPrefix = selectedIntent ? `#${selectedIntent} ` : "";
      const priceText = price && selectedIntent ? `\n\nPrice: ${price}` : "";
      let postBody = intentPrefix + body.trim() + priceText;

      if (imageUrls.length > 0) {
        postBody +=
          "\n\n" + imageUrls.map((_, i) => `[Image ${i + 1}]`).join(" ");
      }

      // Build extendedData
      const extendedData: Record<string, unknown> = {
        homeFeed: true,
        tags: selectedTags,
      };

      if (imageUrls.length > 0) {
        extendedData.images = imageUrls;
      }

      // Get thread ID - try env var first, then fetch first available thread
      let threadId = process.env.NEXT_PUBLIC_HOME_FEED_THREAD_ID;

      if (!threadId) {
        // Fetch first available thread to post to
        const threadsResponse = await forumsApi.threads.list({
          limit: 1,
          filter: "newest",
        });
        if (threadsResponse.threads && threadsResponse.threads.length > 0) {
          threadId = threadsResponse.threads[0].id;
        } else {
          // No threads exist, create a system thread for home feed
          const newThread = await forumsApi.threads.create({
            title: "Community Feed",
            body: "Welcome to the community feed! Share your trades, questions, and discussions here.",
            userId: user?.id,
            tags: ["community", "feed"],
          });
          threadId = newThread.id;
        }
      }

      await forumsApi.posts.create({
        threadId,
        body: postBody,
        userId: user?.id,
        extendedData,
      });

      // Reset form
      images.forEach((img) => URL.revokeObjectURL(img.url));
      setBody("");
      setImages([]);
      setSelectedIntent(null);
      setSelectedTags([]);
      setPrice("");
      onPostCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Card className="border-border/50 mb-6">
        <CardContent className="py-6 text-center">
          <p className="text-muted-foreground mb-3">Join the conversation!</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Sign Up</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`border-border/50 mb-6 transition-all ${
        isFocused ? "ring-1 ring-primary/50" : ""
      }`}
    >
      <form onSubmit={handleSubmit}>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={user?.avatarUrl || undefined} />
              <AvatarFallback>{user?.displayName?.[0] || "U"}</AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-3">
              {/* Intent Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Type:</span>
                {(["WTS", "WTB", "WTT"] as const).map((intent) => (
                  <button
                    key={intent}
                    type="button"
                    onClick={() =>
                      setSelectedIntent(
                        selectedIntent === intent ? null : intent
                      )
                    }
                    className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${
                      selectedIntent === intent
                        ? intentStyles[intent].active
                        : intentStyles[intent].inactive
                    }`}
                  >
                    {intent}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedIntent(null)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                    selectedIntent === null
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  Discussion
                </button>
              </div>

              {/* Text Input */}
              <Textarea
                placeholder={
                  selectedIntent
                    ? `What are you ${
                        selectedIntent === "WTS"
                          ? "selling"
                          : selectedIntent === "WTB"
                          ? "buying"
                          : "trading"
                      }?`
                    : "What's on your mind?"
                }
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                rows={isFocused || body ? 3 : 1}
                className="min-h-0 resize-none border-0 bg-transparent p-0 text-base placeholder:text-muted-foreground/60 focus-visible:ring-0"
              />

              {/* Price Input - only for trades */}
              {selectedIntent && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Price (e.g., 500000 or negotiable)"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="flex-1 h-9 bg-muted/50"
                  />
                </div>
              )}

              {/* Tag Selector */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowTagSelector(!showTagSelector)}
                  className="text-xs text-primary hover:underline"
                >
                  {selectedTags.length > 0
                    ? `${selectedTags.length} tags selected`
                    : "+ Add tags"}
                </button>

                {showTagSelector && (
                  <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-2">
                    <p className="text-xs text-muted-foreground">Games:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {GAME_TAGS.map((tag) => (
                        <Badge
                          key={tag}
                          variant={
                            selectedTags.includes(tag) ? "default" : "secondary"
                          }
                          className="cursor-pointer"
                          onClick={() => toggleTag(tag)}
                        >
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Categories:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORY_TAGS.map((tag) => (
                        <Badge
                          key={tag}
                          variant={
                            selectedTags.includes(tag) ? "default" : "secondary"
                          }
                          className="cursor-pointer"
                          onClick={() => toggleTag(tag)}
                        >
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Tags Display */}
                {selectedTags.length > 0 && !showTagSelector && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        #{tag}
                        <button
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className="ml-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Image Previews */}
              {images.length > 0 && (
                <div className="grid gap-2 grid-cols-2">
                  {images.map((img, index) => (
                    <div
                      key={index}
                      className="relative rounded-xl overflow-hidden"
                    >
                      <img
                        src={img.url}
                        alt=""
                        className="h-32 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white hover:bg-black"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Error */}
              {error && <p className="text-sm text-destructive">{error}</p>}

              {/* Action Bar */}
              <div className="flex items-center justify-between border-t border-border/50 pt-3">
                <div className="flex items-center gap-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
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
                </div>

                <Button
                  type="submit"
                  disabled={
                    isSubmitting || (!body.trim() && images.length === 0)
                  }
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
  );
}
