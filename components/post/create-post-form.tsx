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
import { uploadImage, uploadBase64Image, compressImage } from "@/lib/file-api";
import { useAuth } from "@/lib/auth-context";
import { ImageIcon, X, Smile, MapPin, Send, Loader2, Crop } from "lucide-react";

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
  const [images, setImages] = useState<{ url: string; file?: File }[]>([]);
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

  const MAX_IMAGES = 10; // Reduced to prevent API issues

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

  const handleCropComplete = (croppedImageUrl: string) => {
    // Add cropped image to list
    setImages((prev) => [...prev, { url: croppedImageUrl }]);

    // Check if there are more images to crop
    const nextIndex = currentCropIndex + 1;
    if (nextIndex < pendingImages.length) {
      setCurrentCropIndex(nextIndex);
      try {
        const reader = new FileReader();
        reader.onload = () => {
          setCropImage(reader.result as string);
        };
        reader.onerror = () => {
          console.error("Failed to read image file");
          // Skip to next or finish
          if (nextIndex + 1 < pendingImages.length) {
            setCurrentCropIndex(nextIndex + 1);
          } else {
            setShowCropper(false);
            setCropImage(null);
            setPendingImages([]);
            setCurrentCropIndex(0);
          }
        };
        reader.readAsDataURL(pendingImages[nextIndex]);
      } catch (err) {
        console.error("Error reading next image:", err);
        setShowCropper(false);
        setCropImage(null);
        setPendingImages([]);
        setCurrentCropIndex(0);
      }
    } else {
      // All images processed
      setShowCropper(false);
      setCropImage(null);
      setPendingImages([]);
      setCurrentCropIndex(0);
    }
  };

  const handleCropCancel = () => {
    // Skip current image and move to next
    const nextIndex = currentCropIndex + 1;
    if (nextIndex < pendingImages.length) {
      setCurrentCropIndex(nextIndex);
      try {
        const reader = new FileReader();
        reader.onload = () => {
          setCropImage(reader.result as string);
        };
        reader.onerror = () => {
          console.error("Failed to read image file");
          setShowCropper(false);
          setCropImage(null);
          setPendingImages([]);
          setCurrentCropIndex(0);
        };
        reader.readAsDataURL(pendingImages[nextIndex]);
      } catch (err) {
        console.error("Error reading next image:", err);
        setShowCropper(false);
        setCropImage(null);
        setPendingImages([]);
        setCurrentCropIndex(0);
      }
    } else {
      setShowCropper(false);
      setCropImage(null);
      setPendingImages([]);
      setCurrentCropIndex(0);
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
      // Upload images to file server (not base64!)
      const uploadedImageUrls: string[] = [];
      if (images.length > 0) {
        setIsUploading(true);
        for (const img of images) {
          try {
            if (img.file) {
              // New file - compress and upload
              const compressed = await compressImage(img.file, 1024, 0.8);
              const result = await uploadImage(compressed);
              uploadedImageUrls.push(result.url);
            } else if (img.url && img.url.startsWith("data:")) {
              // Cropped image (base64 from cropper) - upload directly
              const result = await uploadBase64Image(img.url);
              uploadedImageUrls.push(result.url);
            } else if (img.url && img.url.startsWith("http")) {
              // Already a URL (existing image) - keep as-is
              uploadedImageUrls.push(img.url);
            }
          } catch (uploadErr) {
            console.error("Failed to upload image:", uploadErr);
          }
        }
        setIsUploading(false);
      }

      // Build post body - include image placeholders if any
      if (uploadedImageUrls.length > 0) {
        postBody +=
          "\n\n" +
          uploadedImageUrls.map((_, i) => `[Image ${i + 1}]`).join(" ");
      }

      // Build extendedData with image URLs (not base64!)
      const extendedData: Record<string, unknown> = {};
      if (detectedTrade) {
        extendedData.trade = detectedTrade;
      }
      if (uploadedImageUrls.length > 0) {
        extendedData.images = uploadedImageUrls;
      }

      // === DEBUG LOGGING ===
      const payload = {
        threadId,
        body: postBody,
        userId: user?.id,
        extendedData:
          Object.keys(extendedData).length > 0 ? extendedData : undefined,
      };

      console.log("=== POST PAYLOAD DEBUG ===");
      console.log("Thread ID:", threadId);
      console.log("Body length:", postBody.length, "chars");
      console.log("User ID:", user?.id);
      console.log("Has extendedData:", Object.keys(extendedData).length > 0);
      console.log("Number of images:", uploadedImageUrls.length);

      // Log each image size
      uploadedImageUrls.forEach((url: string, i: number) => {
        console.log(
          `  Image ${i + 1} size: ${(url.length / 1024).toFixed(1)} KB`
        );
      });

      // Log total payload size
      const payloadJson = JSON.stringify(payload);
      console.log(
        "Total payload size:",
        (payloadJson.length / 1024).toFixed(1),
        "KB"
      );
      console.log("=========================");

      await forumsApi.posts.create(payload);

      // If this is a trade post (WTS/WTB/WTT), update the thread's validCount
      // Only thread owners can update thread metadata
      const isTradePost = selectedTag !== null || detectedTrade !== null;
      if (isTradePost) {
        try {
          // Fetch current thread to get market data and check ownership
          const thread = await forumsApi.threads.get(threadId);
          const threadOwnerId = thread.authorId || thread.userId;
          const isThreadOwner = user?.id === threadOwnerId;

          // Only update if user is thread owner and market data exists
          if (isThreadOwner && thread.extendedData?.market) {
            const currentMarket = thread.extendedData.market;
            const newValidCount = (currentMarket.validCount || 0) + 1;

            // Update thread with incremented validCount
            await forumsApi.threads.update(threadId, {
              extendedData: {
                ...thread.extendedData,
                market: {
                  ...currentMarket,
                  validCount: newValidCount,
                  // Only update analytics if it exists
                  ...(currentMarket.analytics && {
                    analytics: {
                      ...currentMarket.analytics,
                      locked:
                        newValidCount < (currentMarket.thresholdValid || 10),
                    },
                  }),
                },
              },
            });
          }
        } catch (err) {
          // Silently ignore - trade count updates are optional
          // Don't fail the post creation even if count update fails
        }
      }

      // Cleanup
      images.forEach((img) => {
        if (!img.url.startsWith("data:")) {
          URL.revokeObjectURL(img.url);
        }
      });
      setBody("");
      setImages([]);
      setDetectedTrade(null);
      setSelectedTag(null);
      onPostCreated?.();
    } catch (err) {
      console.error("[Post] Error creating post:", err);
      let errorMessage = "Failed to create post";
      if (err instanceof Error) {
        if (
          err.message.includes("413") ||
          err.message.toLowerCase().includes("too large")
        ) {
          errorMessage =
            "Images are too large. Please try with fewer or smaller images.";
        } else {
          errorMessage = err.message;
        }
      }
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const userInitials = user?.displayName?.[0] || user?.username?.[0] || "U";

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
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="rounded-full bg-white/90 p-2 text-gray-800 transition-colors hover:bg-white"
                  title="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Cropper Modal */}
      {cropImage && (
        <ImageCropper
          open={showCropper}
          onClose={handleCropCancel}
          imageSrc={cropImage}
          onCropComplete={handleCropComplete}
          aspectRatio={4 / 3}
          title={`Crop Image ${currentCropIndex + 1}${
            pendingImages.length > 1 ? ` of ${pendingImages.length}` : ""
          }`}
        />
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
          disabled={
            isSubmitting || isUploading || (!body.trim() && images.length === 0)
          }
          className="rounded-full px-6 font-semibold bg-primary hover:bg-primary/90 shadow-sm transition-all"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : isSubmitting ? (
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
