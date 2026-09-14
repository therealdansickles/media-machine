import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-5 py-4 flex justify-between items-center gap-4">
        <Link
          href="/"
          className="font-serif text-xl sm:text-2xl font-bold tracking-tight"
        >
          MEDIA <span className="text-[#829000] dark:text-[#E6FF00]">/</span>{" "}
          MACHINE
        </Link>
        <nav
          className="flex items-center gap-4 text-xs font-mono"
          aria-label="Main navigation"
        >
          <Link href="/about" className="hidden sm:block hover:underline">
            About
          </Link>
          <a href="/feed.xml" className="hover:underline">
            RSS
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
