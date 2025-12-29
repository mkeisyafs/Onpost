// Foru.ms API Client

import type {
  ForumsUser,
  ForumsThread,
  ForumsPost,
  ForumsPrivateMessage,
  Tag,
  ThreadsResponse,
  PostsResponse,
  MessagesResponse,
  LoginRequest,
  RegisterRequest,
  PostExtendedData,
  ThreadExtendedData,
  UserExtendedData,
  LoginResponse,
  RegisterResponse,
} from "./types";

function getBaseUrl() {
  if (typeof window !== "undefined") {
    // Client-side: use our API proxy to avoid CORS
    return "/api/forums";
  }
  // Server-side: call Foru.ms directly
  return (process.env.FORUMS_BASE_URL || "https://foru.ms") + "/api/v1";
}

// Token storage (client-side)
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("forums_access_token", token);
    } else {
      localStorage.removeItem("forums_access_token");
    }
  }
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  if (typeof window !== "undefined") {
    return localStorage.getItem("forums_access_token");
  }
  return null;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}

// ============================================
// Auth Endpoints
// ============================================

export const auth = {
  async login(
    data: LoginRequest
  ): Promise<{ user: ForumsUser; token: string }> {
    const response = await request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        login: data.login,
        password: data.password,
      }),
    });
    // Store the token
    setAccessToken(response.token);
    // Fetch user data with the new token
    const user = await auth.me();
    return { user, token: response.token };
  },

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await request<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response;
  },

  async logout(): Promise<void> {
    setAccessToken(null);
  },

  async me(): Promise<ForumsUser> {
    return request<ForumsUser>("/auth/me");
  },

  async forgotPassword(email: string): Promise<{ resetToken: string }> {
    return request<{ resetToken: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(data: {
    password: string;
    oldPassword?: string;
    email?: string;
  }): Promise<{ message: string }> {
    return request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

// ============================================
// Thread Endpoints
// ============================================

export const threads = {
  async list(params?: {
    categoryId?: string;
    authorId?: string;
    filter?: "newest" | "oldest" | "popular";
    cursor?: string;
    limit?: number;
  }): Promise<ThreadsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.categoryId) searchParams.set("categoryId", params.categoryId);
    if (params?.authorId) searchParams.set("authorId", params.authorId);
    if (params?.filter) searchParams.set("filter", params.filter);
    if (params?.cursor) searchParams.set("cursor", params.cursor);
    if (params?.limit) searchParams.set("limit", params.limit.toString());

    const query = searchParams.toString();
    return request<ThreadsResponse>(`/threads${query ? `?${query}` : ""}`);
  },

  async get(id: string): Promise<ForumsThread> {
    return request<ForumsThread>(`/thread/${id}`);
  },

  async create(data: {
    title: string;
    body: string;
    userId?: string;
    categoryId?: string;
    tags?: string[];
    extendedData?: ThreadExtendedData;
  }): Promise<ForumsThread> {
    // Only include categoryId if provided
    const payload: Record<string, unknown> = {
      title: data.title,
      body: data.body,
    };
    if (data.userId) payload.userId = data.userId;
    if (data.categoryId) payload.categoryId = data.categoryId;
    if (data.tags && data.tags.length > 0) payload.tags = data.tags;
    if (data.extendedData) payload.extendedData = data.extendedData;

    return request<ForumsThread>("/thread", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(
    id: string,
    data: {
      title?: string;
      body?: string;
      tags?: string[];
      extendedData?: ThreadExtendedData;
    }
  ): Promise<ForumsThread> {
    return request<ForumsThread>(`/thread/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    await request(`/thread/${id}`, { method: "DELETE" });
  },
};

// ============================================
// Post Endpoints
// ============================================

export const posts = {
  async list(
    threadId: string,
    params?: {
      filter?: "newest" | "oldest";
      cursor?: string;
      limit?: number;
    }
  ): Promise<PostsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.filter) searchParams.set("filter", params.filter);
    if (params?.cursor) searchParams.set("cursor", params.cursor);
    if (params?.limit) searchParams.set("limit", params.limit.toString());

    const query = searchParams.toString();
    return request<PostsResponse>(
      `/thread/${threadId}/posts${query ? `?${query}` : ""}`
    );
  },

  async get(id: string): Promise<ForumsPost> {
    return request<ForumsPost>(`/post/${id}`);
  },

  async create(data: {
    threadId: string;
    body: string;
    userId?: string;
    parentId?: string;
    extendedData?: PostExtendedData;
  }): Promise<ForumsPost> {
    return request<ForumsPost>("/post", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(
    id: string,
    data: {
      body?: string;
      extendedData?: PostExtendedData;
    }
  ): Promise<ForumsPost> {
    return request<ForumsPost>(`/post/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    await request(`/post/${id}`, { method: "DELETE" });
  },

  async getLikes(id: string): Promise<{
    likes: Array<{
      userId: string;
      user?: { id: string; displayName: string };
    }>;
  }> {
    return request(`/post/${id}/likes`);
  },

  async like(id: string, userId?: string): Promise<void> {
    await request(`/post/${id}/likes`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
  },

  async unlike(id: string, userId?: string): Promise<void> {
    await request(`/post/${id}/likes`, {
      method: "DELETE",
      body: JSON.stringify({ userId }),
    });
  },
};

// ============================================
// User Endpoints
// ============================================

export const users = {
  async get(id: string): Promise<ForumsUser> {
    return request<ForumsUser>(`/user/${id}`);
  },

  async getByUsername(username: string): Promise<ForumsUser> {
    return request<ForumsUser>(`/user/username/${username}`);
  },

  async update(
    id: string,
    data: {
      displayName?: string;
      avatarUrl?: string;
      extendedData?: UserExtendedData;
    }
  ): Promise<ForumsUser> {
    return request<ForumsUser>(`/user/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async getPosts(
    userId: string,
    params?: {
      cursor?: string;
      limit?: number;
    }
  ): Promise<PostsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.cursor) searchParams.set("cursor", params.cursor);
    if (params?.limit) searchParams.set("limit", params.limit.toString());

    const query = searchParams.toString();
    return request<PostsResponse>(
      `/user/${userId}/posts${query ? `?${query}` : ""}`
    );
  },

  async getThreads(
    userId: string,
    params?: {
      cursor?: string;
      limit?: number;
    }
  ): Promise<ThreadsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.cursor) searchParams.set("cursor", params.cursor);
    if (params?.limit) searchParams.set("limit", params.limit.toString());

    const query = searchParams.toString();
    return request<ThreadsResponse>(
      `/user/${userId}/threads${query ? `?${query}` : ""}`
    );
  },

  async search(query: string): Promise<{ users: ForumsUser[] }> {
    const searchParams = new URLSearchParams();
    if (query) searchParams.set("q", query);
    searchParams.set("limit", "20");

    const queryString = searchParams.toString();
    return request<{ users: ForumsUser[] }>(
      `/users/search${queryString ? `?${queryString}` : ""}`
    );
  },
};

// ============================================
// Private Message Endpoints
// ============================================

export const messages = {
  async list(params?: {
    folder?: "inbox" | "sent";
    cursor?: string;
    limit?: number;
  }): Promise<MessagesResponse> {
    const searchParams = new URLSearchParams();
    if (params?.folder) searchParams.set("folder", params.folder);
    if (params?.cursor) searchParams.set("cursor", params.cursor);
    if (params?.limit) searchParams.set("limit", params.limit.toString());

    const query = searchParams.toString();
    return request<MessagesResponse>(
      `/private-messages${query ? `?${query}` : ""}`
    );
  },

  async get(id: string): Promise<ForumsPrivateMessage> {
    return request<ForumsPrivateMessage>(`/private-message/${id}`);
  },

  async getThread(id: string): Promise<ForumsPrivateMessage[]> {
    return request<ForumsPrivateMessage[]>(`/private-message/${id}/thread`);
  },

  async send(data: {
    title: string;
    body: string;
    recipientId: string;
    parentMessageId?: string;
    extendedData?: {
      linkedPostId?: string;
      linkedThreadId?: string;
      imageUrl?: string; // Support for image attachments
    };
  }): Promise<ForumsPrivateMessage> {
    return request<ForumsPrivateMessage>("/private-message", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async markRead(id: string): Promise<void> {
    await request(`/private-message/${id}/read`, { method: "POST" });
  },

  async delete(id: string): Promise<void> {
    await request(`/private-message/${id}`, { method: "DELETE" });
  },
};

// ============================================
// Tag Endpoints
// ============================================

export const tags = {
  async list(): Promise<Tag[]> {
    return request<Tag[]>("/tags");
  },

  async get(id: string): Promise<Tag> {
    return request<Tag>(`/tag/${id}`);
  },
};

// ============================================
// Search Endpoints
// ============================================

export const search = {
  async threads(query: string): Promise<ThreadsResponse> {
    return request<ThreadsResponse>(
      `/search/threads?q=${encodeURIComponent(query)}`
    );
  },

  async posts(query: string): Promise<PostsResponse> {
    return request<PostsResponse>(
      `/search/posts?q=${encodeURIComponent(query)}`
    );
  },

  async users(query: string): Promise<ForumsUser[]> {
    return request<ForumsUser[]>(
      `/search/users?q=${encodeURIComponent(query)}`
    );
  },
};

// Default export with all namespaces
const forumsApi = {
  auth,
  threads,
  posts,
  users,
  messages,
  tags,
  search,
  setAccessToken,
  getAccessToken,
};

export default forumsApi;
