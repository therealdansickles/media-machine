import { isEditor, sameOrigin } from "@/lib/editorial/server";
import { safeEqual } from "@/lib/editorial/session";
import { processStory } from "@/lib/editorial/process";

export const maxDuration = 180;
async function run() {
  try {
    return Response.json({ processed: await processStory() });
  } catch {
    return Response.json(
      { error: "The queue could not be processed." },
      { status: 503 },
    );
  }
}
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (
    !secret ||
    !safeEqual(request.headers.get("authorization") ?? "", `Bearer ${secret}`)
  )
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  return run();
}
export async function POST(request: Request) {
  if (!(await isEditor()) || !sameOrigin(request))
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  return run();
}
