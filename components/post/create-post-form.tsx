"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageCropper } from "@/components/ui/image-cropper";
import { TradeBadge } from "./trade-badge";
import {
  hasHighLikelihoodTradePattern,
  createTradeData,
} from "@/lib/trade-detection";
import forumsApi from "@/lib/forums-api";
import { uploadImage, compressImage, uploadBase64Image } from "@/lib/file-api";
import { useAuth } from "@/lib/auth-context";
import { ImageIcon, X, Smile, MapPin, Send, Loader2, Crop } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedTrade, setDetectedTrade] = useState<ReturnType<
    typeof createTradeData
  > | null>(null);
  const [images, setImages] = useState<{ url: string; file?: File; isBase64?: boolean }[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedTag, setSelectedTag] = useState<"WTS" | "WTB" | "WTT" | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cropping state
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [currentCropIndex, setCurrentCropIndex] = useState(0);

  // Detect trade pattern as user types
  useEffect(() => {
    if (body.trim() && hasHighLikelihoodTradePattern(body)) {
      const tradeData = createTradeData(body);
      setDetectedTrade(tradeData);
    } else {
      setDetectedTrade(null);
    }
  }, [body]);

  const MAX_IMAGES = 4;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (imageFiles.length === 0) return;

    // Check if adding these would exceed limit
    const remainingSlots = MAX_IMAGES - images.length;
    if (remainingSlots <= 0) {
      setError(`Maximum ${MAX_IMAGES} images allowed per post`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Limit the images to remaining slots
    const filesToProcess = imageFiles.slice(0, remainingSlots);

    // Queue images for cropping
    setPendingImages(filesToProcess);
    setCurrentCropIndex(0);
    
    // Load first image for cropping
    const reader = new FileReader();
    reader.onload = () => {
      setCropImage(reader.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(filesToProcess[0]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onCropComplete = (croppedImageUrl: string) => {
    // Add cropped image to list
    setImages((prev) => [...prev, { url: croppedImageUrl, isBase64: true }]);
    
    // Process next image if any
    const nextIndex = currentCropIndex + 1;
    if (nextIndex < pendingImages.length) {
      setCurrentCropIndex(nextIndex);
      const reader = new FileReader();
      reader.onload = () => {
        setCropImage(reader.result as string);
      };
      reader.readAsDataURL(pendingImages[nextIndex]);
    } else {
      // Done with all crops
      setShowCropper(false);
      setCropImage(null);
      setPendingImages([]);
      setCurrentCropIndex(0);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const newImages = [...prev];
      if (!newImages[index].isBase64) {
        URL.revokeObjectURL(newImages[index].url);
      }
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() && images.length === 0) return;

    setIsSubmitting(true);
    setIsUploading(true);
    setError(null);

    // Prepend trade tag as hashtag if selected
    const tagPrefix = selectedTag ? `#${selectedTag}\n` : "";
    let postBody = tagPrefix + body.trim();

    try {
      // Upload images to file server
      const uploadedImageUrls: string[] = [];
      
      if (images.length > 0) {
        for (const img of images) {
          try {
            if (img.file) {
              // Direct file upload
              const compressed = await compressImage(img.file, 800, 0.7);
              const result = await uploadImage(compressed);
              if (result.success) {
                uploadedImageUrls.push(result.url);
              }
            } else if (img.isBase64) {
              // Cropped base64 upload
              const result = await uploadBase64Image(img.url);
              if (result.success) {
                uploadedImageUrls.push(result.url);
              }
            }
          } catch (uploadErr) {
            console.error("Failed to upload image:", uploadErr);
          }
        }
      }

      setIsUploading(false);

      // Build post body - include image placeholders if any
      if (uploadedImageUrls.length > 0) {
        postBody +=
          "\n\n" + uploadedImageUrls.map((_, i) => `[Image ${i + 1}]`).join(" ");
      }

      const extendedData: Record<string, any> = {};
      if (detectedTrade) {
        extendedData.trade = detectedTrade;
      }
      if (uploadedImageUrls.length > 0) {
        extendedData.images = uploadedImageUrls;
      }

      await forumsApi.posts.create({
        threadId,
        body: postBody,
        userId: user?.id,
        extendedData: Object.keys(extendedData).length > 0 ? extendedData : undefined,
      });

      // Cleanup
      setBody("");
      setImages([]);
      setDetectedTrade(null);
      setSelectedTag(null);
      onPostCreated?.();
    } catch (err) {
      console.error("[Post] Error creating post:", err);
      setError(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const userInitials = user?.displayName?.[0] || user?.username?.[0] || "U";

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* User Header */}
        <div className="flex items-center gap-3 px-1">
          <Avatar className="h-10 w-10 shrink-0 border border-border">
            <AvatarImage src={user?.avatarUrl || undefined} />
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

        {/* Trade Tags Selection */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-muted-foreground">Tag:</span>
          <button
            type="button"
            onClick={() => setSelectedTag(selectedTag === "WTS" ? null : "WTS")}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer",
              selectedTag === "WTS"
                ? "bg-emerald-500 text-white shadow-sm"
                : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
            )}
          >
            WTS
          </button>
          <button
            type="button"
            onClick={() => setSelectedTag(selectedTag === "WTB" ? null : "WTB")}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer",
              selectedTag === "WTB"
                ? "bg-amber-500 text-black shadow-sm"
                : "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
            )}
          >
            WTB
          </button>
          <button
            type="button"
            onClick={() => setSelectedTag(selectedTag === "WTT" ? null : "WTT")}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer",
              selectedTag === "WTT"
                ? "bg-orange-500 text-white shadow-sm"
                : "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20"
            )}
          >
            WTT
          </button>
        </div>

        {/* Input Area */}
        <div 
          className={cn(
            "relative rounded-xl border bg-muted/30 transition-all duration-200 overflow-hidden",
            isFocused ? "border-primary/50 ring-2 ring-primary/10 bg-card shadow-sm" : "border-border/50"
          )}
        >
          <Textarea
            placeholder="What's your offer? Use #WTS, #WTB, or #WTT for auto-analytics..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="min-h-[120px] w-full resize-none border-0 bg-transparent p-4 text-base focus-visible:ring-0 shadow-none"
            disabled={isSubmitting}
          />

          {/* Image Previews */}
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 pt-0">
              {images.map((img, idx) => (
                <div key={idx} className="relative group animate-in fade-in zoom-in-95 duration-200">
                  <div className="h-20 w-20 overflow-hidden rounded-lg border border-border shadow-sm">
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive p-0.5 text-white shadow-md hover:bg-destructive/90 transition-transform hover:scale-110 active:scale-90"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Toolbar */}
          <div className="flex items-center justify-between border-t border-border/10 px-3 py-2 bg-muted/50">
            <div className="flex items-center gap-1">
              <input
                type="input"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                multiple
                className="hidden"
                id="post-image-upload"
              />
              <label
                htmlFor="post-image-upload"
                className={cn(
                  "flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors",
                  images.length >= MAX_IMAGES && "opacity-50 cursor-not-allowed pointer-events-none"
                )}
              >
                <ImageIcon className="h-5 w-5" />
              </label>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
                <Smile className="h-5 w-5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
                <MapPin className="h-5 w-5" />
              </Button>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || (!body.trim() && images.length === 0)}
              className="rounded-full px-6 shadow-sm gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isUploading ? "Uploading..." : "Posting..."}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Post
                </>
              )}
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="rounded-xl border-destructive/20 bg-destructive/5 py-2">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {/* Trade detection badge */}
        {detectedTrade && !selectedTag && (
          <div className="animate-in slide-in-from-top-1 duration-300">
            <TradeBadge intent={detectedTrade.intent} status={detectedTrade.status} />
          </div>
        )}
      </form>

      {/* Image Cropper Dialog */}
      {showCropper && cropImage && (
        <ImageCropper
          open={showCropper}
          imageSrc={cropImage}
          onCropComplete={onCropComplete}
          onClose={() => {
            setShowCropper(false);
            setCropImage(null);
            setPendingImages([]);
            setCurrentCropIndex(0);
          }}
          aspectRatio={4 / 3}
          title={`Crop image ${currentCropIndex + 1} of ${pendingImages.length}`}
        />
      )}
    </div>
  );
}
