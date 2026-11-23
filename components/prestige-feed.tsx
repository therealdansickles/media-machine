"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"

import { ArticleCard } from "./article-card"

import { Header } from "./header"

import { SidebarStack } from "./sidebar-stack"

import { getSupabase } from "@/lib/supabase"

import { fetchArticlePage, type ArticleCursor } from "@/lib/article-feed"

import type { Article, MappedArticle } from "@/types/article"

// Helper function to format time relative to now
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
  
  if (diffInHours < 1) {
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    return `${diffInMinutes}MINS AGO`
  } else if (diffInHours < 24) {
    return `${diffInHours}HRS AGO`
  } else {
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}DAYS AGO`
  }
}

// Parse entities from Spider Agent output (strips markdown code fences)
interface EntityData {
  people?: { name: string; role?: string; context?: string }[]
  companies?: { name: string; type?: string; context?: string }[]
  properties?: { title: string; type?: string; context?: string }[]
  deals?: { value?: string; parties?: string[]; type?: string }[]
  sentiment?: string
  market_impact?: number
}

function parseEntities(entitiesJson: string | null): EntityData | null {
  if (!entitiesJson) return null
  try {
    // Strip markdown code fences if present
    const cleaned = entitiesJson
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

// Category-based placeholder images for consistent visual identity
const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&q=80", // Film reels
  "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80", // Cinema
  "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80", // Film production
  "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&q=80", // Old Hollywood
  "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=800&q=80", // Streaming TV
  "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=800&q=80", // Media screens
]

function getPlaceholderImage(id: string): string {
  // Use article ID to consistently pick same image for same article
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return PLACEHOLDER_IMAGES[hash % PLACEHOLDER_IMAGES.length]
}

// Decode HTML entities (e.g., &gt; -> >, &amp; -> &)
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&#x27;': "'",
    '&nbsp;': ' ',
  }
  return text.replace(/&[^;]+;/g, match => entities[match] || match)
}

// Map database Article to MappedArticle for ArticleCard
function mapArticleToCard(article: Article): MappedArticle {
  // Use analyst_summary from article directly, fallback to headline
  const summary = article.analyst_summary || article.headline

  // Parse entity data
  const entities = parseEntities(article.entities_json ?? null)

  // Extract entity tags for display
  const entityTags: string[] = []
  if (entities?.companies) {
    entities.companies.forEach(c => entityTags.push(c.name))
  }
  if (entities?.people) {
    entities.people.forEach(p => entityTags.push(p.name))
  }
  if (entities?.properties) {
    entities.properties.forEach(p => entityTags.push(p.title))
  }

  return {
    id: article.id,
    headline: decodeHtmlEntities(article.headline),
    summary: decodeHtmlEntities(summary),
    author: `SOURCE: ${article.source_name}`,
    time: formatTimeAgo(article.created_at),
    imageUrl: article.image_url || getPlaceholderImage(article.id),
    category: article.category || "news",
    source: article.source_name,
    reporter: article.reporter_name || undefined,
    originalUrl: article.original_url?.trim() || undefined,
    entityTags: entityTags.slice(0, 5), // Limit to 5 tags
    sentiment: article.sentiment || entities?.sentiment,
  }
}

export function PrestigeFeed() {

  const [articles, setArticles] = useState<MappedArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const cursor = useRef<ArticleCursor | null>(null)
  const request = useRef<AbortController | null>(null)

  const loadArticles = useCallback(async () => {
    // Guard synchronously, including repeated clicks before React re-renders.
    if (request.current) return
    const controller = new AbortController()
    request.current = controller
    setLoading(true)
    setError(null)

    try {
      const page = await fetchArticlePage(getSupabase(), cursor.current, controller.signal)
      if (controller.signal.aborted) return
      const mapped = page.articles.map(mapArticleToCard)
      setArticles(previous => {
        const ids = new Set(previous.map(article => article.id))
        return [...previous, ...mapped.filter(article => !ids.has(article.id))]
      })
      cursor.current = page.nextCursor
      setHasMore(page.nextCursor !== null)
    } catch (err) {
      if (controller.signal.aborted) return
      console.error('Error fetching articles:', err)
      setError('Stories could not be loaded. Please try again.')
    } finally {
      if (request.current === controller) {
        request.current = null
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void loadArticles()
    return () => {
      request.current?.abort()
      request.current = null
    }
  }, [loadArticles])

  return (

    <div className="min-h-screen bg-bg text-text">

      <Header />

      {/* Main Grid Layout: 12 columns, 8 for feed, 4 for sidebar on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 max-w-7xl mx-auto px-4 lg:px-6 py-6">

        {/* Main Feed - Left Column (8 cols on desktop, full width on mobile) */}
        <div className="lg:col-span-8 space-y-0">

          {/* Hero Section - Dynamic from latest article */}
          {articles.length > 0 && (
            <Link
              href={`/article/${articles[0].id}`}
              className="relative h-[60vh] lg:h-[80vh] w-full border-b border-border group cursor-pointer overflow-hidden mb-0 block"
            >
              <div
                className="absolute inset-0 bg-cover bg-center opacity-60 group-hover:scale-105 transition-transform duration-1000"
                style={{ backgroundImage: `url('${articles[0].imageUrl}')` }}
                role="img"
                aria-label={`Hero image for ${articles[0].headline}`}
              />

              <div
                className="absolute bottom-0 left-0 p-6 md:p-8 lg:p-12 w-full pt-24 lg:pt-32"
                style={{
                  background: `linear-gradient(to top, var(--bg), color-mix(in srgb, var(--bg) 80%, transparent), transparent)`
                }}
              >
                <span className="bg-[#FF5C5C] text-black font-mono text-xs font-bold px-2 py-1 mb-4 inline-block uppercase tracking-wider">
                  ● LATEST
                </span>

                <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl leading-[0.85] mb-6 text-[#050505] dark:text-white text-balance">
                  {articles[0].headline}
                </h1>

                <p className="font-mono text-sm md:text-base max-w-md border-l-2 border-[#E6FF00] pl-4 dark:text-gray-300 text-gray-700 leading-relaxed">
                  {articles[0].summary.length > 150 ? articles[0].summary.slice(0, 150) + '...' : articles[0].summary}
                </p>

                <span className="font-mono text-xs uppercase tracking-widest text-gray-600 dark:text-gray-400 mt-4 block">
                  {articles[0].source} • {articles[0].time}
                </span>
              </div>
            </Link>
          )}

          {/* Article Feed */}
          <div className="flex flex-col" aria-label="News articles feed" aria-busy={loading}>

            {loading && articles.length === 0 && (
              <div className="p-12 text-center text-gray-600 dark:text-gray-400 font-mono text-sm" role="status">
                LOADING ARTICLES...
              </div>
            )}

            {!loading && !error && articles.length === 0 && (
              <div className="p-12 text-center text-gray-600 dark:text-gray-400 font-mono text-sm" role="status">
                NO ARTICLES FOUND
              </div>
            )}

            {articles.slice(1).map(article => <ArticleCard key={article.id} {...article} />)}

          </div>

          {/* Keep loaded stories visible while loading another page or retrying. */}
          <div className="border-t border-border p-8 lg:p-12 text-center">
            {error && (
              <p role="alert" className="mb-4 font-mono text-sm text-red-700 dark:text-red-400">
                {error}
              </p>
            )}
            {(hasMore || error) && (
              <button
                type="button"
                onClick={() => void loadArticles()}
                disabled={loading}
                className="font-mono text-sm text-foreground border border-border px-6 py-3 hover:bg-[#E6FF00] hover:text-black hover:border-[#E6FF00] transition-all uppercase tracking-wider disabled:opacity-50 disabled:cursor-wait"
              >
                {loading ? 'Loading stories…' : error ? 'Try Again' : 'Load More Stories'}
              </button>
            )}
            <p role="status" className="mt-3 font-mono text-xs text-gray-600 dark:text-gray-400">
              {articles.length > 0 && `${articles.length} stories loaded${!hasMore ? '. You’re all caught up.' : '.'}`}
            </p>
          </div>

        </div>

        {/* Sidebar - Right Column (4 cols on desktop, hidden on mobile) */}
        <div className="hidden lg:block lg:col-span-4">

          <SidebarStack sources={[...new Set(articles.map(article => article.source).filter((s): s is string => Boolean(s)))]} />

        </div>

      </div>

    </div>

  )

}

