"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, Twitter, Linkedin, Link2, Check } from "lucide-react"
import { Header } from "./header"

interface EntityData {
  people?: { name: string; role?: string; context?: string }[]
  companies?: { name: string; type?: string; context?: string }[]
  properties?: { title: string; type?: string; context?: string }[]
  deals?: { value?: string; parties?: string[]; type?: string }[]
  sentiment?: string
  market_impact?: number
}

interface Article {
  id: string
  headline: string
  analyst_summary: string | null
  source_name: string
  reporter_name?: string | null
  created_at: string
  category?: string | null
  image_url: string | null
  original_url?: string | null
  entities_json?: string | null
  sentiment?: string | null
}

interface RelatedArticle {
  id: string
  headline: string
  image_url: string | null
  source_name: string
  created_at: string
}

interface ArticleViewProps {
  article: Article
  relatedArticles: RelatedArticle[]
}

// Category-based placeholder images
const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&q=80",
  "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80",
  "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80",
  "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&q=80",
  "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=800&q=80",
  "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=800&q=80",
]

function getPlaceholderImage(id: string): string {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return PLACEHOLDER_IMAGES[hash % PLACEHOLDER_IMAGES.length]
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

  if (diffInHours < 1) {
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    return `${diffInMinutes} MINS AGO`
  } else if (diffInHours < 24) {
    return `${diffInHours} HRS AGO`
  } else {
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} DAYS AGO`
  }
}

function parseEntities(entitiesJson: string | null): EntityData | null {
  if (!entitiesJson) return null
  try {
    const cleaned = entitiesJson
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

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

// Validate URL - must be a proper http/https URL, not empty or test data
function isValidUrl(url: string | null | undefined): boolean {
  if (!url || !url.trim()) return false
  try {
    const parsed = new URL(url.trim())
    if (!['http:', 'https:'].includes(parsed.protocol)) return false
    if (url.includes('/test-') || url.includes('example.com')) return false
    return true
  } catch {
    return false
  }
}

export function ArticleView({ article, relatedArticles }: ArticleViewProps) {
  const [copied, setCopied] = useState(false)

  const imageUrl = article.image_url || getPlaceholderImage(article.id)
  const headline = decodeHtmlEntities(article.headline)
  const summary = article.analyst_summary ? decodeHtmlEntities(article.analyst_summary) : null
  const entities = parseEntities(article.entities_json || null)

  // Extract entity tags
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

  const sentiment = article.sentiment || entities?.sentiment

  // Get badge text
  const getBadge = () => {
    if (article.category === "breaking") return "BREAKING"
    if (article.category === "analysis") return "ANALYSIS"
    return "INTEL"
  }

  // Share functions
  const articleUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/article/${article.id}`
    : ''

  const shareTwitter = () => {
    const text = encodeURIComponent(headline)
    const url = encodeURIComponent(articleUrl)
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank')
  }

  const shareLinkedIn = () => {
    const url = encodeURIComponent(articleUrl)
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank')
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(articleUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <Header />

      {/* Back Button */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Feed
        </Link>
      </div>

      {/* Hero Image */}
      <div className="w-full h-[40vh] md:h-[50vh] lg:h-[60vh] relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${imageUrl}')` }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to top, var(--bg), transparent 50%)`
          }}
        />
      </div>

      {/* Article Content */}
      <div className="max-w-4xl mx-auto px-4 -mt-32 relative z-10">
        {/* Badge */}
        <span className="inline-block bg-[#FF5C5C] text-black font-mono text-xs font-bold px-3 py-1 mb-6 uppercase tracking-wider">
          {getBadge()}
        </span>

        {/* Headline */}
        <h1
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[0.9] mb-6 text-foreground text-balance"
          style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
        >
          {headline}
        </h1>

        {/* Meta */}
        <div className="font-mono text-sm uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-6">
          SOURCE: {article.source_name}
          <span className="text-gray-400 dark:text-gray-600 mx-2">//</span>
          {article.reporter_name || 'Staff Writer'}
          <span className="text-gray-400 dark:text-gray-600 mx-2">//</span>
          {formatTimeAgo(article.created_at)}
        </div>

        {/* Entity Tags */}
        {(entityTags.length > 0 || sentiment) && (
          <div className="flex flex-wrap gap-2 mb-8">
            {entityTags.slice(0, 6).map((tag, i) => (
              <span
                key={i}
                className="font-mono text-xs px-3 py-1.5 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white/70 uppercase tracking-wider"
              >
                {tag}
              </span>
            ))}
            {sentiment && (
              <span className={`font-mono text-xs px-3 py-1.5 uppercase tracking-wider ${
                sentiment === 'bullish' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                sentiment === 'bearish' ? 'bg-red-500/20 text-red-600 dark:text-red-400' :
                'bg-gray-500/20 text-gray-600 dark:text-gray-400'
              }`}>
                {sentiment === 'bullish' ? '↑ BULLISH' : sentiment === 'bearish' ? '↓ BEARISH' : '→ NEUTRAL'}
              </span>
            )}
          </div>
        )}

        {/* Analyst Summary */}
        {summary && (
          <div className="border-l-4 border-[#E6FF00] pl-6 py-4 mb-8 bg-card">
            <div className="font-mono text-xs uppercase tracking-wider text-[#C2D600] dark:text-[#E6FF00] mb-3 font-bold">
              Analyst Take
            </div>
            <p className="text-lg md:text-xl leading-relaxed text-gray-700 dark:text-gray-300" style={{ fontFamily: 'Georgia, serif' }}>
              {summary}
            </p>
          </div>
        )}

        {/* Read Original Button - only shown if URL is valid */}
        {isValidUrl(article.original_url) && (
          <a
            href={article.original_url!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block font-mono text-sm font-bold bg-[#C2D600] dark:bg-[#E6FF00] text-black px-6 py-3 hover:bg-[#C2D600]/90 dark:hover:bg-[#E6FF00]/90 transition-all uppercase tracking-wider border-2 border-[#C2D600] dark:border-[#E6FF00] shadow-[0_0_20px_rgba(194,214,0,0.3)] dark:shadow-[0_0_20px_rgba(230,255,0,0.3)] mb-8"
          >
            Read Original @ {article.source_name.toUpperCase()}
          </a>
        )}

        {/* Share Buttons */}
        <div className="flex flex-wrap gap-3 mb-12 pt-6 border-t border-border">
          <span className="font-mono text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 self-center mr-2">
            Share:
          </span>
          <button
            onClick={shareTwitter}
            className="inline-flex items-center gap-2 font-mono text-xs px-4 py-2 border border-border hover:bg-[#1DA1F2] hover:text-white hover:border-[#1DA1F2] transition-colors uppercase tracking-wider"
          >
            <Twitter className="w-4 h-4" />
            Twitter
          </button>
          <button
            onClick={shareLinkedIn}
            className="inline-flex items-center gap-2 font-mono text-xs px-4 py-2 border border-border hover:bg-[#0077B5] hover:text-white hover:border-[#0077B5] transition-colors uppercase tracking-wider"
          >
            <Linkedin className="w-4 h-4" />
            LinkedIn
          </button>
          <button
            onClick={copyLink}
            className="inline-flex items-center gap-2 font-mono text-xs px-4 py-2 border border-border hover:bg-foreground hover:text-background transition-colors uppercase tracking-wider"
          >
            {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <div className="pb-12">
            <div className="font-mono text-xs uppercase tracking-wider text-[#C2D600] dark:text-[#E6FF00] mb-6 font-bold border-b border-border pb-2">
              Related Stories
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedArticles.map((related) => (
                <Link
                  key={related.id}
                  href={`/article/${related.id}`}
                  className="group block"
                >
                  <div className="aspect-[16/9] bg-gray-200 dark:bg-gray-800 overflow-hidden mb-3">
                    <div
                      className="w-full h-full bg-cover bg-center grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                      style={{ backgroundImage: `url('${related.image_url || getPlaceholderImage(related.id)}')` }}
                    />
                  </div>
                  <h3 className="font-serif text-sm leading-tight text-foreground group-hover:text-[#C2D600] dark:group-hover:text-[#E6FF00] transition-colors line-clamp-2">
                    {decodeHtmlEntities(related.headline)}
                  </h3>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1 block">
                    {related.source_name} • {formatTimeAgo(related.created_at)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
