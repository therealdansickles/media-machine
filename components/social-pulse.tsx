"use client"

import React, { useState } from "react"
import * as Tabs from "@radix-ui/react-tabs"

interface SocialItem {
  title: string
  views: string
}

const TIKTOK_DATA: SocialItem[] = [
  { title: "Review: Dune 3", views: "4.2M Views" },
  { title: "Streaming Wars Explained", views: "3.8M Views" },
  { title: "TikTok Ban Impact", views: "2.9M Views" },
  { title: "Creator Economy Breakdown", views: "2.1M Views" },
]

const INSTA_DATA: SocialItem[] = [
  { title: "Hollywood Earnings Report", views: "1.8M Views" },
  { title: "Paramount Deal Analysis", views: "1.5M Views" },
  { title: "Netflix Strategy Shift", views: "1.2M Views" },
  { title: "Disney Bundle Update", views: "950K Views" },
]

const YT_DATA: SocialItem[] = [
  { title: "The Streaming Wars Are Over", views: "5.1M Views" },
  { title: "Zaslav's Big Gamble", views: "3.4M Views" },
  { title: "Who's Buying Paramount?", views: "2.7M Views" },
  { title: "Vision Pro Enterprise Pivot", views: "2.0M Views" },
]

export function SocialPulse() {
  const [activeTab, setActiveTab] = useState("tiktok")

  return (
    <div className="bg-card border border-border dark:border-border border-[#050505] dark:border-border p-4 font-mono">
      <div className="bg-[#C2D600] dark:bg-transparent dark:text-[#E6FF00] text-black text-xs uppercase tracking-wider mb-3 font-bold border-b border-[#050505] dark:border-border pb-2 px-2 py-1">
        THE SOCIAL PULSE
      </div>
      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full">
        <Tabs.List className="flex gap-1 mb-3 border-b border-[#050505] dark:border-border">
          <Tabs.Trigger
            value="tiktok"
            className="px-2 py-1 text-xs uppercase tracking-wide data-[state=active]:bg-[#C2D600] data-[state=active]:text-black dark:data-[state=active]:bg-transparent dark:data-[state=active]:text-[#E6FF00] data-[state=active]:border-b-2 data-[state=active]:border-[#C2D600] dark:data-[state=active]:border-[#E6FF00] text-foreground/60 hover:text-foreground transition-colors"
          >
            TikTok
          </Tabs.Trigger>
          <Tabs.Trigger
            value="insta"
            className="px-2 py-1 text-xs uppercase tracking-wide data-[state=active]:bg-[#C2D600] data-[state=active]:text-black dark:data-[state=active]:bg-transparent dark:data-[state=active]:text-[#E6FF00] data-[state=active]:border-b-2 data-[state=active]:border-[#C2D600] dark:data-[state=active]:border-[#E6FF00] text-foreground/60 hover:text-foreground transition-colors"
          >
            Insta
          </Tabs.Trigger>
          <Tabs.Trigger
            value="yt"
            className="px-2 py-1 text-xs uppercase tracking-wide data-[state=active]:bg-[#C2D600] data-[state=active]:text-black dark:data-[state=active]:bg-transparent dark:data-[state=active]:text-[#E6FF00] data-[state=active]:border-b-2 data-[state=active]:border-[#C2D600] dark:data-[state=active]:border-[#E6FF00] text-foreground/60 hover:text-foreground transition-colors"
          >
            YT
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="tiktok" className="space-y-2">
          {TIKTOK_DATA.map((item, idx) => (
            <div key={idx} className="text-xs border-l-2 border-border pl-2 py-1">
              <div className="text-foreground">{item.title}</div>
              <div className="text-foreground/60">{item.views}</div>
            </div>
          ))}
        </Tabs.Content>
        <Tabs.Content value="insta" className="space-y-2">
          {INSTA_DATA.map((item, idx) => (
            <div key={idx} className="text-xs border-l-2 border-border pl-2 py-1">
              <div className="text-foreground">{item.title}</div>
              <div className="text-foreground/60">{item.views}</div>
            </div>
          ))}
        </Tabs.Content>
        <Tabs.Content value="yt" className="space-y-2">
          {YT_DATA.map((item, idx) => (
            <div key={idx} className="text-xs border-l-2 border-border pl-2 py-1">
              <div className="text-foreground">{item.title}</div>
              <div className="text-foreground/60">{item.views}</div>
            </div>
          ))}
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}

