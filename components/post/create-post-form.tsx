"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TradeBadge } from "./trade-badge";
import {
  hasHighLikelihoodTradePattern,
  createTradeData,
} from "@/lib/trade-detection";
import forumsApi from "@/lib/forums-api";
import { useAuth } from "@/lib/auth-context";
import { ImageIcon, X, Smile, MapPin, Send, Loader2 } from "lucide-react";

interface CreatePostFormProps {
  threadId: string;
  onPostCreated?: () => void;
}

export function CreatePostForm({
  threadId,
  onPostCreated,
}: CreatePostFormProps) {
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedTrade, setDetectedTrade] = useState<ReturnType<
    typeof createTradeData
  > | null>(null);
  const [images, setImages] = useState<{ url: string; file?: File }[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedTag, setSelectedTag] = useState<"WTS" | "WTB" | "WTT" | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect trade pattern as user types
  useEffect(() => {
    if (body.trim() && hasHighLikelihoodTradePattern(body)) {
      const tradeData = createTradeData(body);
      setDetectedTrade(tradeData);
    } else {
      setDetectedTrade(null);
    }
  }, [body]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setImages((prev) => [...prev, { url, file }]);
      }
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].url);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() && images.length === 0) return;

    setIsSubmitting(true);
    setError(null);

    // Prepend trade tag as hashtag if selected
    const tagPrefix = selectedTag ? `#${selectedTag}\n` : "";
    let postBody = tagPrefix + body.trim();

    try {
      // Compress and convert images to base64 for storage in extendedData
      const compressImage = async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const img = document.createElement("img");
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          img.onload = () => {
            // Max dimensions for compression
            const MAX_WIDTH = 1024;
            const MAX_HEIGHT = 1024;
            let { width, height } = img;

            // Calculate new dimensions while maintaining aspect ratio
            if (width > MAX_WIDTH || height > MAX_HEIGHT) {
              const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
            }

            canvas.width = width;
            canvas.height = height;
            ctx?.drawImage(img, 0, 0, width, height);

            // Compress to JPEG with 0.7 quality (good balance of size/quality)
            const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
            resolve(compressedBase64);
          };

          img.onerror = () => reject(new Error("Failed to load image"));
          img.src = URL.createObjectURL(file);
        });
      };

      const imageDataPromises = images.map(async (img) => {
        if (img.file) {
          return compressImage(img.file);
        }
        return img.url;
      });
      const imageUrls = await Promise.all(imageDataPromises);

      // Build post body - include image placeholders if any
      if (imageUrls.length > 0) {
        postBody +=
          "\n\n" + imageUrls.map((_, i) => `[Image ${i + 1}]`).join(" ");
      }

      // Build extendedData
      const extendedData: Record<string, unknown> = {};
      if (detectedTrade) {
        extendedData.trade = detectedTrade;
      }
      if (imageUrls.length > 0) {
        extendedData.images = imageUrls;
      }

      await forumsApi.posts.create({
        threadId,
        body: postBody,
        userId: user?.id,
        extendedData:
          Object.keys(extendedData).length > 0 ? extendedData : undefined,
      });

      // If this is a trade post (WTS/WTB/WTT), update the thread's validCount
      const isTradePost = selectedTag !== null || detectedTrade !== null;
      if (isTradePost) {
        try {
          // Fetch current thread to get market data
          const thread = await forumsApi.threads.get(threadId);
          if (thread.extendedData?.market) {
            const currentMarket = thread.extendedData.market;
            const newValidCount = (currentMarket.validCount || 0) + 1;

            // Update thread with incremented validCount
            await forumsApi.threads.update(threadId, {
              extendedData: {
                ...thread.extendedData,
                market: {
                  ...currentMarket,
                  validCount: newValidCount,
                  // Check if threshold met and unlock analytics
                  analytics: {
                    ...currentMarket.analytics,
                    locked:
                      newValidCount < (currentMarket.thresholdValid || 10),
                  },
                },
              },
            });
          }
        } catch (err) {
          console.error("Failed to update trade count:", err);
          // Don't fail the post creation even if count update fails
        }
      }

      // Cleanup
      images.forEach((img) => URL.revokeObjectURL(img.url));
      setBody("");
      setImages([]);
      setDetectedTrade(null);
      setSelectedTag(null);
      onPostCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  const userInitials =
    user?.displayName?.[0] || user?.username?.[0] || "U";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* User Header */}
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 shrink-0 border border-border">
          <AvatarImage
            src={
              user?.avatarUrl ||
              `/placeholder.svg?height=40&width=40&query=avatar`
            }
          />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {userInitials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            {user?.displayName || user?.username || "User"}
          </p>
          <p className="text-xs text-muted-foreground">
            Posting in this market
          </p>
        </div>
      </div>

      {/* Trade Tags */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Tag:</span>
        <button
          type="button"
          onClick={() => setSelectedTag(selectedTag === "WTS" ? null : "WTS")}
          className={`px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
            selectedTag === "WTS"
              ? "bg-emerald-500 text-white shadow-sm"
              : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
          }`}
        >
          WTS
        </button>
        <button
          type="button"
          onClick={() => setSelectedTag(selectedTag === "WTB" ? null : "WTB")}
          className={`px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
            selectedTag === "WTB"
              ? "bg-amber-500 text-black shadow-sm"
              : "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
          }`}
        >
          WTB
        </button>
        <button
          type="button"
          onClick={() => setSelectedTag(selectedTag === "WTT" ? null : "WTT")}
          className={`px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
            selectedTag === "WTT"
              ? "bg-orange-500 text-white shadow-sm"
              : "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20"
          }`}
        >
          WTT
        </button>
      </div>

      {/* Text Input */}
      <div
        className={`rounded-xl border transition-all ${
          isFocused
            ? "border-primary/40 bg-background shadow-sm"
            : "border-transparent bg-muted/50"
        }`}
      >
        <Textarea
          placeholder="Share your thoughts, WTS/WTB/WTT offers..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          rows={isFocused || body ? 4 : 2}
          className="min-h-0 resize-none border-0 bg-transparent p-4 text-base placeholder:text-muted-foreground/60 focus-visible:ring-0"
        />
      </div>

      {/* Image Previews */}
      {images.length > 0 && (
        <div
          className={`grid gap-2 rounded-xl overflow-hidden ${
            images.length === 1
              ? "grid-cols-1"
              : images.length === 2
              ? "grid-cols-2"
              : "grid-cols-2"
          }`}
        >
          {images.map((img, index) => (
            <div
              key={index}
              className={`relative group overflow-hidden rounded-lg ${
                images.length === 3 && index === 0 ? "row-span-2" : ""
              }`}
            >
              <img
                src={img.url || "/placeholder.svg"}
                alt={`Upload ${index + 1}`}
                className="h-full w-full object-cover"
                style={{
                  maxHeight: images.length === 1 ? "300px" : "180px",
                }}
              />
              {/* Overlay with remove button */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="rounded-full bg-white/90 p-2 text-gray-800 transition-colors hover:bg-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trade Detection Badge */}
      {detectedTrade && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm">
          <span className="text-muted-foreground">Detected as:</span>
          <TradeBadge intent={detectedTrade.intent} size="sm" />
          {detectedTrade.displayPrice && (
            <span className="font-medium text-foreground">
              {detectedTrade.displayPrice}
            </span>
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
            className="h-10 w-10 rounded-full p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-10 w-10 rounded-full p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
            disabled
          >
            <Smile className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-10 w-10 rounded-full p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
            disabled
          >
            <MapPin className="h-5 w-5" />
          </Button>
        </div>

        {/* Post Button */}
        <Button
          type="submit"
          disabled={isSubmitting || (!body.trim() && images.length === 0)}
          className="rounded-full px-6 font-semibold bg-primary hover:bg-primary/90 shadow-sm transition-all"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Posting...
            </>
          ) : (
            <>
              <Send className="mr-1.5 h-4 w-4" />
              Post
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
