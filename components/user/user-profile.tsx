"use client"

import { useState } from "react"
import useSWR from "swr"
import forumsApi from "@/lib/forums-api"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrustBadge } from "./trust-badge"
import { TrustDetails } from "./trust-details"
import { UserListings } from "./user-listings"
import { UserThreads } from "./user-threads"
import { UserProfileSkeleton } from "./user-profile-skeleton"
import { useAuth } from "@/lib/auth-context"
import { formatDistanceToNow } from "date-fns"
import { MessageSquare, Calendar, Edit, ShoppingBag, FileText } from "lucide-react"
import Link from "next/link"

interface UserProfileProps {
  userId: string
}

export function UserProfile({ userId }: UserProfileProps) {
  const { user: currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState("listings")

  const {
    data: user,
    error,
    isLoading,
  } = useSWR(["user", userId], () => forumsApi.users.get(userId), {
    revalidateOnFocus: false,
  })

  if (isLoading) {
    return <UserProfileSkeleton />
  }

  if (error || !user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <h2 className="text-lg font-semibold text-foreground">User not found</h2>
            <p className="mt-2 text-muted-foreground">This user may not exist or has been deleted.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isOwnProfile = currentUser?.id === user.id
  const trust = user.extendedData?.trust

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-start gap-6 sm:flex-row">
            {/* Avatar */}
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName} />
              <AvatarFallback className="text-2xl">{user.displayName?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{user.displayName}</h1>
                  <p className="text-muted-foreground">@{user.username}</p>
                </div>
                {isOwnProfile ? (
                  <Button variant="outline" size="sm">
                    <Edit className="mr-1 h-4 w-4" />
                    Edit Profile
                  </Button>
                ) : (
                  <Button size="sm" asChild>
                    <Link href={`/messages/compose?recipientId=${user.id}`}>
                      <MessageSquare className="mr-1 h-4 w-4" />
                      Message
                    </Link>
                  </Button>
                )}
              </div>

              {/* Trust Badge & Join Date */}
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <TrustBadge trust={trust} />
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Joined {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trust Details */}
      {trust && (
        <div className="mt-6">
          <TrustDetails trust={trust} userId={userId} />
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="listings" className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Listings
          </TabsTrigger>
          <TabsTrigger value="threads" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Threads
          </TabsTrigger>
        </TabsList>
        <TabsContent value="listings" className="mt-6">
          <UserListings userId={userId} />
        </TabsContent>
        <TabsContent value="threads" className="mt-6">
          <UserThreads userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
