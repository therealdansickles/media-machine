"use client"

export function SubmissionBox() {
  return (
    <div className="bg-card border-2 border-[#E6FF00] p-4 font-mono">
      <div className="text-[#E6FF00] text-xs uppercase tracking-wider mb-3 font-bold">
        SUBMIT SCOOP
      </div>
      <textarea
        className="w-full bg-background border border-border p-2 text-xs text-foreground resize-none focus:outline-none focus:border-[#E6FF00] mb-2"
        rows={4}
        placeholder="Drop your tip here..."
      />
      <button className="w-full bg-[#E6FF00] text-black text-xs font-bold py-2 uppercase tracking-wider hover:bg-[#E6FF00]/90 transition-colors">
        SUBMIT
      </button>
    </div>
  )
}

