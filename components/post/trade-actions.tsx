"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MessageSquare, CheckCircle, Clock, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import forumsApi from "@/lib/forums-api"
import { cn } from "@/lib/utils"
import type { ForumsPost } from "@/lib/types"

interface TradeActionsProps {
  post: ForumsPost
  isOwner: boolean
  onUpdate?: () => void
  className?: string
}

export function TradeActions({ post, isOwner, onUpdate, className }: TradeActionsProps) {
  const router = useRouter()
  const [soldDialogOpen, setSoldDialogOpen] = useState(false)
  const [finalPrice, setFinalPrice] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  const trade = post.extendedData?.trade
  if (!trade) return null

  const handleContactSeller = () => {
    // Navigate to PM compose with pre-filled data
    const params = new URLSearchParams({
      recipientId: post.authorId,
      linkedPostId: post.id,
      subject: `Re: ${trade.intent} Inquiry`,
    })
    router.push(`/messages/compose?${params}`)
  }

  const handleMarkAsSold = async () => {
    setIsUpdating(true)
    try {
      await forumsApi.posts.update(post.id, {
        extendedData: {
          trade: {
            ...trade,
            status: "SOLD",
            finalPrice: finalPrice ? Number.parseFloat(finalPrice) : trade.normalizedPrice,
          },
        },
      })
      setSoldDialogOpen(false)
      onUpdate?.()
    } catch (error) {
      console.error("Failed to update post:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleMarkAsReserved = async () => {
    setIsUpdating(true)
    try {
      await forumsApi.posts.update(post.id, {
        extendedData: {
          trade: {
            ...trade,
            status: "RESERVED",
          },
        },
      })
      onUpdate?.()
    } catch (error) {
      console.error("Failed to update post:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleReactivate = async () => {
    setIsUpdating(true)
    try {
      await forumsApi.posts.update(post.id, {
        extendedData: {
          trade: {
            ...trade,
            status: "ACTIVE",
          },
        },
      })
      onUpdate?.()
    } catch (error) {
      console.error("Failed to update post:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Buyer Actions */}
      {!isOwner && trade.status === "ACTIVE" && (
        <Button size="sm" onClick={handleContactSeller}>
          <MessageSquare className="mr-1 h-4 w-4" />
          Contact Seller
        </Button>
      )}

      {/* Seller Actions */}
      {isOwner && trade.status === "ACTIVE" && (
        <>
          <Button size="sm" variant="outline" onClick={handleMarkAsReserved} disabled={isUpdating}>
            <Clock className="mr-1 h-4 w-4" />
            Mark Reserved
          </Button>
          <Button size="sm" onClick={() => setSoldDialogOpen(true)} disabled={isUpdating}>
            <CheckCircle className="mr-1 h-4 w-4" />
            Mark as Sold
          </Button>
        </>
      )}

      {isOwner && trade.status === "RESERVED" && (
        <>
          <Button size="sm" variant="outline" onClick={handleReactivate} disabled={isUpdating}>
            <XCircle className="mr-1 h-4 w-4" />
            Unreserve
          </Button>
          <Button size="sm" onClick={() => setSoldDialogOpen(true)} disabled={isUpdating}>
            <CheckCircle className="mr-1 h-4 w-4" />
            Mark as Sold
          </Button>
        </>
      )}

      {isOwner && (trade.status === "SOLD" || trade.status === "FULFILLED") && (
        <Button size="sm" variant="outline" onClick={handleReactivate} disabled={isUpdating}>
          Relist
        </Button>
      )}

      {/* Sold Dialog */}
      <Dialog open={soldDialogOpen} onOpenChange={setSoldDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Sold</DialogTitle>
            <DialogDescription>
              Optionally enter the final agreed price. This helps improve market analytics.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="finalPrice">Final Price (optional)</Label>
            <Input
              id="finalPrice"
              type="number"
              placeholder={trade.normalizedPrice?.toString() || "Enter price"}
              value={finalPrice}
              onChange={(e) => setFinalPrice(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSoldDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkAsSold} disabled={isUpdating}>
              {isUpdating ? "Updating..." : "Confirm Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
