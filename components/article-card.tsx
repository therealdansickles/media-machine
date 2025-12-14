"use client"

import { DataCardTooltip } from "./data-card-tooltip"

interface ArticleCardProps {
  headline: string
  summary: string
  author: string
  time: string
  imageUrl: string
  category?: "breaking" | "analysis" | "news"
  source?: string
  reporter?: string
  originalUrl?: string
  entityTags?: string[]
  sentiment?: string
}

const MAX_SUMMARY_LENGTH = 200

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + "..."
}

export function ArticleCard({
  headline,
  summary,
  author,
  time,
  imageUrl,
  category = "news",
  source,
  reporter,
  originalUrl,
  entityTags = [],
  sentiment
}: ArticleCardProps) {
  // Parse author field if source/reporter not provided
  // Format: "By [Publication]" -> extract publication
  const publication = source || (author.startsWith("By ") ? author.replace("By ", "") : author)
  const reporterName = reporter || "Staff Writer"
  
  // Check if we have a real analyst summary (not just the headline repeated)
  const hasRealSummary = summary && summary.trim() !== headline.trim()
  const truncatedSummary = hasRealSummary ? truncateText(summary, MAX_SUMMARY_LENGTH) : null

  // Badge varies by category
  const getBadge = () => {
    if (category === "breaking") return "BREAKING"
    if (category === "analysis") return "ANALYSIS"
    return "INTEL"
  }

  return (
    <article className="group border-b border-border py-6 md:py-8 lg:py-12 flex flex-col md:flex-row gap-6 hover:bg-card/50 dark:hover:bg-card/20 transition-colors cursor-pointer px-4 md:px-6">
      {/* Image */}
      <div className="w-full md:w-1/3 aspect-[4/3] bg-gray-200 dark:bg-gray-800 overflow-hidden relative rounded-sm">
        <div
          className="absolute inset-0 bg-cover bg-center grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
          style={{ backgroundImage: `url('${imageUrl}')` }}
          role="img"
          aria-label={`Illustration for ${headline}`}
        />
      </div>

      {/* Content */}
      <div className="w-full md:w-2/3 flex flex-col justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-4xl text-foreground mb-3 leading-tight group-hover:text-[#E6FF00] dark:group-hover:text-[#E6FF00] group-hover:bg-[#C2D600] group-hover:text-[#050505] transition-colors text-balance">
            {headline}
          </h2>

          {/* Badge always shown, summary only if we have real analyst content */}
          <div className="max-w-xl">
            <p className="font-serif text-sm md:text-base lg:text-lg text-gray-700 dark:text-gray-300 leading-relaxed text-pretty">
              <span className="inline-block bg-[#C2D600] dark:bg-[#E6FF00] text-black font-mono text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider mr-2 align-middle">
                {getBadge()}
              </span>
              {truncatedSummary ? (
                <>
                  {truncatedSummary}{" "}
                  <DataCardTooltip>
                    <span className="text-[#00F0FF] hover:underline cursor-help decoration-dotted underline-offset-2 inline">
                      [Context]
                    </span>
                  </DataCardTooltip>
                </>
              ) : (
                <span className="italic text-gray-500 dark:text-gray-500">Analysis pending...</span>
              )}
            </p>
          </div>

          {/* Entity Tags */}
          {entityTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {entityTags.map((tag, i) => (
                <span
                  key={i}
                  className="font-mono text-[10px] px-2 py-1 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white/70 uppercase tracking-wider hover:bg-[#00F0FF]/20 hover:text-[#00F0FF] cursor-pointer transition-colors"
                >
                  {tag}
                </span>
              ))}
              {sentiment && (
                <span className={`font-mono text-[10px] px-2 py-1 uppercase tracking-wider ${
                  sentiment === 'bullish' ? 'bg-green-500/20 text-green-400' :
                  sentiment === 'bearish' ? 'bg-red-500/20 text-red-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {sentiment === 'bullish' ? '↑ BULLISH' : sentiment === 'bearish' ? '↓ BEARISH' : '→ NEUTRAL'}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mt-2">
          {/* Updated author display: SOURCE: [Publication] // Reported by [Name] */}
          <span className="font-mono text-xs uppercase tracking-widest text-gray-600 dark:text-gray-400">
            SOURCE: {publication} <span className="text-gray-400 dark:text-gray-600">//</span> Reported by {reporterName} <span className="text-gray-400 dark:text-gray-600">//</span> {time}
          </span>

          {/* Prominent READ ORIGINAL button with accent color */}
          <a
            href={originalUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs sm:text-sm font-bold bg-[#C2D600] dark:bg-[#E6FF00] text-black px-3 sm:px-4 py-1.5 sm:py-2 hover:bg-[#C2D600]/90 dark:hover:bg-[#E6FF00]/90 transition-all uppercase tracking-wider border-2 border-[#C2D600] dark:border-[#E6FF00] shadow-[0_0_15px_rgba(194,214,0,0.3)] dark:shadow-[0_0_15px_rgba(230,255,0,0.3)] touch-manipulation inline-block text-center no-underline"
            aria-label={`Read original article at ${publication}: ${headline}`}
          >
            READ ORIGINAL @ {publication.toUpperCase()}
          </a>
        </div>
      </div>
    </article>
  )
}

