// Foru.ms API Types & ONPOST Extended Data Contracts

// ============================================
// Core Foru.ms API Types
// ============================================

export interface ForumsUser {
  id: string;
  username: string;
  email?: string;
  displayName: string;
  emailVerified?: boolean;
  roles?: string[];
  bio?: string;
  signature?: string;
  url?: string;
  avatarUrl?: string | null;
  createdAt?: string;
  extendedData?: UserExtendedData;
}

export interface ForumsThread {
  id: string;
  title: string;
  body: string;
  // API may return userId or we normalize to authorId
  userId?: string;
  authorId?: string;
  user?: ForumsUser;
  author?: ForumsUser;
  categoryId?: string;
  tags: string[];
  isPinned?: boolean;
  isLocked?: boolean;
  pinned?: boolean;
  locked?: boolean;
  postCount?: number;
  viewCount?: number;
  createdAt: string;
  updatedAt: string;
  extendedData?: ThreadExtendedData;
}

export interface ForumsPost {
  id: string;
  body: string;
  // API may return userId or we normalize to authorId
  userId?: string;
  authorId?: string;
  user?: ForumsUser;
  author?: ForumsUser;
  threadId: string;
  parentPostId?: string | null;
  parentId?: string | null;
  likes?: Array<{ userId: string; user?: ForumsUser }>;
  createdAt: string;
  updatedAt: string;
  extendedData?: PostExtendedData;
}

export interface ForumsPrivateMessage {
  id: string;
  title: string;
  body: string;
  senderId: string;
  sender?: ForumsUser;
  recipientId: string;
  recipient?: ForumsUser;
  parentMessageId: string | null;
  isRead: boolean;
  createdAt: string;
  extendedData?: PMExtendedData;
}

export interface ForumsCategory {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  sortOrder: number;
}

export interface Tag {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

// ============================================
// ONPOST Extended Data Contracts
// ============================================

// Post Trade Data
export interface PostTradeData {
  isTrade: boolean;
  intent: "WTS" | "WTB" | "WTT";
  status: "ACTIVE" | "RESERVED" | "SOLD" | "FULFILLED" | "EXPIRED";
  displayPrice: string;
  normalizedPrice: number | null;
  currency: "IDR" | "USD" | string;
  unit: "pcs" | "bundle" | "account" | string;
  parseConfidence: number;
  parserVersion: string;
  parsedAt: number;
  finalPrice?: number | null;
  verified?: {
    buyerConfirmed: boolean;
    confirmedAt?: number;
  };
  accountFeatures?: Record<string, unknown> | null;
}

export interface PostExtendedData {
  trade?: PostTradeData;
  images?: string[];
  // Home Feed fields
  homeFeed?: boolean; // true if created from Home feed
  tags?: string[]; // Game/category tags
  linkedThreadId?: string; // Auto-linked market thread (for analytics)
}

// Thread Market Data
export interface MarketSnapshot {
  sell: {
    median: number;
    p10: number;
    p90: number;
    count: number;
  };
  buy: {
    median: number;
    p10: number;
    p90: number;
    count: number;
  };
  totalValidCount: number;
  spread: number;
  trend: "RISING" | "STABLE" | "DECLINING";
  volume?: number[];
}

export interface AccountMarketSnapshot {
  bands: {
    budget: { median: number; count: number; range: [number, number] };
    mid: { median: number; count: number; range: [number, number] };
    high: { median: number; count: number; range: [number, number] };
    premium: { median: number; count: number; range: [number, number] };
  };
  demandPressure: number;
  topValueDrivers: string[];
  totalValidCount: number;
}

export interface ThreadMarketData {
  marketEnabled: boolean;
  marketTypeFinal: "ITEM_MARKET" | "ACCOUNT_MARKET" | null;
  marketTypeCandidate: "ITEM_MARKET" | "ACCOUNT_MARKET" | "UNKNOWN";
  windowDays: number;
  thresholdValid: number;
  validCount: number;
  lastWindowCutoffAt: number;
  lastProcessed: {
    mode: "NEWEST" | "OLDEST";
    cursor: string | null;
    lastPostIdProcessed: string;
    at: number;
  };
  classification: {
    confidence: number;
    method: "RULE" | "AI";
    version: string;
    classifiedAt: number;
    lockedAt: number | null;
  };
  analytics: {
    locked: boolean;
    updatedAt: number;
    snapshot: MarketSnapshot | AccountMarketSnapshot | null;
    narrative: string | null;
    narrativeUpdatedAt: number | null;
    version: string;
  };
}

export interface ThreadExtendedData {
  market?: ThreadMarketData;
  coverImage?: string;
  icon?: string;
}

// User Trust Data
export interface UserTrustData {
  completedSales: number;
  completedBuys: number;
  verifiedTransactions: number;
  computedAt: number;
}

export interface UserExtendedData {
  trust?: UserTrustData;
}

// PM Extended Data
export interface PMExtendedData {
  linkedPostId?: string;
  linkedThreadId?: string;
}

// ============================================
// API Response Types
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  total?: number;
}

export interface ThreadsResponse {
  threads: ForumsThread[];
  nextThreadCursor: string | null;
}

export interface PostsResponse {
  posts: ForumsPost[];
  nextPostCursor: string | null;
}

export interface MessagesResponse {
  messages: ForumsPrivateMessage[];
  nextMessageCursor: string | null;
}

// ============================================
// Auth Types
// ============================================

export interface LoginResponse {
  token: string;
}

export interface LoginRequest {
  login: string; // email or username
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  displayName?: string;
  emailVerified?: boolean;
  roles?: string[];
  extendedData?: Record<string, unknown>;
}

export interface RegisterResponse {
  id: string;
  username: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  roles: string[];
  createdAt: string;
}

// ============================================
// Trade Detection Types
// ============================================

export interface ParsedPrice {
  raw: string;
  normalized: number | null;
  currency: string;
  confidence: number;
}

export interface TradeDetectionResult {
  isTrade: boolean;
  intent?: "WTS" | "WTB" | "WTT";
  price?: ParsedPrice;
  confidence: number;
}
