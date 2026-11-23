export function SidebarStack({ sources }: { sources: string[] }) {
  return (
    <aside className="sticky top-20 space-y-8 border-l border-border px-6">
      <section>
        <h2 className="font-serif text-3xl">Publish your own edition</h2>
        <p className="my-4">Collect the sources you follow, add an editorial note, and publish a feed for your readers.</p>
        <a href="/editions" className="inline-block bg-[#D5EE32] px-4 py-2 font-bold text-black">Open Editions</a>
      </section>
      {sources.length > 0 && <section><h2 className="font-mono uppercase text-sm">Sources in this feed</h2>
        <ul className="mt-3 divide-y divide-border">{sources.map(source => <li className="py-2" key={source}>{source}</li>)}</ul>
      </section>}
    </aside>
  )
}
