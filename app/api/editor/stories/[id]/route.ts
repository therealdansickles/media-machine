import { after } from "next/server";
import { z } from "zod";
import { DraftSchema, InputSchema, UUID } from "@/lib/editorial/schema";
import {
  getAdminDb,
  isEditor,
  sameOrigin,
  readJson,
  publicError,
} from "@/lib/editorial/server";
import { normalizeArticleUrl } from "@/lib/editorial/url";
import { processSafely } from "@/lib/editorial/process";

export const maxDuration = 180;
const ActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("retry"), ...InputSchema.shape }),
  z.object({ action: z.literal("save"), draft: DraftSchema }),
  z.object({ action: z.literal("publish") }),
  z.object({ action: z.literal("unpublish") }),
]);
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isEditor()))
    return Response.json(
      { error: "Sign in to edit stories." },
      { status: 401 },
    );
  if (!sameOrigin(request))
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const id = UUID.parse((await params).id);
    const input = ActionSchema.parse(await readJson(request));
    const db = getAdminDb();
    if (input.action === "publish" || input.action === "unpublish") {
      const { error } = await db.rpc(
        input.action === "publish"
          ? "publish_editorial_story"
          : "unpublish_editorial_story",
        { story_id: id },
      );
      if (error)
        throw new Error(
          "The publication status could not be changed. Check that a complete draft is ready.",
        );
    } else if (input.action === "save") {
      const { data, error } = await db
        .from("editorial_inbox")
        .update({ draft: input.draft })
        .eq("id", id)
        .in("status", ["ready", "published"])
        .select("id")
        .maybeSingle();
      if (error || !data)
        throw new Error(
          "The draft could not be saved. Wait for processing to finish and try again.",
        );
    } else {
      const { data, error } = await db
        .from("editorial_inbox")
        .update({
          original_url: normalizeArticleUrl(input.url),
          submitted_text: input.text || null,
          status: "queued",
          draft: null,
          source_text: null,
          error_message: null,
          attempts: 0,
          processing_token: null,
        })
        .eq("id", id)
        .in("status", ["queued", "ready", "needs_attention"])
        .select("id")
        .maybeSingle();
      if (error?.code === "23505")
        throw new Error("That article already exists in the inbox.");
      if (error || !data)
        throw new Error(
          "Unpublish this story or wait for processing to finish before retrying.",
        );
      after(() => processSafely(id));
    }
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: publicError(error) }, { status: 400 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isEditor()))
    return Response.json(
      { error: "Sign in to open a story." },
      { status: 401 },
    );
  const id = UUID.safeParse((await params).id);
  if (!id.success)
    return Response.json({ error: "Story not found." }, { status: 404 });
  try {
    const { data, error } = await getAdminDb()
      .from("editorial_inbox")
      .select("*")
      .eq("id", id.data)
      .maybeSingle();
    if (error) throw new Error("The story could not be loaded.");
    if (!data)
      return Response.json({ error: "Story not found." }, { status: 404 });
    return Response.json(
      { story: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json({ error: publicError(error) }, { status: 503 });
  }
}
