"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { ForumsUser } from "@/lib/types"
import forumsApi from "@/lib/forums-api"
import { useAuth } from "@/lib/auth-context"
import { User, FileText, Loader2, CheckCircle2 } from "lucide-react"

interface EditProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: ForumsUser
  onProfileUpdated: (updatedUser: ForumsUser) => void
}

export function EditProfileModal({
  open,
  onOpenChange,
  user,
  onProfileUpdated,
}: EditProfileModalProps) {
  const { refreshUser } = useAuth()
  
  // Form state
  const [displayName, setDisplayName] = useState(user.displayName || "")
  const [bio, setBio] = useState(user.bio || "")
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  // Reset form when user changes or modal opens
  useEffect(() => {
    if (open) {
      setDisplayName(user.displayName || "")
      setBio(user.bio || "")
      setError(null)
      setShowSuccess(false)
    }
  }, [open, user])

  // Character limits
  const BIO_MAX_LENGTH = 500
  const DISPLAY_NAME_MAX_LENGTH = 50

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    // Validation
    if (!displayName.trim()) {
      setError("Display name is required")
      setIsSubmitting(false)
      return
    }

    if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
      setError(`Display name must be ${DISPLAY_NAME_MAX_LENGTH} characters or less`)
      setIsSubmitting(false)
      return
    }

    if (bio.length > BIO_MAX_LENGTH) {
      setError(`Bio must be ${BIO_MAX_LENGTH} characters or less`)
      setIsSubmitting(false)
      return
    }

    try {
      const updatedUser = await forumsApi.users.update(user.id, {
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
      })

      // Refresh auth context to update user data globally
      await refreshUser()
      
      // Show success animation
      setShowSuccess(true)
      
      // Notify parent component
      onProfileUpdated(updatedUser)

      // Close modal after brief success display
      setTimeout(() => {
        onOpenChange(false)
      }, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasChanges = 
    displayName !== (user.displayName || "") ||
    bio !== (user.bio || "")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {showSuccess ? (
          // Success State
          <div className="flex flex-col items-center justify-center py-8 animate-in fade-in zoom-in duration-300">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full animate-pulse" />
              <div className="relative w-20 h-20 rounded-full bg-linear-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
            </div>
            <h3 className="mt-6 text-xl font-semibold text-foreground">Profile Updated!</h3>
            <p className="mt-2 text-sm text-muted-foreground">Your changes have been saved successfully.</p>
          </div>
        ) : (
          // Form State
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="p-2 bg-linear-to-br from-green-500/10 to-emerald-500/10 rounded-lg">
                  <User className="h-5 w-5 text-green-600" />
                </div>
                Edit Profile
              </DialogTitle>
              <DialogDescription>
                Make changes to your profile information. Click save when you&apos;re done.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5 pt-2">
              {/* Avatar Preview */}
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
                <Avatar className="h-16 w-16 border-2 border-background shadow-md">
                  <AvatarImage src={user.avatarUrl || undefined} alt={displayName} />
                  <AvatarFallback className="text-lg bg-linear-to-br from-green-500 to-emerald-600 text-white">
                    {displayName?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {displayName || user.displayName || "Your Name"}
                  </p>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                </div>
              </div>

              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="displayName" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Display Name
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Your display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={DISPLAY_NAME_MAX_LENGTH}
                  required
                  className="transition-all focus:ring-green-500/20"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {displayName.length}/{DISPLAY_NAME_MAX_LENGTH}
                </p>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio" className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Bio
                </Label>
                <Textarea
                  id="bio"
                  placeholder="Tell others about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={BIO_MAX_LENGTH}
                  className="min-h-[100px] resize-none transition-all focus:ring-green-500/20"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {bio.length}/{BIO_MAX_LENGTH}
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive" className="animate-in slide-in-from-top-2 duration-200">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Footer */}
              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !hasChanges}
                  className="min-w-[100px] bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
