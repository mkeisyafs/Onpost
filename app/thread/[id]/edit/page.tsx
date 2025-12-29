"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ImageCropper } from "@/components/ui/image-cropper";
import { X, ImageIcon, Loader2, Save, Edit, User } from "lucide-react";
import forumsApi from "@/lib/forums-api";
import { uploadImage, compressImage } from "@/lib/file-api";
import Link from "next/link";
import type { ForumsThread, ThreadExtendedData } from "@/lib/types";

export default function EditThreadPage() {
  const router = useRouter();
  const params = useParams();
  const threadId = params.id as string;

  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [thread, setThread] = useState<ForumsThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<{
    url: string;
    file?: File;
    isExisting?: boolean;
  } | null>(null);
  const [icon, setIcon] = useState<{
    url: string;
    file?: File;
    isExisting?: boolean;
  } | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  // Image cropping state
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [cropType, setCropType] = useState<"cover" | "icon">("cover");

  useEffect(() => {
    async function fetchThread() {
      try {
        const threadData = await forumsApi.threads.get(threadId);
        setThread(threadData);
        setTitle(threadData.title);
        setBody(threadData.body);

        if (threadData.extendedData?.coverImage) {
          setCoverImage({
            url: threadData.extendedData.coverImage,
            isExisting: true,
          });
        }
        if (threadData.extendedData?.icon) {
          setIcon({ url: threadData.extendedData.icon, isExisting: true });
        }
      } catch (err) {
        console.error("Failed to fetch thread:", err);
        setError("Failed to load thread");
      } finally {
        setLoading(false);
      }
    }
    if (threadId) fetchThread();
  }, [threadId]);

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        setCropImageSrc(reader.result as string);
        setCropType("cover");
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  const handleIconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        setCropImageSrc(reader.result as string);
        setCropType("icon");
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
    if (iconInputRef.current) iconInputRef.current.value = "";
  };

  const handleCropComplete = async (croppedImageUrl: string) => {
    try {
      // Convert data URL to File object for uploading
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();
      const file = new File([blob], cropType === "cover" ? "cover.jpg" : "icon.jpg", {
        type: "image/jpeg",
      });

      if (cropType === "cover") {
        setCoverImage({ url: croppedImageUrl, file });
      } else {
        setIcon({ url: croppedImageUrl, file });
      }
    } catch (err) {
      console.error("Failed to process cropped image:", err);
      // Fallback: use the URL but file will be missing
      if (cropType === "cover") {
        setCoverImage({ url: croppedImageUrl });
      } else {
        setIcon({ url: croppedImageUrl });
      }
    }
    setShowCropper(false);
    setCropImageSrc(null);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setCropImageSrc(null);
  };

  // compressImage is now imported from file-api

  const threadAuthorId = thread?.authorId || thread?.userId;
  const isOwner = user?.id === threadAuthorId;

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading thread...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated || !thread || !isOwner) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              {!isAuthenticated
                ? "Please sign in to edit."
                : !thread
                ? "Thread not found."
                : "You don't have permission."}
            </p>
            <Button asChild className="rounded-full px-8">
              <Link href={thread ? `/thread/${threadId}` : "/"}>
                {thread ? "Back to Thread" : "Go Home"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      let coverImageUrl: string | undefined;
      let iconUrl: string | undefined;

      // Upload new images to file server
      if (coverImage?.file || icon?.file) {
        setIsUploadingImages(true);
        try {
          if (coverImage?.file) {
            const compressed = await compressImage(coverImage.file, 800, 0.8);
            const result = await uploadImage(compressed);
            coverImageUrl = result.url;
          }
          if (icon?.file) {
            const compressed = await compressImage(icon.file, 256, 0.8);
            const result = await uploadImage(compressed);
            iconUrl = result.url;
          }
        } catch (uploadErr) {
          console.error("Failed to upload images:", uploadErr);
        }
        setIsUploadingImages(false);
      }

      // Use existing URLs if not uploading new ones
      if (!coverImageUrl && coverImage?.isExisting) {
        coverImageUrl = coverImage.url;
      }
      if (!iconUrl && icon?.isExisting) {
        iconUrl = icon.url;
      }

      const extendedData: ThreadExtendedData = {
        ...(thread.extendedData || {}),
      };
      if (coverImageUrl) extendedData.coverImage = coverImageUrl;
      else delete extendedData.coverImage;
      if (iconUrl) extendedData.icon = iconUrl;
      else delete extendedData.icon;

      await forumsApi.threads.update(threadId, {
        title: title.trim(),
        body: body.trim(),
        extendedData:
          Object.keys(extendedData).length > 0 ? extendedData : undefined,
      });

      router.push(`/thread/${threadId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update thread.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Card className="border-border/50 shadow-xl overflow-hidden">
        <CardHeader className="pb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Edit className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Edit Thread</CardTitle>
              <CardDescription>Update your thread details</CardDescription>
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* Cover & Icon */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                Thread Branding
              </Label>

              <div className="relative">
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverSelect}
                  className="hidden"
                />
                {coverImage ? (
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-muted border group">
                    <img
                      src={coverImage.url}
                      alt="Cover"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => coverInputRef.current?.click()}
                      >
                        Change
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (coverImage.url && !coverImage.isExisting)
                            URL.revokeObjectURL(coverImage.url);
                          setCoverImage(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                     className="w-full aspect-video rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/30 hover:bg-muted/50 transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-sm font-medium">Add Cover Image</span>
                  </button>
                )}

                {/* Icon */}
                <div className="absolute -bottom-6 left-4">
                  <input
                    ref={iconInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleIconSelect}
                    className="hidden"
                  />
                  {icon ? (
                    <div
                      className="relative h-20 w-20 rounded-2xl overflow-hidden border-4 border-card bg-muted shadow-lg group cursor-pointer"
                      onClick={() => iconInputRef.current?.click()}
                    >
                      <img
                        src={icon.url}
                        alt="Icon"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => iconInputRef.current?.click()}
                      className="h-20 w-20 rounded-2xl border-4 border-card bg-muted/80 hover:bg-muted flex items-center justify-center shadow-lg transition-colors"
                    >
                      <User className="h-8 w-8 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground pl-28">Thread icon</p>
            </div>

            {/* Title */}
            <div className="space-y-2 pt-4">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-12 text-lg"
                required
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="body">Content</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                className="resize-none"
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>

          <CardFooter className="flex justify-end gap-4 pt-6 border-t">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim() || !body.trim()}
              className="px-8 rounded-full"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Image Cropper Modal */}
      {cropImageSrc && (
        <ImageCropper
          open={showCropper}
          onClose={handleCropCancel}
          imageSrc={cropImageSrc}
          onCropComplete={handleCropComplete}
          aspectRatio={cropType === "cover" ? 16 / 9 : 1}
          cropShape="rect"
          title={cropType === "cover" ? "Crop Banner Image (16:9)" : "Crop Icon"}
        />
      )}
    </div>
  );
}
