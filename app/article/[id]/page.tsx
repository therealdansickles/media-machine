import { Metadata } from "next"
import { notFound } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { ArticleView } from "@/components/article-view"

// Sanitize env vars
function sanitizeEnvVar(value: string | undefined): string {
  if (!value) return ''
  return value.replace(/\s+/g, '').replace(/[^\x20-\x7E]/g, '')
}

const supabaseUrl = sanitizeEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL)
const supabaseAnonKey = sanitizeEnvVar(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface PageProps {
  params: Promise<{ id: string }>
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params

  const { data: article } = await supabase
    .from('articles')
    .select('headline, analyst_summary, source_name, image_url')
    .eq('id', id)
    .single()

  if (!article) {
    return {
      title: 'Article Not Found | MEDIA / MACHINE',
    }
  }

  return {
    title: `${article.headline} | MEDIA / MACHINE`,
    description: article.analyst_summary || article.headline,
    openGraph: {
      title: article.headline,
      description: article.analyst_summary || article.headline,
      images: article.image_url ? [article.image_url] : [],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: article.headline,
      description: article.analyst_summary || article.headline,
      images: article.image_url ? [article.image_url] : [],
    },
  }
}

export default async function ArticlePage({ params }: PageProps) {
  const { id } = await params

  // Fetch the article
  const { data: article, error } = await supabase
    .from('articles')
    .select('*, entities_json, sentiment, market_impact')
    .eq('id', id)
    .single()

  if (error || !article) {
    notFound()
  }

  // Fetch related articles (same source or recent)
  const { data: relatedArticles } = await supabase
    .from('articles')
    .select('id, headline, image_url, source_name, created_at')
    .eq('link_status', 'active')
    .neq('id', id)
    .order('created_at', { ascending: false })
    .limit(3)

  return (
    <ArticleView
      article={article}
      relatedArticles={relatedArticles || []}
    />
  )
}
