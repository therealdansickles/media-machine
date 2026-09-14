import "server-only";
import { getAdminDb } from "./server.ts";
import { readSource } from "./extract.ts";
import { summarizeSource, eligibleForAutoPublish } from "./summarize.ts";
import type { InboxStory } from "./schema.ts";

export async function processStory(id?: string): Promise<string | null> {
  const db = getAdminDb();
  const { data, error } = await db.rpc("claim_editorial_story", {
    story_id: id ?? null,
  });
  if (error)
    throw new Error(
      "The intake queue could not be opened. Check the database migration.",
    );
  const story = data?.[0] as InboxStory | undefined;
  if (!story) return null;
  try {
    const source = await readSource(story.original_url!, story.submitted_text);
    const draft = await summarizeSource(source);
    const { data: saved, error: saveError } = await db
      .from("editorial_inbox")
      .update({
        source_text: source.text,
        source_title: source.title || draft.headline,
        source_name: source.publication,
        source_published_at: source.publishedAt,
        draft,
        status: "ready",
        error_message: null,
        processing_token: null,
      })
      .eq("id", story.id)
      .eq("processing_token", story.processing_token)
      .select("id")
      .maybeSingle();
    if (saveError)
      throw new Error(
        "The draft could not be saved. Retry this story from the inbox.",
      );
    if (!saved) return story.id;
    if (process.env.AUTO_PUBLISH !== "false" && eligibleForAutoPublish(draft)) {
      const { error: publishError } = await db.rpc("publish_editorial_story", {
        story_id: story.id,
      });
      if (publishError) {
        await db
          .from("editorial_inbox")
          .update({
            error_message:
              "The summary is ready, but publication failed. Try Publish again.",
          })
          .eq("id", story.id)
          .eq("status", "ready");
      }
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "The story could not be processed. Try again.";
    console.error("Story processing failed:", story.id, message);
    await db
      .from("editorial_inbox")
      .update({
        status: "needs_attention",
        error_message: message.slice(0, 600),
        processing_token: null,
      })
      .eq("id", story.id)
      .eq("processing_token", story.processing_token);
  }
  return story.id;
}

export async function processSafely(id?: string) {
  try {
    await processStory(id);
  } catch (error) {
    console.error(
      "Queue processing failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}
