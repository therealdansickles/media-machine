import { first, run } from "./core.js";
import { unseal } from "./commerce.js";
import { generate } from "./brief.js";

// Claim before provider I/O. A lost response consumes one attempt; the host never
// blindly retries a billable request. Manual edits invalidate the claim.
export async function draftNext(env, fetcher = fetch) {
  const db = env.DB,
    day = new Date().toISOString().slice(0, 10);
  const story = await first(
    db,
    `UPDATE stories SET automation='working' WHERE id=(
    SELECT s.id FROM stories s JOIN editions e ON e.slug=s.edition
    WHERE s.automation='queued' AND s.state='draft' AND e.draft_limit>0
    AND (e.draft_day<>? OR e.drafts_used<e.draft_limit)
    ORDER BY s.created_at,s.id LIMIT 1
  ) AND automation='queued' RETURNING id,edition,source,original_title,evidence`,
    day,
  );
  if (!story) return 0;
  const budget = await first(
    db,
    `UPDATE editions SET drafts_used=CASE WHEN draft_day=? THEN drafts_used+1 ELSE 1 END,draft_day=?
     WHERE slug=? AND draft_key IS NOT NULL AND draft_limit>0 AND (draft_day<>? OR drafts_used<draft_limit) RETURNING draft_key`,
    day,
    day,
    story.edition,
    day,
  );
  if (!budget) {
    await run(
      db,
      "UPDATE stories SET automation='queued' WHERE id=? AND automation='working'",
      story.id,
    );
    return 0;
  }
  try {
    const key = await unseal(
      env.EDITION_KEY,
      "draft/" + story.edition,
      budget.draft_key,
    );
    const draft = await generate(story, key, fetcher);
    await run(
      db,
      "UPDATE stories SET automation='ready',title=?,note=? WHERE id=? AND automation='working' AND state='draft'",
      draft.title,
      draft.note,
      story.id,
    );
  } catch {
    await run(
      db,
      "UPDATE stories SET automation='failed' WHERE id=? AND automation='working'",
      story.id,
    );
  }
  return 1;
}
