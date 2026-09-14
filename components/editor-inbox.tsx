"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  SECTIONS,
  type InboxStory,
  type StoryDraft,
} from "@/lib/editorial/schema";
import { formatDate } from "@/lib/display";

const inputClass =
  "w-full border border-border bg-background px-3 py-3 text-sm rounded-sm";
const buttonClass =
  "border border-foreground px-4 py-3 font-mono text-xs hover:bg-foreground hover:text-background disabled:opacity-40 disabled:cursor-wait";
async function api(
  path: string,
  body?: unknown,
  method = body ? "POST" : "GET",
) {
  const response = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "The request could not be completed.");
  return data;
}
interface Connection {
  database: boolean;
  summaries: boolean;
  email: boolean;
  address: string;
  autoPublish: boolean;
}

export function EditorInbox({
  authenticated,
  connection,
}: {
  authenticated: boolean;
  connection?: Connection;
}) {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [stories, setStories] = useState<InboxStory[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState("all");
  const refresh = useCallback(async () => {
    if (!authenticated) return;
    try {
      const data = await api("/api/editor/stories");
      setStories(data.stories);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inbox unavailable.");
    }
  }, [authenticated]);
  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    void api("/api/editor/stories")
      .then((data) => {
        if (active) setStories(data.stories);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    const timer = setInterval(() => void refresh(), 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [authenticated, refresh]);

  if (!authenticated)
    return (
      <main className="max-w-md mx-auto px-5 py-20">
        <p className="font-mono text-xs uppercase tracking-widest mb-4">
          Your publication desk
        </p>
        <h1 className="font-serif text-4xl mb-4">Editor inbox</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-7">
          Sign in to add stories, fix imports, and manage the brief.
        </p>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api("/api/editor/session", { secret });
              window.location.reload();
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block text-sm">
            Editor key
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              required
              maxLength={256}
              autoComplete="current-password"
              className={`${inputClass} mt-2`}
            />
          </label>
          <button disabled={busy} className={buttonClass}>
            {busy ? "Signing in…" : "Open inbox"}
          </button>
          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </form>
      </main>
    );

  const visible = stories.filter(
    (story) =>
      filter === "all" ||
      (filter === "attention"
        ? ["needs_attention", "ready"].includes(story.status)
        : story.status === filter),
  );
  return (
    <main className="max-w-6xl mx-auto px-5 py-10">
      <div className="flex flex-wrap gap-4 justify-between items-start mb-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest mb-3">
            Your publication desk
          </p>
          <h1 className="font-serif text-5xl font-bold">Editor inbox</h1>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            {connection?.autoPublish
              ? "Forward a story. Supported briefs publish automatically; flagged imports stay here."
              : "New stories arrive as drafts for your review."}
          </p>
        </div>
        <button
          className="font-mono text-xs underline"
          onClick={async () => {
            await api("/api/editor/session", undefined, "DELETE");
            window.location.reload();
          }}
        >
          Sign out
        </button>
      </div>
      {connection &&
        (!connection.database ||
          !connection.summaries ||
          !connection.email) && (
          <div className="border border-amber-500/60 p-4 mb-6 text-sm">
            <strong>Connections to finish:</strong>{" "}
            {[
              !connection.database && "database",
              !connection.summaries && "summarization",
              !connection.email && "email forwarding",
            ]
              .filter(Boolean)
              .join(", ")}
            . The setup guide in the repository lists the required settings.
          </div>
        )}
      {connection?.email && (
        <p className="p-4 border border-border mb-6 text-sm">
          Forward one story at a time to{" "}
          <strong className="break-all">{connection.address}</strong>. Keep this
          inbox address private.
        </p>
      )}
      <section className="border border-border p-5 md:p-7 mb-8">
        <h2 className="font-serif text-2xl mb-4">Add a story</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            setNotice("");
            try {
              const result = await api("/api/editor/stories", { url, text });
              setUrl("");
              setText("");
              setSelectedId(result.id || "");
              setNotice(
                result.duplicate
                  ? "This story is already in your inbox."
                  : "Story received. Preparing the brief…",
              );
              await refresh();
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block text-sm">
            Original article link
            <input
              type="url"
              required
              maxLength={2048}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://publication.com/story"
              className={`${inputClass} mt-2`}
            />
          </label>
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400">
              Paste article text for a paywalled or unreadable page
            </summary>
            <label className="block text-sm mt-3">
              Article text
              <textarea
                rows={7}
                maxLength={100000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className={`${inputClass} mt-2`}
                placeholder="Paste the article itself, without private notes or email signatures."
              />
            </label>
          </details>
          <button disabled={busy} className={`${buttonClass} mt-5`}>
            {busy ? "Adding story…" : "Create the brief"}
          </button>
        </form>
      </section>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400 mb-5">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm mb-5">
          {notice}
        </p>
      )}
      <div className="flex flex-wrap gap-2 mb-5">
        {[
          ["all", "All"],
          ["attention", "Needs attention"],
          ["published", "Published"],
          ["queued", "Queued"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={`px-3 py-2 font-mono text-xs border ${filter === value ? "bg-foreground text-background border-foreground" : "border-border"}`}
          >
            {label}
          </button>
        ))}
        <button
          disabled={busy}
          className="ml-auto font-mono text-xs underline"
          onClick={async () => {
            setBusy(true);
            try {
              const result = await api("/api/jobs/process", {});
              setNotice(
                result.processed
                  ? "Queued story processed."
                  : "No queued or expired jobs to recover. Active jobs have a five-minute lease.",
              );
              await refresh();
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Recover queued work
        </button>
      </div>
      <div className="grid lg:grid-cols-[320px_1fr] gap-7">
        <section
          aria-label="Inbox stories"
          className="space-y-2 lg:max-h-[1000px] overflow-auto"
        >
          {visible.length === 0 && (
            <p className="text-sm text-gray-500 p-5">
              No stories in this view yet.
            </p>
          )}
          {visible.map((story) => (
            <button
              key={story.id}
              onClick={() => setSelectedId(story.id)}
              aria-pressed={selectedId === story.id}
              className={`block w-full text-left p-4 border ${selectedId === story.id ? "border-foreground bg-card" : "border-border"}`}
            >
              <span className="block font-mono text-[10px] uppercase tracking-wider mb-2">
                {story.status.replaceAll("_", " ")} ·{" "}
                {formatDate(story.received_at)}
              </span>
              <span className="font-serif text-lg leading-tight">
                {story.draft?.headline ||
                  story.source_title ||
                  story.original_url ||
                  "Forwarded story"}
              </span>
            </button>
          ))}
        </section>
        <section aria-label="Story editor">
          {selectedId ? (
            <StoryEditor key={selectedId} id={selectedId} onChange={refresh} />
          ) : (
            <div className="border border-dashed border-border p-10 text-center text-gray-500 text-sm">
              Choose a story to see its brief, source material, and publishing
              options.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StoryEditor({
  id,
  onChange,
}: {
  id: string;
  onChange: () => Promise<void>;
}) {
  const [story, setStory] = useState<InboxStory | null>(null);
  const [draft, setDraft] = useState<StoryDraft | null>(null);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const hydrate = useCallback((data: { story: InboxStory }) => {
    setStory(data.story);
    setDraft(data.story.draft);
    setUrl(data.story.original_url || "");
    setText(data.story.submitted_text || "");
    setDirty(false);
  }, []);
  const reload = useCallback(async () => {
    hydrate(await api(`/api/editor/stories/${id}`));
  }, [id, hydrate]);
  useEffect(() => {
    let active = true;
    void api(`/api/editor/stories/${id}`)
      .then((data) => {
        if (active) hydrate(data);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [id, hydrate]);
  useEffect(() => {
    if (!story || !["processing", "queued"].includes(story.status)) return;
    const timer = setInterval(
      () => void reload().catch((err) => setError(err.message)),
      3000,
    );
    return () => clearInterval(timer);
  }, [story?.status, reload, story]);
  async function action(body: unknown, message: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(`/api/editor/stories/${id}`, body);
      await reload();
      await onChange();
      setNotice(message);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function edit(changes: Partial<StoryDraft>) {
    if (draft) {
      setDraft({ ...draft, ...changes });
      setDirty(true);
    }
  }
  if (!story)
    return (
      <p role="status" className="p-5 text-sm">
        {error || "Opening story…"}
      </p>
    );
  const processing = ["processing", "queued"].includes(story.status);
  return (
    <div className="border border-border p-5 md:p-7 space-y-5">
      <div className="flex justify-between gap-3">
        <span className="font-mono text-xs uppercase tracking-wider">
          {story.status.replaceAll("_", " ")}
        </span>
        {story.status === "published" && (
          <Link
            href={`/article/${id}`}
            target="_blank"
            className="font-mono text-xs underline"
          >
            View live brief ↗
          </Link>
        )}
      </div>
      {story.error_message && (
        <p role="alert" className="text-sm text-amber-700 dark:text-amber-400">
          {story.error_message}
        </p>
      )}
      {processing && (
        <p role="status" className="text-sm">
          Reading the source and preparing the brief. You can leave this page;
          the story is saved in the queue.
        </p>
      )}
      {!processing && (
        <details open={!draft}>
          <summary className="cursor-pointer text-sm font-bold">
            Source link and text
          </summary>
          <div className="space-y-3 mt-4">
            {story.candidate_urls?.length > 1 && (
              <label className="block text-sm">
                Choose the story link
                <select
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className={`${inputClass} mt-2`}
                >
                  <option value="">Select an article</option>
                  {story.candidate_urls.map((candidate) => (
                    <option key={candidate} value={candidate}>
                      {candidate}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block text-sm">
              Original article link
              <input
                type="url"
                maxLength={2048}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className={`${inputClass} mt-2`}
                disabled={story.status === "published"}
              />
            </label>
            <label className="block text-sm">
              Article text (optional)
              <textarea
                rows={6}
                maxLength={100000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className={`${inputClass} mt-2`}
                disabled={story.status === "published"}
              />
            </label>
            {story.status !== "published" && (
              <button
                disabled={busy || !url}
                className={buttonClass}
                onClick={() =>
                  void action(
                    { action: "retry", url, text },
                    "Story queued for a fresh summary.",
                  )
                }
              >
                Read & summarize again
              </button>
            )}
            {story.source_text && (
              <details>
                <summary className="cursor-pointer text-xs">
                  View extracted source text
                </summary>
                <p className="mt-3 text-xs leading-relaxed max-h-64 overflow-auto whitespace-pre-wrap">
                  {story.source_text}
                </p>
              </details>
            )}
          </div>
        </details>
      )}
      {draft && (
        <>
          {draft.warnings.length > 0 && (
            <div className="border border-amber-500/60 p-4">
              <h3 className="text-sm font-bold mb-2">
                Check before publishing
              </h3>
              <ul className="list-disc pl-4 space-y-2 text-sm">
                {draft.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
          {!draft.is_relevant && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              This story was flagged as outside the publication’s focus.
            </p>
          )}
          <label className="block text-sm">
            Headline
            <input
              value={draft.headline}
              maxLength={160}
              onChange={(e) => edit({ headline: e.target.value })}
              className={`${inputClass} mt-2 font-serif text-xl`}
            />
          </label>
          <label className="block text-sm">
            Summary
            <textarea
              rows={7}
              maxLength={1400}
              value={draft.summary}
              onChange={(e) => edit({ summary: e.target.value })}
              className={`${inputClass} mt-2`}
            />
          </label>
          <div>
            <h3 className="text-sm mb-3">Key facts</h3>
            {draft.key_points.map((point, i) => (
              <div key={i} className="mb-4">
                <textarea
                  aria-label={`Key fact ${i + 1}`}
                  rows={2}
                  maxLength={350}
                  className={inputClass}
                  value={point.text}
                  onChange={(e) =>
                    edit({
                      key_points: draft.key_points.map((p, index) =>
                        index === i ? { ...p, text: e.target.value } : p,
                      ),
                    })
                  }
                />
                <details className="mt-1">
                  <summary className="cursor-pointer text-[11px] text-gray-500">
                    Supporting source passage
                  </summary>
                  <blockquote className="text-xs leading-relaxed mt-2 border-l border-border pl-3">
                    {point.evidence}
                  </blockquote>
                </details>
              </div>
            ))}
          </div>
          <label className="block text-sm">
            Why it matters
            <textarea
              rows={4}
              maxLength={600}
              value={draft.why_it_matters}
              onChange={(e) => edit({ why_it_matters: e.target.value })}
              className={`${inputClass} mt-2`}
            />
          </label>
          <label className="block text-sm">
            Section
            <select
              value={draft.section}
              onChange={(e) =>
                edit({ section: e.target.value as StoryDraft["section"] })
              }
              className={`${inputClass} mt-2`}
            >
              {SECTIONS.map((section) => (
                <option key={section}>{section}</option>
              ))}
            </select>
          </label>
          {dirty && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              You have unsaved edits. Save before publishing.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              className={buttonClass}
              disabled={busy || !dirty}
              onClick={() =>
                void action(
                  { action: "save", draft },
                  "Draft saved. Publish to update the public brief.",
                )
              }
            >
              Save edits
            </button>
            <button
              className={`${buttonClass} bg-[#E6FF00] text-black border-[#E6FF00]`}
              disabled={busy || dirty}
              onClick={() =>
                void action({ action: "publish" }, "The brief is published.")
              }
            >
              {story.status === "published"
                ? "Update live brief"
                : "Publish brief"}
            </button>
            {story.status === "published" && (
              <button
                className={buttonClass}
                disabled={busy}
                onClick={() =>
                  void action(
                    { action: "unpublish" },
                    "The brief is now private.",
                  )
                }
              >
                Unpublish
              </button>
            )}
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
    </div>
  );
}
