"use client";

import { useState, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { TradeBadge } from "./trade-badge";
import { PriceDisplay } from "./price-display";
import { TradeActions } from "./trade-actions";
import {
  MoreHorizontal,
  Flag,
  MessageSquare,
  Edit,
  Trash,
  Heart,
  Repeat2,
  Share,
  X,
  Loader2,
  ImageIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAuthModal } from "@/lib/auth-modal-context";
import forumsApi from "@/lib/forums-api";
import { uploadImage, compressImage, uploadBase64Image } from "@/lib/file-api";
import type { ForumsPost } from "@/lib/types";
import { CommentModal } from "./comment-modal";
import { cn } from "@/lib/utils";

import { ImageViewer } from "@/components/ui/image-viewer";
import { ImageCropper } from "@/components/ui/image-cropper";
import { Badge } from "@/components/ui/badge";

interface PostCardProps {
  post: ForumsPost;
  replies?: ForumsPost[];
  onUpdate?: () => void;
}

export function PostCard({
  post: initialPost,
  replies = [],
  onUpdate,
}: PostCardProps) {
  const { user: currentUser, isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [showActions, setShowActions] = useState(false);
  const [post, setPost] = useState(initialPost);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  // Crop state
  const [croppingImage, setCroppingImage] = useState<string | null>(null);

  // Edit & Delete states
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editBody, setEditBody] = useState(post.body);
  const [editImages, setEditImages] = useState<
    { url: string; file?: File; isExisting?: boolean }[]
  >([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingEdit, setIsUploadingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editIntent, setEditIntent] = useState<"WTS" | "WTB" | "WTT" | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const postAuthorId = post.authorId || post.userId || "";
  const postAuthor = post.author || post.user;

  const [likeCount, setLikeCount] = useState(post.likes?.length || 0);
  const [isLiked, setIsLiked] = useState(
    post.likes?.some((like) => like.userId === currentUser?.id) || false
  );

  // Handle Edit Image Selection
  const handleEditImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setCroppingImage(url);
    }
    if (editFileInputRef.current) {
      editFileInputRef.current.value = "";
    }
  };

  const handleCropComplete = async (croppedImageUrl: string) => {
    setEditImages((prev) => [...prev, { url: croppedImageUrl }]);
    setCroppingImage(null);
  };
  const [isLiking, setIsLiking] = useState(false);

  // Handle Edit Post
  const handleEdit = async () => {
    if (!editBody.trim() && editImages.length === 0) return;
    if (isEditing) return;

    setIsEditing(true);
    try {
      // Upload new images to file server
      const uploadedImageUrls: string[] = [];
      const newImages = editImages.filter((img) => !img.isExisting);
      const existingImages = editImages
        .filter((img) => img.isExisting)
        .map((img) => img.url);

      if (newImages.length > 0) {
        setIsUploadingEdit(true);
        for (const img of newImages) {
          try {
            if (img.file) {
              const compressed = await compressImage(img.file, 1024, 0.8);
              const result = await uploadImage(compressed);
              uploadedImageUrls.push(result.url);
            } else if (img.url.startsWith("data:")) {
              const result = await uploadBase64Image(img.url, "edited-image.jpg");
              uploadedImageUrls.push(result.url);
            }
          } catch (uploadErr) {
            console.error("Failed to upload image:", uploadErr);
          }
        }
        setIsUploadingEdit(false);
      }

      // Combine existing URLs with newly uploaded URLs
      const allImageUrls = [...existingImages, ...uploadedImageUrls];

      let finalBody = editBody.trim();
      if (editIntent) {
        finalBody += ` #${editIntent}`;
      }

      const updatedPost = await forumsApi.posts.update(post.id, {
        body: finalBody,
        extendedData: {
          ...post.extendedData,
          images: allImageUrls.length > 0 ? allImageUrls : undefined,
        },
      });
      
      setPost(updatedPost);
      setShowEditDialog(false);
      onUpdate?.();
    } catch (error) {
      console.error("Failed to edit post:", error);
      alert("Failed to edit post. Please try again.");
    } finally {
      setIsEditing(false);
    }
  };

  // Remove Edit Image
  const removeEditImage = (index: number) => {
    setEditImages((prev) => {
      const newImages = [...prev];
      if (!newImages[index].isExisting) {
        URL.revokeObjectURL(newImages[index].url);
      }
      newImages.splice(index, 1);
      return newImages;
    });
  };

  // Initialize edit images when opening edit dialog
  const openEditDialog = () => {
    // Clean up [Image X] tags from legacy posts
    let cleanBody = post.body.replace(/\n\n\[Image \d+\]\s*/g, "").trim();
    
    // Detect and strip intent tag
    const currentIntent = detectIntent(cleanBody);
    if (currentIntent) {
      setEditIntent(currentIntent);
      cleanBody = cleanBody.replace(new RegExp(`#${currentIntent}`, "gi"), "").trim();
    } else {
      setEditIntent(null);
    }

    setEditBody(cleanBody);
    // Load existing images
    const existingImages = (post.extendedData?.images || []).map(
      (url: string) => ({
        url,
        isExisting: true,
      })
    );
    setEditImages(existingImages);
    setShowEditDialog(true);
  };

  // Handle Delete Post
  const handleDelete = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      await forumsApi.posts.delete(post.id);
      setShowDeleteDialog(false);
      onUpdate?.();
    } catch (error) {
      console.error("Failed to delete post:", error);
      alert("Failed to delete post. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const trade = post.extendedData?.trade;
  const images = post.extendedData?.images || [];
  const isOwner = currentUser?.id === postAuthorId;

  const detectIntent = (text: string): "WTS" | "WTB" | "WTT" | null => {
    const upper = text.toUpperCase();
    if (upper.includes("#WTS")) return "WTS";
    if (upper.includes("#WTB")) return "WTB";
    if (upper.includes("#WTT")) return "WTT";
    return null;
  };
  const intent = detectIntent(post.body);

  const intentStyles: Record<string, string> = {
    WTS: "bg-green-500 text-white shadow-lg shadow-green-500/25",
    WTB: "bg-yellow-500 text-black shadow-lg shadow-yellow-500/25",
    WTT: "bg-orange-500 text-white shadow-lg shadow-orange-500/25",
  };

  const intentBgStyles: Record<string, string> = {
    WTS: "bg-green-500/5 border-green-500/20",
    WTB: "bg-blue-500/5 border-blue-500/20",
    WTT: "bg-orange-500/5 border-orange-500/20",
  };

  const displayBody = post.body.replace(/\n\n\[Image \d+\]\s*/g, "").trim();

  const handleLike = async () => {
    if (!isAuthenticated || isLiking) return;

    setIsLiking(true);
    try {
      if (isLiked) {
        await forumsApi.posts.unlike(post.id, currentUser?.id);
        setIsLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
      } else {
        await forumsApi.posts.like(post.id, currentUser?.id);
        setIsLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <>
      <div
        id={`post-${post.id}`}
        className={cn(
          "group relative rounded-2xl border border-border bg-card transition-all duration-300 hover:shadow-lg",
          intentBgStyles[intent || ""] || ""
        )}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className="p-4">
          <div className="flex gap-3">
            {/* Author Avatar */}
            <Link href={`/user/${postAuthorId}`} className="shrink-0 relative">
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarImage
                  src={postAuthor?.avatarUrl || undefined}
                  alt={postAuthor?.displayName}
                />
                <AvatarFallback className="bg-linear-to-br from-primary to-accent text-primary-foreground font-bold">
                  {postAuthor?.displayName?.charAt(0).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute top-10 left-1/2 -translate-x-1/2 w-px h-3 bg-primary/30" />
            </Link>

            <div className="min-w-0 flex-1">
              {/* Author & Time Row */}
              <div className="flex items-start justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/user/${postAuthorId}`}
                    className="font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    {postAuthor?.displayName || "Anonymous"}
                  </Link>

                  {postAuthor && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 border border-yellow-500/20">
                      New
                    </span>
                  )}

                  {intent && (
                    <span
                      className={cn(
                        "px-2.5 py-0.5 text-xs font-bold rounded-full",
                        intentStyles[intent]
                      )}
                    >
                      {intent}
                    </span>
                  )}

                  <span className="text-muted-foreground">·</span>
                  <span className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {formatDistanceToNow(new Date(post.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>

                {/* More Options */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 rounded-full transition-all",
                        showActions
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      )}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48 rounded-lg border-border bg-card p-1"
                  >
                    <DropdownMenuItem className="rounded-md focus:bg-muted">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Comment
                    </DropdownMenuItem>
                    {isOwner && (
                      <>
                        <DropdownMenuItem
                          className="rounded-md focus:bg-muted"
                          onClick={openEditDialog}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border" />
                        <DropdownMenuItem
                          className="text-destructive rounded-md focus:bg-destructive/10"
                          onClick={() => setShowDeleteDialog(true)}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                    {!isOwner && (
                      <DropdownMenuItem className="rounded-md focus:bg-muted">
                        <Flag className="mr-2 h-4 w-4" />
                        Report
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Trade Badge */}
              {trade?.isTrade && (
                <div className="mt-2 flex items-center gap-3">
                  <TradeBadge intent={trade.intent} status={trade.status} />
                  {trade.normalizedPrice !== null && (
                    <PriceDisplay
                      price={trade.normalizedPrice}
                      displayPrice={trade.displayPrice}
                      currency={trade.currency}
                      status={trade.status}
                    />
                  )}
                </div>
              )}

              {/* Post Body */}
              <div className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
                {displayBody}
              </div>

              {/* Image Grid - Facebook Style */}
              {images.length > 0 && (
                <div className="mt-3 space-y-1">

                  {/* Main Image - Flexible Aspect Ratio */}
                  <button
                    type="button"
                    onClick={() => setLightboxImage(images[0])}
                    className="relative w-full overflow-hidden rounded-xl border border-border bg-muted/50 transition-all duration-300 hover:brightness-95 flex justify-center bg-black/5"
                  >
                    <img
                      src={images[0] || "/placeholder.svg"}
                      alt="Image 1"
                      className="w-auto mx-auto max-w-full max-h-[600px] object-contain"
                    />
                  </button>

                  {/* Additional Images - Small thumbnails grid */}
                  {images.length > 1 && (
                    <div className="grid grid-cols-4 gap-1">
                      {images.slice(1, 5).map((img, index) => (
                        <button
                          key={index + 1}
                          type="button"
                          onClick={() => setLightboxImage(img)}
                          className={cn(
                            "relative aspect-square overflow-hidden rounded-lg border border-border bg-muted/50 transition-all duration-300 hover:brightness-90",
                            index === 3 && images.length > 5 ? "relative" : ""
                          )}
                        >
                          {img.startsWith("data:") ? (
                            <img
                              src={img || "/placeholder.svg"}
                              alt={`Image ${index + 2}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Image
                              src={img || "/placeholder.svg"}
                              alt={`Image ${index + 2}`}
                              fill
                              className="object-cover"
                              sizes="150px"
                            />
                          )}
                          {/* Overlay for remaining images count */}
                          {index === 3 && images.length > 5 && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-lg font-bold text-white">
                              +{images.length - 5}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Trade Actions */}
              {trade?.isTrade && (
                <TradeActions
                  post={post}
                  isOwner={isOwner}
                  onUpdate={onUpdate}
                  className="mt-3"
                />
              )}

              {/* Engagement Actions - Facebook Style */}
              <div className="mt-4 border-t border-border/50 pt-1">
                {/* Stats row */}
                <div className="flex items-center justify-between px-2 py-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    {likeCount > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500">
                          <Heart className="h-3 w-3 fill-white text-white" />
                        </span>
                        {likeCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {replies.length}
                    </span>
                  </div>
                </div>

                {/* Action buttons row */}
                <div className="flex border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLike}
                    disabled={!isAuthenticated || isLiking}
                    className={cn(
                      "flex-1 gap-2 rounded-none py-3 h-auto font-normal",
                      isLiked
                        ? "text-primary hover:bg-primary/10"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Heart
                      className={cn("h-5 w-5", isLiked ? "fill-current" : "")}
                    />
                    <span>Like</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCommentModal(true)}
                    className="flex-1 gap-2 rounded-none py-3 h-auto font-normal text-muted-foreground hover:bg-muted"
                  >
                    <MessageSquare className="h-5 w-5" />
                    <span>Comment</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 gap-2 rounded-none py-3 h-auto font-normal text-muted-foreground hover:bg-muted"
                  >
                    <Share className="h-5 w-5" />
                    <span>Share</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      <ImageViewer
        isOpen={lightboxImage !== null}
        onClose={() => setLightboxImage(null)}
        images={images}
        initialIndex={lightboxImage ? images.indexOf(lightboxImage) : 0}
      />

      {/* Comment Modal */}
      <CommentModal
        post={post}
        isOpen={showCommentModal}
        onClose={() => setShowCommentModal(false)}
        onUpdate={onUpdate}
      />

      {/* Edit Post Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
            <DialogDescription>
              Make changes to your post below.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              placeholder="What's on your mind?"
              className="min-h-[120px] resize-none"
            />

            {/* Tag Selection */}
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={editIntent === "WTS" ? "default" : "outline"}
                className={`cursor-pointer ${
                  editIntent === "WTS" ? "bg-green-500 hover:bg-green-600" : ""
                }`}
                onClick={() =>
                  setEditIntent((prev) => (prev === "WTS" ? null : "WTS"))
                }
              >
                WTS
              </Badge>
              <Badge
                variant={editIntent === "WTB" ? "default" : "outline"}
                className={`cursor-pointer ${
                  editIntent === "WTB" ? "bg-yellow-500 hover:bg-yellow-600 text-black hover:text-black" : ""
                }`}
                onClick={() =>
                  setEditIntent((prev) => (prev === "WTB" ? null : "WTB"))
                }
              >
                WTB
              </Badge>
              <Badge
                variant={editIntent === "WTT" ? "default" : "outline"}
                className={`cursor-pointer ${
                  editIntent === "WTT" ? "bg-orange-500 hover:bg-orange-600" : ""
                }`}
                onClick={() =>
                  setEditIntent((prev) => (prev === "WTT" ? null : "WTT"))
                }
              >
                WTT
              </Badge>
            </div>

            {/* Image Previews */}
            {editImages.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {editImages.map((img, index) => (
                  <div
                    key={index}
                    className="relative rounded-lg overflow-hidden group"
                  >
                    <img
                      src={img.url}
                      alt={`Image ${index + 1}`}
                      className="w-full h-32 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeEditImage(index)}
                      className="absolute top-2 right-2 rounded-full bg-black/70 p-1.5 text-white transition-opacity opacity-0 group-hover:opacity-100 hover:bg-black"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Image Upload */}
            <div className="flex items-center gap-2">
              <input
                ref={editFileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleEditImageSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => editFileInputRef.current?.click()}
                className="gap-2"
              >
                <ImageIcon className="h-4 w-4" />
                Add Images
              </Button>
              <span className="text-xs text-muted-foreground">
                {editImages.length} image(s)
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={isEditing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={
                isEditing || (!editBody.trim() && editImages.length === 0)
              }
            >
              {isEditing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Image Cropper */}
      {croppingImage && (
        <ImageCropper
          open={!!croppingImage}
          onClose={() => setCroppingImage(null)}
          imageSrc={croppingImage}
          onCropComplete={handleCropComplete}
          aspectRatio={undefined} // Start with free crop
        />
      )}
    </>
  );
}
