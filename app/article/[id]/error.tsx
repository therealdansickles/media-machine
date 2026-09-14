"use client";

import Link from "next/link";

export default function ArticleError({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-24 text-center">
      <h1 className="font-serif text-4xl mb-4">
        This story is temporarily unavailable.
      </h1>
      <p className="font-mono text-sm mb-8">Please try loading it again.</p>
      <button
        type="button"
        onClick={reset}
        className="border border-border px-6 py-3 font-mono text-sm"
      >
        Try Again
      </button>
      <Link href="/" className="block mt-6 font-mono text-sm underline">
        Back to Feed
      </Link>
    </main>
  );
}
