import { getSupabase } from "@/lib/supabase";
const escapeXml = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export async function GET(request: Request) {
  try {
    const { data, error } = await getSupabase()
      .from("published_stories")
      .select("id,headline,analyst_summary,source_name,original_url,created_at")
      .eq("link_status", "active")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const items = (data ?? [])
      .map(
        (story) =>
          `<item><title>${escapeXml(story.headline)}</title><link>${escapeXml(`${origin}/article/${story.id}`)}</link><guid isPermaLink="false">${story.id}</guid><pubDate>${new Date(story.created_at).toUTCString()}</pubDate><description>${escapeXml(`${story.analyst_summary}\n\nOriginal reporting: ${story.source_name}\n${story.original_url}`)}</description></item>`,
      )
      .join("");
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>MEDIA / MACHINE</title><link>${escapeXml(origin)}</link><description>The media brief. Essential stories with links to original reporting.</description>${items}</channel></rss>`,
      {
        headers: {
          "Content-Type": "application/rss+xml; charset=utf-8",
          "Cache-Control": "public, max-age=300",
        },
      },
    );
  } catch {
    return new Response("The feed is temporarily unavailable.", {
      status: 503,
    });
  }
}
