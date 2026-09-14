import { after } from "next/server";
import {
  getAdminDb,
  isEditor,
  sameOrigin,
  readJson,
  publicError,
} from "@/lib/editorial/server";
import { InputSchema } from "@/lib/editorial/schema";
import { normalizeArticleUrl } from "@/lib/editorial/url";
import { processSafely } from "@/lib/editorial/process";

export const maxDuration = 180;
export async function GET() {
  if (!(await isEditor()))
    return Response.json(
      { error: "Sign in to open the inbox." },
      { status: 401 },
    );
  try {
    const { data, error } = await getAdminDb()
      .from("editorial_inbox")
      .select(
        "id,original_url,source_title,source_name,status,draft,error_message,received_at,origin",
      )
      .order("received_at", { ascending: false })
      .limit(100);
    if (error)
      throw new Error(
        "The inbox could not be loaded. Check the database migration and connection.",
      );
    return Response.json(
      { stories: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json({ error: publicError(error) }, { status: 503 });
  }
}
export async function POST(request: Request) {
  if (!(await isEditor()))
    return Response.json({ error: "Sign in to add a story." }, { status: 401 });
  if (!sameOrigin(request))
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const input = InputSchema.parse(await readJson(request));
    const url = normalizeArticleUrl(input.url);
    const db = getAdminDb();
    const { data, error } = await db
      .from("editorial_inbox")
      .insert({
        original_url: url,
        submitted_text: input.text || null,
        origin: "form",
      })
      .select("id")
      .single();
    if (error?.code === "23505") {
      const { data: existing } = await db
        .from("editorial_inbox")
        .select("id")
        .eq("original_url", url)
        .single();
      return Response.json({ id: existing?.id, duplicate: true });
    }
    if (error || !data)
      throw new Error(
        "The story could not be saved. Check the database connection.",
      );
    after(() => processSafely(data.id));
    return Response.json({ id: data.id }, { status: 202 });
  } catch (error) {
    return Response.json({ error: publicError(error) }, { status: 400 });
  }
}
