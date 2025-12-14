"use client"

import React, { useState, useEffect } from "react"
import * as Tabs from "@radix-ui/react-tabs"

interface TVShow {
  id: number
  name: string
  network?: {
    name: string
  } | null
  show: {
    name: string
    network?: {
      name: string
    } | null
  }
  airstamp: string
}

export function ShowtimesWidget() {
  const [activeTab, setActiveTab] = useState("films")
  const [tvShows, setTvShows] = useState<TVShow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (activeTab === "series") {
      fetchPrimetimeShows()
    }
  }, [activeTab])

  async function fetchPrimetimeShows() {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch("https://api.tvmaze.com/schedule?country=US")
      if (!response.ok) {
        throw new Error("Failed to fetch TV schedule")
      }
      
      const data: TVShow[] = await response.json()
      
      // Filter for primetime shows (after 8 PM / 20:00)
      const primetimeShows = data
        .filter((show) => {
          const airstamp = new Date(show.airstamp)
          const hours = airstamp.getHours()
          return hours >= 20 // 8 PM or later
        })
        .slice(0, 10) // Limit to 10 shows
        .sort((a, b) => {
          // Sort by time
          return new Date(a.airstamp).getTime() - new Date(b.airstamp).getTime()
        })
      
      setTvShows(primetimeShows)
    } catch (err) {
      console.error("Error fetching TV shows:", err)
      setError(err instanceof Error ? err.message : "Failed to load shows")
    } finally {
      setLoading(false)
    }
  }

  function formatTime(dateString: string): string {
    const date = new Date(dateString)
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")
    return `${hours}:${minutes}`
  }

  return (
    <div className="bg-card border border-[#050505] dark:border-border p-4 font-mono">
      <div className="bg-[#C2D600] dark:bg-transparent dark:text-[#E6FF00] text-black text-xs uppercase tracking-wider mb-3 font-bold border-b border-[#050505] dark:border-border pb-2 px-2 py-1">
        SHOWTIMES & LIVE TV
      </div>
      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full">
        <Tabs.List className="flex gap-1 mb-3 border-b border-[#050505] dark:border-border">
          <Tabs.Trigger
            value="films"
            className="px-2 py-1 text-xs uppercase tracking-wide data-[state=active]:bg-[#C2D600] data-[state=active]:text-black dark:data-[state=active]:bg-transparent dark:data-[state=active]:text-[#E6FF00] data-[state=active]:border-b-2 data-[state=active]:border-[#C2D600] dark:data-[state=active]:border-[#E6FF00] text-foreground/60 hover:text-foreground transition-colors"
          >
            FILMS
          </Tabs.Trigger>
          <Tabs.Trigger
            value="series"
            className="px-2 py-1 text-xs uppercase tracking-wide data-[state=active]:bg-[#C2D600] data-[state=active]:text-black dark:data-[state=active]:bg-transparent dark:data-[state=active]:text-[#E6FF00] data-[state=active]:border-b-2 data-[state=active]:border-[#C2D600] dark:data-[state=active]:border-[#E6FF00] text-foreground/60 hover:text-foreground transition-colors"
          >
            SERIES
          </Tabs.Trigger>
        </Tabs.List>
        
        <Tabs.Content value="films" className="w-full">
          <div className="w-full h-[400px] border border-[#050505] dark:border-border bg-background overflow-hidden">
            <iframe
              src="https://opencinema.app"
              className="w-full h-full border-0"
              title="OpenCinema Film Showtimes"
              loading="lazy"
            />
          </div>
        </Tabs.Content>
        
        <Tabs.Content value="series" className="w-full">
          {loading && (
            <div className="py-8 text-center text-foreground/60 text-xs">
              <div className="inline-block animate-spin border-2 border-[#C2D600] dark:border-[#E6FF00] border-t-transparent rounded-full w-4 h-4 mr-2"></div>
              LOADING PRIMETIME SCHEDULE...
            </div>
          )}
          
          {error && (
            <div className="py-4 text-center text-red-500 text-xs border-l-2 border-red-500 pl-2">
              ERROR: {error}
            </div>
          )}
          
          {!loading && !error && tvShows.length === 0 && (
            <div className="py-4 text-center text-foreground/60 text-xs">
              NO PRIMETIME SHOWS FOUND
            </div>
          )}
          
          {!loading && !error && tvShows.length > 0 && (
            <div className="space-y-1.5">
              {tvShows.map((show) => {
                const networkName = show.network?.name || show.show.network?.name || "N/A"
                const showName = show.show.name || show.name
                const time = formatTime(show.airstamp)
                
                return (
                  <div
                    key={show.id}
                    className="text-xs border-l-2 border-[#050505] dark:border-border pl-2 py-1.5 hover:bg-background/50 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <span className="font-mono bg-[#C2D600] dark:bg-transparent dark:text-[#E6FF00] text-black font-bold min-w-[3.5rem] px-1">
                        {time}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-foreground font-medium truncate">
                          {showName}
                        </div>
                        <div className="text-foreground/60 text-[10px]">
                          {networkName}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}

