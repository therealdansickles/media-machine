"use client"

import { ShowtimesWidget } from "./showtimes-widget"
import { SocialPulse } from "./social-pulse"
import { TrendingCreators } from "./trending-creators"

export function SidebarStack() {
  return (
    <aside className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:overflow-y-auto space-y-4">
      <SocialPulse />
      <TrendingCreators />
      <ShowtimesWidget />
    </aside>
  )
}

