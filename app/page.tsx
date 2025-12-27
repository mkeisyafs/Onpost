import { ThreadList } from "@/components/thread/thread-list"

export default function HomePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Latest Listings</h1>
        <p className="mt-1 text-muted-foreground">Browse the newest trade posts from the community</p>
      </div>
      <ThreadList />
    </div>
  )
}
