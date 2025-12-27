import { Suspense } from "react"
import { UserProfile } from "@/components/user/user-profile"
import { UserProfileSkeleton } from "@/components/user/user-profile-skeleton"

interface UserPageProps {
  params: Promise<{ id: string }>
}

export default async function UserPage({ params }: UserPageProps) {
  const { id } = await params

  return (
    <Suspense fallback={<UserProfileSkeleton />}>
      <UserProfile userId={id} />
    </Suspense>
  )
}
