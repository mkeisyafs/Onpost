"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import forumsApi from "@/lib/forums-api";
import type { ForumsUser } from "@/lib/types";
import { EditProfileModal } from "./edit-profile-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrustBadge } from "./trust-badge";
import { TrustDetails } from "./trust-details";
import { UserListings } from "./user-listings";
import { UserThreads } from "./user-threads";
import { UserProfileSkeleton } from "./user-profile-skeleton";

import { useAuth } from "@/lib/auth-context";
import { formatDistanceToNow } from "date-fns";
import {
  MessageSquare,
  Calendar,
  Edit,
  ShoppingBag,
  FileText,
} from "lucide-react";
import Link from "next/link";

import { Skeleton } from "../ui/skeleton";
import { FeedPostCard, type ExtendedPost } from "../post/feed-post-card";

interface UserProfileProps {
  userId: string;
}

export function UserProfile({ userId }: UserProfileProps) {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("listings");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userPosts, setUserPosts] = useState<ExtendedPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);

  const {
    data: user,
    error,
    isLoading,
    mutate,
  } = useSWR(["user", userId], () => forumsApi.users.get(userId), {
    revalidateOnFocus: false,
  });

  // Fetch user's posts
  useEffect(() => {
    const fetchUserPosts = async () => {
      setIsLoadingPosts(true);
      try {
        // Fetch threads to get user's posts
        const threadsRes = await forumsApi.threads.list({ limit: 50 });
        const allPosts: ExtendedPost[] = [];

        // For each thread, get posts by this user
        for (const thread of threadsRes.threads.slice(0, 20)) {
          try {
            const postsRes = await forumsApi.posts.list(thread.id, {
              limit: 50,
            });
            const userPostsInThread = postsRes.posts.filter(
              (p) => p.authorId === userId || p.userId === userId
            );

            // Add thread info to each post
            userPostsInThread.forEach((post) => {
              allPosts.push({
                ...post,
                _threadTitle: thread.title,
                _threadId: thread.id,
              });
            });
          } catch (err) {
            // Skip failed threads
          }
        }

        // Sort by date
        allPosts.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setUserPosts(allPosts);
      } catch (err) {
        console.error("Failed to fetch user posts:", err);
      } finally {
        setIsLoadingPosts(false);
      }
    };

    if (userId) {
      fetchUserPosts();
    }
  }, [userId]);

  if (isLoading) {
    return <UserProfileSkeleton />;
  }

  if (error || !user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <h2 className="text-lg font-semibold text-foreground">
              User not found
            </h2>
            <p className="mt-2 text-muted-foreground">
              This user may not exist or has been deleted.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === user.id;
  const trust = user.extendedData?.trust;

  const handleProfileUpdated = (updatedUser: ForumsUser) => {
    // Update the SWR cache with the new user data
    mutate(updatedUser, false);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-start gap-6 sm:flex-row">
            {/* Avatar */}
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              <AvatarImage
                src={user.avatarUrl || undefined}
                alt={user.displayName}
              />
              <AvatarFallback className="text-2xl">
                {user.displayName?.charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {user.displayName}
                  </h1>
                  <p className="text-muted-foreground">@{user.username}</p>
                </div>
                {isOwnProfile ? (
                  <Button
                    size="sm"
                    onClick={() => setIsEditModalOpen(true)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Edit className="mr-1 h-4 w-4" />
                    Edit Profile
                  </Button>
                ) : (
                  <Button size="sm" asChild>
                    <Link href={`/messages`}>
                      <MessageSquare className="mr-1 h-4 w-4" />
                      Message
                    </Link>
                  </Button>
                )}
              </div>

              {/* Bio */}
              {user.bio && (
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {user.bio}
                </p>
              )}

              {/* Trust Badge & Join Date */}
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <TrustBadge trust={trust} />
                {user.createdAt && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Joined{" "}
                    {formatDistanceToNow(new Date(user.createdAt), {
                      addSuffix: true,
                    })}
                  </div>
                )}
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

      {/* User Posts */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Posts</h2>
          <span className="text-sm text-muted-foreground">
            ({userPosts.length})
          </span>
        </div>

        {isLoadingPosts ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : userPosts.length > 0 ? (
          <div className="space-y-4">
            {userPosts.map((post) => (
              <FeedPostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No posts yet</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Profile Modal */}
      {isOwnProfile && (
        <EditProfileModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          user={user}
          onProfileUpdated={handleProfileUpdated}
        />
      )}
    </div>
  );
}
