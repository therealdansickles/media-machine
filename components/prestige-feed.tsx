"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Header } from "./header";
import { ArticleCard } from "./article-card";
import { getSupabase } from "@/lib/supabase";
import { fetchArticlePage, type ArticleCursor } from "@/lib/article-feed";
import { SECTIONS } from "@/lib/editorial/schema";
import type { Article } from "@/types/article";

interface FeedProps {
  initialArticles: Article[];
  initialCursor: ArticleCursor | null;
  initialError: boolean;
}
export function PrestigeFeed({
  initialArticles,
  initialCursor,
  initialError,
}: FeedProps) {
  const [articles, setArticles] = useState(initialArticles);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [hasMore, setHasMore] = useState(initialCursor !== null);
  const [section, setSection] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const cursor = useRef(initialCursor);
  const request = useRef<AbortController | null>(null);
  const initialized = useRef(false);

  const load = useCallback(
    async (reset = false) => {
      if (request.current && !reset) return;
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      setLoading(true);
      setError(false);
      if (reset) {
        cursor.current = null;
        setArticles([]);
      }
      try {
        const page = await fetchArticlePage(
          getSupabase(),
          reset ? null : cursor.current,
          controller.signal,
          { section, search: query },
        );
        if (controller.signal.aborted) return;
        setArticles((previous) => {
          const base = reset ? [] : previous;
          const ids = new Set(base.map((a) => a.id));
          return [...base, ...page.articles.filter((a) => !ids.has(a.id))];
        });
        cursor.current = page.nextCursor;
        setHasMore(page.nextCursor !== null);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (request.current === controller) {
          request.current = null;
          setLoading(false);
        }
      }
    },
    [section, query],
  );

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    void load(true);
    return () => {
      request.current?.abort();
      request.current = null;
    };
  }, [load]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="max-w-6xl mx-auto px-5 pb-16">
        <div className="pt-12 md:pt-16 pb-9 border-b-2 border-foreground grid md:grid-cols-[1fr_320px] gap-6 items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] mb-3 text-gray-600 dark:text-gray-400">
              Film · Television · Culture · Business
            </p>
            <h1 className="font-serif font-bold text-5xl md:text-7xl tracking-tight">
              The media brief
              <span className="text-[#829000] dark:text-[#E6FF00]">.</span>
            </h1>
          </div>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            The stories shaping entertainment. The essential facts, why they
            matter, and a direct line to the original reporting.
          </p>
        </div>
        <div className="py-5 flex flex-col lg:flex-row gap-5 lg:items-center lg:justify-between border-b border-border">
          <div className="flex flex-wrap gap-2" aria-label="Filter by section">
            {["", ...SECTIONS].map((item) => (
              <button
                key={item}
                onClick={() => setSection(item)}
                aria-pressed={section === item}
                className={`px-3 py-2 font-mono text-[11px] border transition-colors ${section === item ? "bg-foreground text-background border-foreground" : "border-transparent hover:border-border"}`}
              >
                {item || "All stories"}
              </button>
            ))}
          </div>
          <form
            className="flex items-center border border-border px-3 py-2 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(search.trim());
            }}
            role="search"
          >
            <Search size={15} aria-hidden="true" />
            <input
              aria-label="Search stories"
              type="search"
              maxLength={200}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the brief"
              className="bg-transparent min-w-0 w-full lg:w-36 font-mono text-xs outline-none"
            />
            <button type="submit" className="text-xs font-mono">
              Go
            </button>
          </form>
        </div>
        {query && (
          <p className="font-mono text-xs pt-5">
            Results for “{query}”{" "}
            <button
              className="ml-3 underline"
              onClick={() => {
                setSearch("");
                setQuery("");
              }}
            >
              Clear
            </button>
          </p>
        )}
        <div aria-busy={loading} aria-label="Stories">
          {articles.map((article, index) => (
            <ArticleCard
              key={article.id}
              article={article}
              featured={index === 0 && !query}
            />
          ))}
          {!loading && !error && articles.length === 0 && (
            <div className="py-20 text-center">
              <h2 className="font-serif text-3xl">
                {query || section
                  ? "No matching stories yet."
                  : "The first brief is on its way."}
              </h2>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                {query || section
                  ? "Try another search or section."
                  : "New stories will appear here as they are published."}
              </p>
            </div>
          )}
        </div>
        <div className="py-8 text-center">
          {error && (
            <p
              role="alert"
              className="text-red-700 dark:text-red-400 text-sm mb-4"
            >
              Stories could not be loaded. Please try again.
            </p>
          )}
          {(loading || hasMore || error) && (
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="font-mono text-xs uppercase tracking-wider border border-foreground px-6 py-3 disabled:opacity-50 hover:bg-foreground hover:text-background"
            >
              {loading
                ? "Loading stories…"
                : error
                  ? "Try again"
                  : "Load more stories"}
            </button>
          )}
          <p
            role="status"
            className="font-mono text-[10px] uppercase tracking-wider text-gray-500 mt-4"
          >
            {articles.length > 0
              ? `${articles.length} stories${!hasMore && !loading ? " · You’re up to date" : ""}`
              : ""}
          </p>
        </div>
      </main>
      <footer className="border-t border-border max-w-6xl mx-auto px-5 py-8 flex flex-wrap gap-6 justify-between font-mono text-xs text-gray-600 dark:text-gray-400">
        <span>MEDIA / MACHINE · Sources always linked.</span>
        <div className="flex gap-5">
          <Link href="/about">How we work</Link>
          <Link href="/editor">Editor inbox</Link>
        </div>
      </footer>
    </div>
  );
}
