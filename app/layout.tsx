import type { ReactNode } from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import "@fontsource-variable/fraunces"
import "./globals.css"

export const metadata: Metadata = {
  title: "MEDIA / MACHINE - Entertainment Industry News",
  description: "Reporting and editorial briefs on the business of film, television and streaming.",
  icons: { icon: "/icon.svg" },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>{children}</ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
