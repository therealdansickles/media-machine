import type { SupabaseClient } from "@supabase/supabase-js";
import type { Article } from "../types/article";

export const ARTICLE_PAGE_SIZE = 12;

export interface ArticleCursor {
  createdAt: string;
  id: string;
}

// Keep PostgREST filter syntax out of cursor values without truncating timestamp
// precision. IDs are UUIDs in the articles schema.
function validateCursor(cursor: ArticleCursor) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      cursor.id,
    ) ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      cursor.createdAt,
    ) ||
    !Number.isFinite(Date.parse(cursor.createdAt))
  ) {
    throw new Error("Invalid article cursor");
  }
}

export async function fetchArticlePage(
  client: SupabaseClient,
  cursor: ArticleCursor | null = null,
  signal?: AbortSignal,
  filters: { section?: string; search?: string } = {},
): Promise<{ articles: Article[]; nextCursor: ArticleCursor | null }> {
  let query = client
    .from("published_stories")
    .select("*")
    .eq("link_status", "active")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(ARTICLE_PAGE_SIZE + 1);

  if (filters.section) query = query.eq("section", filters.section);
  if (filters.search?.trim())
    query = query.textSearch(
      "search_document",
      filters.search.trim().slice(0, 200),
      { type: "websearch", config: "english" },
    );

  if (cursor) {
    validateCursor(cursor);
    // The ID breaks timestamp ties. New stories inserted at the top won't shift
    // the next page, as they would with offset pagination.
    query = query.or(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
    );
  }
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Article[];
  const articles = rows.slice(0, ARTICLE_PAGE_SIZE);
  const lastArticle = articles.at(-1);

  return {
    articles,
    nextCursor:
      rows.length > ARTICLE_PAGE_SIZE && lastArticle
        ? { createdAt: lastArticle.created_at, id: lastArticle.id }
        : null,
  };
}
