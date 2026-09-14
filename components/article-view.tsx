"use client";

import Link from "next/link";
import { useState } from "react";
import { Header } from "./header";
import { ArticleCard } from "./article-card";
import { formatDate, safeSourceUrl } from "@/lib/display";
import type { Article } from "@/types/article";

export function ArticleView({
  article,
  relatedArticles,
}: {
  article: Article;
  relatedArticles: Article[];
}) {
  const [shareStatus, setShareStatus] = useState("");
  const url = safeSourceUrl(article.original_url);
  async function share() {
    try {
      if (navigator.share)
        await navigator.share({
          title: article.headline,
          url: window.location.href,
        });
      else {
        await navigator.clipboard.writeText(window.location.href);
        setShareStatus("Link copied");
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError"))
        setShareStatus(
          "Copy the address from your browser to share this story.",
        );
    }
  }
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="max-w-3xl mx-auto px-5 py-10 md:py-16">
        <Link
          href="/"
          className="font-mono text-xs text-gray-600 dark:text-gray-400 hover:underline"
        >
          ← Back to the brief
        </Link>
        <div className="flex flex-wrap gap-3 items-center mt-10 mb-5 font-mono text-xs uppercase tracking-wider">
          <span className="bg-[#DCEB46] dark:bg-[#E6FF00] text-black px-2 py-1">
            {article.section || "Media"}
          </span>
          <span>{article.source_name}</span>
        </div>
        <h1 className="font-serif font-bold text-4xl md:text-6xl leading-[1.06] tracking-tight mb-6">
          {article.headline}
        </h1>
        <p className="font-mono text-[11px] text-gray-600 dark:text-gray-400 mb-8">
          Published here {formatDate(article.created_at)}
          {article.source_published_at
            ? ` · Original reporting ${formatDate(article.source_published_at)}`
            : ""}
        </p>
        <p className="text-lg md:text-xl leading-relaxed text-gray-700 dark:text-gray-300">
          {article.analyst_summary}
        </p>
        {!!article.key_points?.length && (
          <section className="mt-10 border-t border-border pt-7">
            <h2 className="font-mono text-xs uppercase tracking-widest mb-5">
              The key facts
            </h2>
            <ul className="space-y-4 list-disc pl-5 text-base leading-relaxed">
              {article.key_points.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </section>
        )}
        {article.why_it_matters && (
          <section className="mt-10 border-l-4 border-[#A3B500] dark:border-[#E6FF00] pl-5 py-2">
            <h2 className="font-mono text-xs uppercase tracking-widest mb-3">
              Why it matters
            </h2>
            <p className="leading-relaxed text-gray-700 dark:text-gray-300">
              {article.why_it_matters}
            </p>
          </section>
        )}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-10 border border-foreground p-5 hover:bg-foreground hover:text-background transition-colors"
          >
            <span className="font-mono text-[10px] uppercase tracking-widest block mb-2">
              Original reporting
            </span>
            <span className="font-serif text-xl font-bold">
              Read the full article at {article.source_name} ↗
            </span>
          </a>
        )}
        {!!article.entities?.length && (
          <div className="flex flex-wrap gap-2 mt-7">
            {article.entities.map((entity) => (
              <span
                key={entity}
                className="font-mono text-[10px] border border-border px-2 py-1"
              >
                {entity}
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-4 items-center mt-8 text-xs font-mono">
          <button
            onClick={() => void share()}
            className="underline underline-offset-4"
          >
            Share this brief
          </button>
          <span role="status">{shareStatus}</span>
        </div>
        <p className="mt-8 text-xs leading-relaxed text-gray-500">
          This brief summarizes the linked publication’s reporting with AI
          assistance. Context describes implications of that reporting, rather
          than independent verification.{" "}
          <Link href="/about" className="underline">
            Our approach
          </Link>
        </p>
        {relatedArticles.length > 0 && (
          <section className="mt-16">
            <h2 className="font-mono uppercase tracking-widest text-xs border-b border-foreground pb-4">
              More from {article.section || "the brief"}
            </h2>
            {relatedArticles.map((item) => (
              <ArticleCard key={item.id} article={item} />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
