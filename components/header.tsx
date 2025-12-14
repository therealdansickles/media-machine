"use client"

import { ThemeToggle } from "./theme-toggle"

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex justify-between items-center">
      <div className="text-lg font-bold uppercase tracking-tight text-foreground" style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
        MEDIA / MACHINE
      </div>
      <ThemeToggle />
    </header>
  )
}

