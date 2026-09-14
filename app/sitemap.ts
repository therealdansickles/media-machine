import type { MetadataRoute } from "next";
import { getSupabase } from "@/lib/supabase";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = process.env.NEXT_PUBLIC_SITE_URL;
  if (!origin) return [];
  const { data, error } = await getSupabase()
    .from("published_stories")
    .select("id,updated_at")
    .eq("link_status", "active")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error("The sitemap is temporarily unavailable.");
  return [
    { url: origin },
    { url: `${origin}/about` },
    ...(data ?? []).map((story) => ({
      url: `${origin}/article/${story.id}`,
      lastModified: story.updated_at,
    })),
  ];
}
