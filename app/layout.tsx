import type React from "react";

import type { Metadata } from "next";

import { Fraunces } from "next/font/google";

import { Analytics } from "@vercel/analytics/next";

import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "700", "900"],
});

export const metadata: Metadata = {
  title: "MEDIA / MACHINE | The media brief",
  description:
    "Essential media and entertainment news: concise summaries, key facts, context, and links to the original reporting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fraunces.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
        </ThemeProvider>

        <Analytics />
      </body>
    </html>
  );
}
