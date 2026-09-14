import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Article } from "@/types/article";
import { formatDate, safeSourceUrl } from "@/lib/display";

export function ArticleCard({
  article,
  featured = false,
}: {
  article: Article;
  featured?: boolean;
}) {
  const sourceUrl = safeSourceUrl(article.original_url);
  return (
    <article
      className={`border-b border-border ${featured ? "py-9 md:py-12" : "py-8"}`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px] uppercase tracking-wider mb-4">
        <span className="bg-[#DCEB46] dark:bg-[#E6FF00] text-black px-2 py-1">
          {article.section || "Media"}
        </span>
        <span>{article.source_name}</span>
        <span className="text-gray-500">
          {formatDate(article.source_published_at || article.created_at)}
        </span>
      </div>
      <Link href={`/article/${article.id}`} className="group">
        <h2
          className={`font-serif font-bold leading-[1.08] tracking-tight group-hover:underline decoration-[#B3C600] underline-offset-4 mb-5 ${featured ? "text-4xl md:text-6xl max-w-4xl" : "text-3xl md:text-4xl"}`}
        >
          {article.headline}
        </h2>
      </Link>
      <p className="text-base md:text-lg leading-relaxed text-gray-700 dark:text-gray-300 max-w-3xl">
        {article.analyst_summary}
      </p>
      {featured && article.why_it_matters && (
        <div className="border-l-2 border-[#A3B500] dark:border-[#E6FF00] pl-4 mt-6 max-w-3xl">
          <span className="font-mono uppercase text-[10px] tracking-widest">
            Why it matters
          </span>
          <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            {article.why_it_matters}
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-5 mt-6 font-mono text-xs">
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex gap-2 items-center font-bold underline underline-offset-4"
          >
            Read the full article at {article.source_name}
            <ArrowUpRight aria-hidden="true" size={14} />
          </a>
        )}
        <Link
          href={`/article/${article.id}`}
          className="text-gray-600 dark:text-gray-400 hover:underline"
        >
          Key facts & context →
        </Link>
      </div>
    </article>
  );
}
