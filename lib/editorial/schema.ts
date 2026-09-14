import { z } from "zod";

export const SECTIONS = [
  "Film",
  "TV",
  "Streaming",
  "Business",
  "Creators",
  "Technology",
  "Culture",
] as const;
export const DraftSchema = z
  .object({
    headline: z.string().trim().min(10).max(160),
    summary: z.string().trim().min(40).max(1400),
    key_points: z
      .array(
        z
          .object({
            text: z.string().trim().min(10).max(350),
            evidence: z.string().trim().min(15).max(600),
          })
          .strict(),
      )
      .min(2)
      .max(5),
    why_it_matters: z.string().trim().min(20).max(600),
    section: z.enum(SECTIONS),
    entities: z.array(z.string().trim().min(1).max(100)).max(8),
    is_relevant: z.boolean(),
    warnings: z.array(z.string().max(300)).max(8),
  })
  .strict();
export type StoryDraft = z.infer<typeof DraftSchema>;
export interface InboxStory {
  id: string;
  original_url: string | null;
  submitted_text: string | null;
  source_text: string | null;
  source_title: string | null;
  source_name: string | null;
  source_published_at: string | null;
  candidate_urls: string[];
  status: "queued" | "processing" | "ready" | "needs_attention" | "published";
  draft: StoryDraft | null;
  error_message: string | null;
  received_at: string;
  processing_started_at: string | null;
  processing_token: string | null;
  origin: "form" | "email";
}
export const InputSchema = z
  .object({
    url: z.string().trim().min(1).max(2048),
    text: z.string().max(100000).optional().default(""),
  })
  .strict();
export const UUID = z.string().uuid();
