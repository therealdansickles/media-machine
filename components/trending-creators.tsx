"use client"

const TRENDING_CREATORS = [
  "MrBeast",
  "Casey Neistat",
  "Emma Chamberlain",
  "David Dobrik",
  "Charli D'Amelio",
  "Dixie D'Amelio",
  "Addison Rae",
  "Zach King",
]

export function TrendingCreators() {
  return (
    <div className="bg-card border border-[#050505] dark:border-border p-4 font-mono">
      <div className="bg-[#C2D600] dark:bg-transparent dark:text-[#E6FF00] text-black text-xs uppercase tracking-wider mb-3 font-bold border-b border-[#050505] dark:border-border pb-2 px-2 py-1">
        TRENDING CREATORS
      </div>
      <div className="space-y-1.5">
        {TRENDING_CREATORS.map((creator, idx) => (
          <div key={idx} className="text-xs flex items-center gap-2 border-l-2 border-[#050505] dark:border-border pl-2 py-1">
            <span className="bg-[#C2D600] dark:bg-transparent dark:text-[#E6FF00] text-black font-bold w-4">{idx + 1}.</span>
            <span className="text-foreground">{creator}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

