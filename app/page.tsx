import { PrestigeFeed } from "@/components/prestige-feed";
import { fetchArticlePage } from "@/lib/article-feed";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export default async function Home() {
  const page = await fetchArticlePageSafe();
  return (
    <PrestigeFeed
      initialArticles={page?.articles ?? []}
      initialCursor={page?.nextCursor ?? null}
      initialError={!page}
    />
  );
}
async function fetchArticlePageSafe() {
  try {
    return await fetchArticlePage(getSupabase());
  } catch {
    return null;
  }
}
