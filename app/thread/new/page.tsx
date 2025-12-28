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
import {
  X,
  ImageIcon,
  Sparkles,
  Tag as TagIcon,
  TrendingUp,
  User,
} from "lucide-react";
import forumsApi from "@/lib/forums-api";
import Link from "next/link";
import type { ThreadMarketData, Tag, ThreadExtendedData } from "@/lib/types";

export default function NewThreadPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [enableMarket, setEnableMarket] = useState(false);
  const [marketCategory, setMarketCategory] = useState<
    "ITEM_MARKET" | "ACCOUNT_MARKET" | "PHYSICAL_ITEM" | "GENERAL"
  >("ITEM_MARKET");
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

  // Thread categories for filtering
  const threadCategories = [
    { value: "game-items", label: "Game Items", icon: "🎮" },
    { value: "accounts", label: "Accounts", icon: "👤" },
    { value: "physical", label: "Physical Items", icon: "📦" },
    { value: "services", label: "Services", icon: "🛒" },
  ] as const;

  const marketCategories = [
    {
      value: "ITEM_MARKET",
      label: "Game Items",
      desc: "In-game items, currency, materials",
      icon: "🎮",
    },
    {
      value: "ACCOUNT_MARKET",
      label: "Game Accounts",
      desc: "Full accounts, characters, profiles",
      icon: "👤",
    },
    {
      value: "PHYSICAL_ITEM",
      label: "Physical Items",
      desc: "Electronics, fashion, collectibles",
      icon: "📦",
    },
    {
      value: "GENERAL",
      label: "General",
      desc: "Services, other items",
      icon: "🛒",
    },
  ];

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
      if (coverImage?.url) URL.revokeObjectURL(coverImage.url);
      setCoverImage({ url: URL.createObjectURL(file), file });
    }
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  const handleIconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      if (icon?.url) URL.revokeObjectURL(icon.url);
      setIcon({ url: URL.createObjectURL(file), file });
    }
    if (iconInputRef.current) iconInputRef.current.value = "";
  };

  const compressImage = async (
    file: File,
    maxSize: number
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement("img");
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      let coverImageBase64: string | undefined;
      let iconBase64: string | undefined;

      if (coverImage?.file) {
        coverImageBase64 = await compressImage(coverImage.file, 800);
      }
      if (icon?.file) {
        iconBase64 = await compressImage(icon.file, 256);
      }

      const marketData: ThreadMarketData | undefined = enableMarket
        ? {
            marketEnabled: true,
            marketTypeFinal: marketCategory,
            marketTypeCandidate: marketCategory,
            windowDays: 14,
            thresholdValid: 10,
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
        : undefined;

      const extendedData: ThreadExtendedData = {
        category: threadCategory,
      };
      if (marketData) extendedData.market = marketData;
      if (coverImageBase64) extendedData.coverImage = coverImageBase64;
      if (iconBase64) extendedData.icon = iconBase64;

      const thread = await forumsApi.threads.create({
        title: title.trim(),
        body: body.trim(),
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
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Enter a catchy title..."
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
                placeholder="Share your thoughts..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                className="resize-none"
                required
              />
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

            {/* Market Category Selector - Show only when market is enabled */}
            {enableMarket && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <TagIcon className="h-4 w-4 text-muted-foreground" />
                  Market Category
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {marketCategories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() =>
                        setMarketCategory(cat.value as typeof marketCategory)
                      }
                      className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                        marketCategory === cat.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <div>
                        <p className="font-medium text-sm">{cat.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {cat.desc}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
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
              disabled={isSubmitting || !title.trim() || !body.trim()}
              className="px-8 rounded-full"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Sparkles className="mr-2 h-4 w-4 animate-spin" />
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
    </div>
  );
}
