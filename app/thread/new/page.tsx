"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ImageCropper } from "@/components/ui/image-cropper";
import {
  X,
  ImageIcon,
  Sparkles,
  Tag as TagIcon,
  TrendingUp,
  User,
  Loader2,
} from "lucide-react";
import forumsApi from "@/lib/forums-api";
import { uploadImage, compressImage } from "@/lib/file-api";
import Link from "next/link";
import type { Tag, ThreadExtendedData } from "@/lib/types";

export default function NewThreadPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [enableMarket, setEnableMarket] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<{
    url: string;
    file?: File;
  } | null>(null);
  const [icon, setIcon] = useState<{ url: string; file?: File } | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [threadCategory, setThreadCategory] = useState<
    "game-items" | "accounts" | "physical" | "services"
  >("game-items");

  // Image cropping state
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [cropType, setCropType] = useState<"cover" | "icon">("cover");

  // Thread categories for filtering
  const threadCategories = [
    { value: "game-items", label: "Game Items", icon: "🎮" },
    { value: "accounts", label: "Accounts", icon: "👤" },
    { value: "physical", label: "Physical Items", icon: "📦" },
    { value: "services", label: "Services", icon: "🛒" },
  ] as const;

  // Map thread category to market type (they should always match)
  const getMarketType = (category: typeof threadCategory) => {
    const mapping: Record<typeof threadCategory, "ITEM_MARKET" | "ACCOUNT_MARKET" | "PHYSICAL_ITEM" | "GENERAL"> = {
      "game-items": "ITEM_MARKET",
      "accounts": "ACCOUNT_MARKET",
      "physical": "PHYSICAL_ITEM",
      "services": "GENERAL",
    };
    return mapping[category];
  };

  useEffect(() => {
    async function fetchMeta() {
      try {
        const tagsRes = await forumsApi.tags.list();
        setAvailableTags(tagsRes);
      } catch (err) {
        console.error("Failed to fetch tags:", err);
      } finally {
        setLoadingMeta(false);
      }
    }
    fetchMeta();
  }, []);

  const handleAddTag = (tagId: string) => {
    const tag = availableTags.find((t) => t.id === tagId);
    if (tag && !selectedTags.find((t) => t.id === tagId)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    setSelectedTags(selectedTags.filter((t) => t.id !== tagId));
  };

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
        if (coverImage?.url && !coverImage.url.startsWith("data:")) {
          URL.revokeObjectURL(coverImage.url);
        }
        setCoverImage({ url: croppedImageUrl, file });
      } else {
        if (icon?.url && !icon.url.startsWith("data:")) {
          URL.revokeObjectURL(icon.url);
        }
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



  if (isLoading || loadingMeta) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Card className="border-border/50 bg-linear-to-b from-card to-card/80">
          <CardContent className="py-12 text-center">
            <Sparkles className="h-8 w-8 text-primary animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Card className="border-border/50 bg-linear-to-b from-card to-card/80">
          <CardContent className="py-12 text-center">
            <Sparkles className="h-10 w-10 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
            <p className="text-muted-foreground mb-6">
              Please sign in to create a new thread.
            </p>
            <Button asChild size="lg" className="rounded-full px-8">
              <Link href="/login">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Validation constants
  const TITLE_MIN_LENGTH = 3;
  const TITLE_MAX_LENGTH = 255;
  const BODY_MIN_LENGTH = 10;
  const BODY_MAX_LENGTH = 50000;

  // Validation state
  const titleTrimmed = title.trim();
  const bodyTrimmed = body.trim();
  
  const isTitleValid = titleTrimmed.length >= TITLE_MIN_LENGTH && titleTrimmed.length <= TITLE_MAX_LENGTH;
  const isBodyValid = bodyTrimmed.length >= BODY_MIN_LENGTH && bodyTrimmed.length <= BODY_MAX_LENGTH;
  const canSubmit = isTitleValid && isBodyValid && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    if (titleTrimmed.length < TITLE_MIN_LENGTH) {
      setError(`Title must be at least ${TITLE_MIN_LENGTH} characters`);
      return;
    }
    if (titleTrimmed.length > TITLE_MAX_LENGTH) {
      setError(`Title must be ${TITLE_MAX_LENGTH} characters or less`);
      return;
    }
    if (bodyTrimmed.length < BODY_MIN_LENGTH) {
      setError(`Content must be at least ${BODY_MIN_LENGTH} characters`);
      return;
    }
    if (bodyTrimmed.length > BODY_MAX_LENGTH) {
      setError(`Content must be ${BODY_MAX_LENGTH.toLocaleString()} characters or less`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let coverImageUrl: string | undefined;
      let iconUrl: string | undefined;

      // Upload new images to file server
      if (coverImage?.file || icon?.file) {
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
      }

      // Simplified market data - market type derived from thread category
      // The full market analytics will be computed server-side
      const marketData = enableMarket
        ? {
            marketEnabled: true,
            marketTypeFinal: getMarketType(threadCategory),
          }
        : undefined;

      const extendedData: ThreadExtendedData = {
        category: threadCategory,
      };
      if (marketData) extendedData.market = marketData;
      if (coverImageUrl) extendedData.coverImage = coverImageUrl;
      if (iconUrl) extendedData.icon = iconUrl;

      const thread = await forumsApi.threads.create({
        title: titleTrimmed,
        body: bodyTrimmed,
        userId: user?.id,
        tags:
          selectedTags.length > 0 ? selectedTags.map((t) => t.id) : undefined,
        extendedData:
          Object.keys(extendedData).length > 0 ? extendedData : undefined,
      });

      if (coverImage?.url) URL.revokeObjectURL(coverImage.url);
      if (icon?.url) URL.revokeObjectURL(icon.url);

      router.push(`/thread/${thread.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create thread.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Card className="border-border/50 bg-linear-to-b from-card to-card/80 shadow-xl overflow-hidden">
        <CardHeader className="pb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Create New Thread</CardTitle>
              <CardDescription>Start a new discussion</CardDescription>
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* Cover Image & Icon Row */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                Thread Branding
              </Label>

              {/* Cover Image */}
              <div className="relative">
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverSelect}
                  className="hidden"
                />
                {coverImage ? (
                  <div className="relative aspect-3/1 w-full rounded-xl overflow-hidden bg-muted border group">
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
                          if (coverImage.url)
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
                    className="w-full aspect-3/1 rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/30 hover:bg-muted/50 transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-sm font-medium">Add Cover Image</span>
                  </button>
                )}

                {/* Icon - Positioned on Cover */}
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
              <div className="flex items-center justify-between">
                <Label htmlFor="title">Title</Label>
                <span className={`text-xs ${
                  titleTrimmed.length < TITLE_MIN_LENGTH 
                    ? 'text-muted-foreground' 
                    : titleTrimmed.length > TITLE_MAX_LENGTH 
                      ? 'text-destructive' 
                      : 'text-green-600'
                }`}>
                  {titleTrimmed.length}/{TITLE_MAX_LENGTH}
                </span>
              </div>
              <Input
                id="title"
                placeholder="Enter a catchy title (min. 3 characters)..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`h-12 text-lg ${titleTrimmed.length > 0 && !isTitleValid ? 'border-destructive' : ''}`}
                required
                minLength={TITLE_MIN_LENGTH}
                maxLength={TITLE_MAX_LENGTH}
              />
              {titleTrimmed.length > 0 && titleTrimmed.length < TITLE_MIN_LENGTH && (
                <p className="text-xs text-destructive">Title must be at least {TITLE_MIN_LENGTH} characters</p>
              )}
            </div>

            {/* Content */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="body">Content</Label>
                <span className={`text-xs ${
                  bodyTrimmed.length < BODY_MIN_LENGTH 
                    ? 'text-muted-foreground' 
                    : bodyTrimmed.length > BODY_MAX_LENGTH 
                      ? 'text-destructive' 
                      : 'text-green-600'
                }`}>
                  {bodyTrimmed.length}/{BODY_MAX_LENGTH.toLocaleString()}
                </span>
              </div>
              <Textarea
                id="body"
                placeholder="Share your thoughts (min. 10 characters)..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                className={`resize-none ${bodyTrimmed.length > 0 && !isBodyValid ? 'border-destructive' : ''}`}
                required
                minLength={BODY_MIN_LENGTH}
                maxLength={BODY_MAX_LENGTH}
              />
              {bodyTrimmed.length > 0 && bodyTrimmed.length < BODY_MIN_LENGTH && (
                <p className="text-xs text-destructive">Content must be at least {BODY_MIN_LENGTH} characters</p>
              )}
            </div>

            {/* Category Selector */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <TagIcon className="h-4 w-4 text-muted-foreground" />
                Category
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {threadCategories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setThreadCategory(cat.value)}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-all ${
                      threadCategory === cat.value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <span className="text-xl">{cat.icon}</span>
                    <p className="font-medium text-xs">{cat.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            {availableTags.length > 0 && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <TagIcon className="h-4 w-4 text-muted-foreground" />
                  Tags
                </Label>
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        className="gap-1 px-3 py-1"
                      >
                        #{tag.name}
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
                  <SelectTrigger className="bg-muted/30">
                    <SelectValue placeholder="Add tags..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTags
                      .filter(
                        (tag) => !selectedTags.find((t) => t.id === tag.id)
                      )
                      .map((tag) => (
                        <SelectItem key={tag.id} value={tag.id}>
                          #{tag.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Market Toggle */}
            <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Market Analytics</p>
                  <p className="text-sm text-muted-foreground">
                    Track prices and trading
                  </p>
                </div>
              </div>
              <Switch
                checked={enableMarket}
                onCheckedChange={setEnableMarket}
              />
            </div>

            {/* Info: Market category matches thread category */}
            {enableMarket && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
                <p className="text-sm text-green-600 dark:text-green-400">
                  ✓ Market analytics will track <strong>{threadCategories.find(c => c.value === threadCategory)?.label}</strong> prices
                </p>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>

          <CardFooter className="flex justify-between gap-4 pt-6 border-t">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="px-8 rounded-full"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create Thread
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
          aspectRatio={cropType === "cover" ? 3 / 1 : 1}
          cropShape={cropType === "icon" ? "round" : "rect"}
          title={cropType === "cover" ? "Crop Banner Image" : "Crop Icon"}
        />
      )}
    </div>
  );
}
