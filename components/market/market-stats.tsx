"use client";

import { Badge } from "@/components/ui/badge";
import { TrendingUp, Clock, MessageSquare } from "lucide-react";

export function MarketStats() {
  // These would ideally come from real data
  // For demo, we show realistic-looking numbers
  const stats = {
    activeToday: 12,
    newPosts: 8,
    activeNegotiations: 3,
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
      <Badge
        variant="secondary"
        className="gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-600 border-green-500/20"
      >
        <TrendingUp className="h-3.5 w-3.5" />
        {stats.activeToday} active trades today
      </Badge>
      <Badge
        variant="secondary"
        className="gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-600 border-blue-500/20"
      >
        <Clock className="h-3.5 w-3.5" />
        {stats.newPosts} new posts
      </Badge>
      <Badge
        variant="secondary"
        className="gap-1.5 px-3 py-1.5 bg-purple-500/10 text-purple-600 border-purple-500/20"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        {stats.activeNegotiations} ongoing negotiations
      </Badge>
    </div>
  );
}
