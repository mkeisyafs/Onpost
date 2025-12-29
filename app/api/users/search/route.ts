import { type NextRequest, NextResponse } from "next/server";

const BASE_URL = process.env.FORUMS_API_URL || "https://foru.ms/api/v1";
const API_KEY = process.env.FORUMS_API_KEY || "";

interface PostUser {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

interface ForumsPost {
  id: string;
  userId: string;
  user?: PostUser;
}

interface PostsResponse {
  posts: ForumsPost[];
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q")?.toLowerCase() || "";

  if (!query || query.length < 2) {
    return NextResponse.json(
      { users: [], message: "Query must be at least 2 characters" },
      { status: 200 }
    );
  }

  try {
    // Fetch recent posts to get user data
    const response = await fetch(`${BASE_URL}/posts?limit=100`, {
      headers: {
        "x-api-key": API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data: PostsResponse = await response.json();

    // Extract unique users from posts
    const usersMap = new Map<string, PostUser>();

    for (const post of data.posts || []) {
      if (post.user && post.user.id) {
        const user = post.user;
        const username = user.username?.toLowerCase() || "";
        const displayName = user.displayName?.toLowerCase() || "";

        // Check if user matches the search query
        if (username.includes(query) || displayName.includes(query)) {
          if (!usersMap.has(user.id)) {
            usersMap.set(user.id, {
              id: user.id,
              username: user.username,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
            });
          }
        }
      }
    }

    const users = Array.from(usersMap.values()).slice(0, 10);

    return NextResponse.json({ users });
  } catch (error) {
    console.error("User search error:", error);
    return NextResponse.json(
      { users: [], error: "Failed to search users" },
      { status: 500 }
    );
  }
}
