# ONPOST - Social Trading Platform

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Radix UI](https://img.shields.io/badge/Radix_UI-Latest-161618?style=for-the-badge&logo=radix-ui&logoColor=white)

A modern, AI-powered social trading platform built on top of Foru.ms API. ONPOST combines social networking with marketplace functionality, enabling users to buy, sell, and trade items while engaging in community discussions.

## 🎥 Demo

**DEMO VIDEO:**

**LIVE DEMO URL:**

## ✨ Features

### 🏠 Live Feed

- **Real-time Activity Stream** - See all posts from across the platform in one unified feed
- **Trade Posts** - Create WTS (Want to Sell), WTB (Want to Buy), and WTT (Want to Trade) posts
- **Price Detection** - Automatic price extraction and display from post content
- **Contact Seller** - Direct messaging integration for trade negotiations
- **Pull-to-Refresh** - Swipe down to refresh the feed

### 💬 Messaging System

- **Private Messages** - Direct messaging between users
- **Real-time Conversations** - Chat interface with message history
- **Image Sharing** - Send and receive images in messages
- **Quick Reactions** - Send emoji reactions with one tap
- **Contact from Posts** - Seamlessly start conversations from trade posts

### 📊 Market Analytics

- **Price Trends** - AI-powered price analysis and trend detection
- **Market Insights** - Automated market narratives and statistics
- **Trade History** - Track historical trades and pricing
- **Market Snapshots** - View median prices, P10/P90 ranges

### 🧵 Thread System

- **Community Threads** - Organize discussions by topic
- **Thread Markets** - Dedicated marketplaces for specific items/games
- **Post Count Tracking** - Real-time post and engagement metrics
- **Thread Icons & Covers** - Visual customization for threads

### 🤖 AI Assistant

- **Market Assistant** - Get AI-powered insights about markets
- **Trade Parsing** - Automatic extraction of trade details from posts
- **Narrative Generation** - AI-generated market summaries

### 👤 User Profiles

- **Profile Pages** - View user information and activity
- **Post History** - See all posts from a specific user
- **Avatar & Bio** - Customizable user profiles

### 🎨 Modern UI/UX

- **Dark/Light Mode** - Theme switching support
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Smooth Animations** - Polished micro-interactions
- **Intent Badges** - Visual indicators for trade types (WTS/WTB/WTT)

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **UI Components:** Radix UI + shadcn/ui
- **State Management:** SWR for data fetching
- **AI Integration:** Kolosal AI (OpenAI-compatible)
- **Backend API:** Foru.ms API
- **Date Handling:** date-fns
- **Charts:** Recharts
- **Icons:** Lucide React

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Foru.ms API Key
- Kolosal AI API Key (for AI features)

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd Onpost
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

Required environment variables:

```env
# Foru.ms API Configuration
FORUMS_BASE_URL=https://foru.ms
FORUMS_API_KEY=your_forums_api_key_here

# AI Configuration
KOLOSAL_API_KEY=your_kolosal_api_key_here

# File Server (optional)
NEXT_PUBLIC_FILE_SERVER_URL=api.haluai.my.id
FILE_SERVER_API_KEY=your_file_server_api_key
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for production

```bash
npm run build
npm start
```

## 📁 Project Structure

```
Onpost/
├── app/                    # Next.js app directory
│   ├── api/               # API routes (proxy, AI, cron)
│   ├── markets/           # Market analytics pages
│   ├── messages/          # Messaging interface
│   ├── thread/            # Thread pages
│   ├── user/              # User profile pages
│   └── page.tsx           # Home page (Live Feed)
├── components/            # React components
│   ├── home/             # Home feed components
│   ├── messages/         # Messaging components
│   ├── post/             # Post card components
│   ├── thread/           # Thread components
│   ├── ui/               # shadcn/ui components
│   └── layout/           # Layout components
├── lib/                   # Utility libraries
│   ├── forums-api.ts     # Foru.ms API client
│   ├── minimax.ts        # AI integration
│   ├── file-api.ts       # File upload utilities
│   └── types.ts          # TypeScript types
└── public/               # Static assets
```

## 🔑 Key Features Explained

### Live Feed

The home page displays a unified feed of all posts across the platform. Posts are automatically categorized as trade posts (WTS/WTB/WTT) or regular discussion posts. Trade posts feature:

- Automatic price extraction
- Intent badges (color-coded)
- "Contact Seller" button for direct messaging

### Market Analytics

When a thread accumulates enough trade data (10+ valid trades), AI-powered analytics unlock:

- Price trend charts
- Market narratives
- Statistical insights (median, P10, P90)

### Messaging

Facebook Messenger-style chat interface with:

- Conversation list with unread indicators
- Real-time message updates
- Image sharing capabilities
- Quick emoji reactions

## 🔧 Configuration

### Disable Dev Indicators

The Next.js developer toolbar is disabled by default. To re-enable:

```javascript
// next.config.mjs
devIndicators: true;
```

### API Proxy

All client-side API calls go through `/api/forums` proxy to avoid CORS issues. The proxy adds the API key and forwards requests to Foru.ms.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built on top of [Foru.ms](https://foru.ms) API
- UI components from [shadcn/ui](https://ui.shadcn.com)
- AI powered by [Kolosal AI](https://kolosal.ai)

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

Made with ❤️ for the community
