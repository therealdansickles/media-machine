import Link from 'next/link'

export default function ArticleNotFound() {
  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-24 text-center">
      <h1 className="font-serif text-4xl mb-4">Story not found.</h1>
      <p className="font-mono text-sm mb-8">This story may no longer be available.</p>
      <Link href="/" className="font-mono text-sm underline">Back to Feed</Link>
    </main>
  )
}
