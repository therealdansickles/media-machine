// TypeScript interface matching the Supabase articles table schema
export interface Article {
  id: string
  headline: string
  analyst_summary: string | null
  source_name: string
  reporter_name?: string | null
  created_at: string
  category?: "breaking" | "analysis" | "news" | null
  image_url: string | null
  link_status: string
  entities_json?: string | null
  sentiment?: string | null
  market_impact?: number | null
  original_url?: string | null
  // Joined from intelligence table
  intelligence?: {
    detected_entities?: string[] | null
    sentiment_score?: number | null
    topic_tags?: string[] | null
  } | null
}

// Mapped interface for ArticleCard component
export interface MappedArticle {
  id: string
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





