import { Suspense } from "react"
import { ThreadView } from "@/components/thread/thread-view"
import { ThreadSkeleton } from "@/components/thread/thread-skeleton"

interface ThreadPageProps {
  params: Promise<{ id: string }>
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { id } = await params

  return (
    <Suspense fallback={<ThreadSkeleton />}>
      <ThreadView threadId={id} />
    </Suspense>
  )
}
