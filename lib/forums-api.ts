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

// Humanize API error messages
function humanizeError(status: number, endpoint: string, serverMessage?: string): string {
  // If server provides a meaningful message (not just status code), use it
  if (serverMessage && !serverMessage.includes("API Error:") && serverMessage.length > 0) {
    return serverMessage;
  }

  // Auth-specific errors
  if (endpoint.includes("/auth/login")) {
    switch (status) {
      case 400:
        return "Invalid email or password. Please check your credentials and try again.";
      case 401:
        return "Incorrect email or password. Please try again.";
      case 404:
        return "Account not found. Please check your email or create a new account.";
      case 429:
        return "Too many login attempts. Please wait a moment and try again.";
      default:
        break;
    }
  }

  if (endpoint.includes("/auth/register")) {
    switch (status) {
      case 400:
        return "Please check your information. Make sure your email is valid and password meets the requirements.";
      case 409:
        return "An account with this email or username already exists. Please try signing in instead.";
      case 422:
        return "Invalid registration details. Please ensure all fields are filled correctly.";
      default:
        break;
    }
  }

  if (endpoint.includes("/auth/forgot-password") || endpoint.includes("/auth/reset-password")) {
    switch (status) {
      case 400:
        return "Invalid request. Please check your email address.";
      case 404:
        return "No account found with this email address.";
      case 410:
        return "This password reset link has expired. Please request a new one.";
      default:
        break;
    }
  }

  // User profile update errors
  if (endpoint.includes("/user/") && !endpoint.includes("/user/username/")) {
    // Check for "can only update your own" type messages
    if (serverMessage && serverMessage.toLowerCase().includes("only update your own")) {
      return "Your session may have expired. Please try logging out and logging back in.";
    }

    switch (status) {
      case 400:
        return "Invalid profile data. Please check your input and try again.";
      case 403:
        return "Your session may have expired. Please try logging out and logging back in.";
      case 404:
        return "This user profile was not found.";
      case 500:
        // Server error - likely payload issue
        return "Unable to update profile. Please try again or contact support if the issue persists.";
      default:
        break;
    }
  }

  // Like/unlike errors
  if (endpoint.includes("/likes")) {
    switch (status) {
      case 400:
        return "Unable to process like. Please try again.";
      case 401:
        return "Please sign in to like posts.";
      case 404:
        return "This post was not found.";
      default:
        break;
    }
  }

  // Thread creation errors
  if (endpoint === "/thread" || endpoint.startsWith("/thread/")) {
    switch (status) {
      case 400:
        return serverMessage || "Unable to create thread. Please check your title and content.";
      case 401:
        return "Please sign in to create threads.";
      case 403:
        return "You don't have permission to create threads.";
      default:
        break;
    }
  }

  // Generic status code messages
  switch (status) {
    case 400:
      return "Something went wrong with your request. Please check your information and try again.";
    case 401:
      return "Please sign in to continue.";
    case 403:
      return "You don't have permission to perform this action.";
    case 404:
      return "The requested item was not found.";
    case 409:
      return "This action conflicts with existing data. Please refresh and try again.";
    case 422:
      return "Please check your input and try again.";
    case 429:
      return "You're doing that too fast. Please wait a moment and try again.";
    case 500:
      return "Something went wrong on our end. Please try again later.";
    case 502:
    case 503:
    case 504:
      return "The service is temporarily unavailable. Please try again in a moment.";
    default:
      return "An unexpected error occurred. Please try again.";
  }
}

interface RequestOptions extends RequestInit {
  suppressErrorLogging?: boolean;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { suppressErrorLogging, ...fetchOptions } = options;
  const token = getAccessToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...fetchOptions.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));

    // Provide user-friendly error messages instead of raw API errors
    if (response.status === 401) {
      throw new Error("Your session has expired. Please sign in again.");
    } else if (response.status === 403) {
      throw new Error("You don't have permission to access this.");
    } else if (response.status === 404) {
      throw new Error("The content you're looking for was not found.");
    } else if (response.status === 500) {
      throw new Error("A server error occurred. Please try again later.");
    }

    throw new Error(error.message || "Something went wrong. Please try again.");
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

  async me(options?: { suppressErrorLogging?: boolean }): Promise<ForumsUser> {
    return request<ForumsUser>("/auth/me", {
      suppressErrorLogging: options?.suppressErrorLogging,
    });
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

  // List all posts across all threads (for live feed optimization)
  async listAll(params?: {
    filter?: "newest" | "oldest";
    cursor?: string;
    limit?: number;
  }): Promise<PostsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.filter) searchParams.set("filter", params.filter);
    if (params?.cursor) searchParams.set("cursor", params.cursor);
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    const query = searchParams.toString();
    return request<PostsResponse>(`/posts${query ? `?${query}` : ""}`);
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
      body: userId ? JSON.stringify({ userId }) : JSON.stringify({}),
    });
  },

  async unlike(id: string, userId?: string): Promise<void> {
    await request(`/post/${id}/likes`, {
      method: "DELETE",
      body: userId ? JSON.stringify({ userId }) : JSON.stringify({}),
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
      bio?: string;
      url?: string;
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
