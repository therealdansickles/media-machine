import Link from "next/link";
import { Header } from "@/components/header";
export const metadata = { title: "How we work | MEDIA / MACHINE" };
export default function About() {
  const corrections = process.env.CORRECTIONS_EMAIL;
  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-5 py-16">
        <p className="font-mono text-xs uppercase tracking-widest mb-4">
          How we work
        </p>
        <h1 className="font-serif text-5xl font-bold mb-8">
          A clearer view of media.
        </h1>
        <div className="space-y-6 leading-relaxed text-gray-700 dark:text-gray-300">
          <p>
            Media Machine brings together reporting on film, television,
            streaming, creators, and the business of entertainment. Each brief
            gives you the essential facts and a link to the original
            publication.
          </p>
          <p>
            Stories are selected through our editorial inbox. AI helps summarize
            the source material and check the draft against it. Briefs with
            flagged concerns are held for attention. These checks can miss
            errors; the original reporting remains the source of record.
          </p>
          <p>
            “Why it matters” offers a qualified interpretation of the reported
            facts. We do not present summaries as original reporting, generate
            invented popularity metrics, or reproduce full articles.
          </p>
          <p>
            Publication dates are shown when available. When a source cannot be
            read reliably, we hold the story instead of guessing what it says.
          </p>
          {corrections && (
            <p>
              See an error?{" "}
              <a href={`mailto:${corrections}`} className="underline">
                Contact the editor
              </a>{" "}
              with the brief’s link and a supporting source passage.
            </p>
          )}
        </div>
        <div className="mt-10 flex gap-6 font-mono text-xs">
          <Link href="/" className="underline">
            Read the brief
          </Link>
          <a href="/feed.xml" className="underline">
            Subscribe by RSS
          </a>
        </div>
      </main>
    </>
  );
}
