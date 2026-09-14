import { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getSupabase } from "@/lib/supabase";
import { ArticleView } from "@/components/article-view";

// Share the article lookup between metadata and the page for this render.
const getArticle = cache(async (id: string) => {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    return null;
  const { data, error } = await getSupabase()
    .from("published_stories")
    .select("*")
    .eq("id", id)
    .eq("link_status", "active")
    .maybeSingle();

  // An outage is recoverable; only an absent/inactive article is a 404.
  if (error) throw new Error("Unable to load this story");
  return data;
});

interface PageProps {
  params: Promise<{ id: string }>;
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;

  const article = await getArticle(id);

  if (!article) {
    return {
      title: "Article Not Found | MEDIA / MACHINE",
    };
  }

  return {
    title: `${article.headline} | MEDIA / MACHINE`,
    description: article.analyst_summary || article.headline,
    openGraph: {
      title: article.headline,
      description: article.analyst_summary || article.headline,
      type: "article",
    },
    twitter: {
      card: "summary",
      title: article.headline,
      description: article.analyst_summary || article.headline,
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { id } = await params;

  const article = await getArticle(id);
  if (!article) notFound();

  // Recent published stories from the same section.
  const { data: relatedArticles } = await getSupabase()
    .from("published_stories")
    .select("*")
    .eq("link_status", "active")
    .neq("id", id)
    .eq("section", article.section)
    .order("created_at", { ascending: false })
    .limit(3);

  return (
    <ArticleView article={article} relatedArticles={relatedArticles || []} />
  );
}
