-- Additive migration: legacy articles and n8n-owned data are left intact.
create table public.editorial_inbox (
  id uuid primary key default gen_random_uuid(),
  original_url text unique,
  submitted_text text,
  source_text text,
  source_title text,
  source_name text,
  source_published_at timestamptz,
  candidate_urls jsonb not null default '[]'::jsonb,
  origin text not null check (origin in ('form', 'email')),
  external_id text unique,
  status text not null default 'queued' check (status in ('queued','processing','ready','needs_attention','published')),
  draft jsonb,
  error_message text,
  received_at timestamptz not null default now(),
  processing_started_at timestamptz,
  processing_token uuid,
  attempts integer not null default 0
);
alter table public.editorial_inbox enable row level security;
revoke all on public.editorial_inbox from anon, authenticated;
grant all on public.editorial_inbox to service_role;

create table public.published_stories (
  id uuid primary key references public.editorial_inbox(id),
  original_url text not null unique,
  headline text not null,
  analyst_summary text not null,
  key_points jsonb not null default '[]'::jsonb,
  why_it_matters text not null,
  section text not null check (section in ('Film','TV','Streaming','Business','Creators','Technology','Culture')),
  entities jsonb not null default '[]'::jsonb,
  source_name text not null,
  source_published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  link_status text not null default 'active' check (link_status in ('active','inactive')),
  search_document tsvector generated always as (
    to_tsvector('english', coalesce(headline,'') || ' ' || coalesce(analyst_summary,'') || ' ' || coalesce(source_name,''))
  ) stored
);
create index published_stories_feed_idx on public.published_stories (created_at desc, id desc) where link_status = 'active';
create index published_stories_search_idx on public.published_stories using gin (search_document);
alter table public.published_stories enable row level security;
revoke all on public.published_stories from anon, authenticated;
grant select on public.published_stories to anon, authenticated;
grant all on public.published_stories to service_role;
create policy "Published stories are public" on public.published_stories for select to anon, authenticated using (link_status = 'active');

-- A lease and token prevent concurrent deliveries/jobs from publishing twice.
create function public.claim_editorial_story(story_id uuid default null)
returns setof public.editorial_inbox language plpgsql security definer set search_path = public as $$
begin
  update editorial_inbox set status = 'needs_attention', processing_token = null, error_message = 'Processing was interrupted repeatedly. Retry from the inbox.'
  where status = 'processing' and attempts >= 5 and processing_started_at < now() - interval '5 minutes';
  return query
  update editorial_inbox set status = 'processing', processing_started_at = now(), processing_token = gen_random_uuid(), attempts = attempts + 1, error_message = null
  where id = (
    select id from editorial_inbox
    where (story_id is null or id = story_id) and original_url is not null and attempts < 5
      and (status = 'queued' or (status = 'processing' and processing_started_at < now() - interval '5 minutes'))
    order by received_at for update skip locked limit 1
  ) returning *;
end;
$$;
revoke all on function public.claim_editorial_story(uuid) from public, anon, authenticated;
grant execute on function public.claim_editorial_story(uuid) to service_role;

-- Publication and inbox status change succeed or fail together. Republishing is
-- idempotent and preserves the original publication timestamp/cursor ordering.
create function public.publish_editorial_story(story_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare story editorial_inbox; points jsonb;
begin
  select * into story from editorial_inbox where id = story_id for update;
  if not found or story.status not in ('ready','published') or story.draft is null or story.original_url is null or story.source_text is null then
    raise exception 'Story is not ready to publish';
  end if;
  select jsonb_agg(value->>'text') into points from jsonb_array_elements(story.draft->'key_points');
  insert into published_stories (id, original_url, headline, analyst_summary, key_points, why_it_matters, section, entities, source_name, source_published_at)
  values (story.id, story.original_url, story.draft->>'headline', story.draft->>'summary', points,
    story.draft->>'why_it_matters', story.draft->>'section', story.draft->'entities', coalesce(story.source_name, ''), story.source_published_at)
  on conflict (id) do update set original_url = excluded.original_url, headline = excluded.headline, analyst_summary = excluded.analyst_summary,
    key_points = excluded.key_points, why_it_matters = excluded.why_it_matters, section = excluded.section,
    entities = excluded.entities, source_name = excluded.source_name, source_published_at = excluded.source_published_at,
    link_status = 'active', updated_at = now();
  update editorial_inbox set status = 'published', error_message = null where id = story.id;
  return story.id;
end;
$$;
revoke all on function public.publish_editorial_story(uuid) from public, anon, authenticated;
grant execute on function public.publish_editorial_story(uuid) to service_role;

create function public.unpublish_editorial_story(story_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform id from editorial_inbox where id = story_id for update;
  update published_stories set link_status = 'inactive', updated_at = now() where id = story_id;
  update editorial_inbox set status = 'ready' where id = story_id and status = 'published';
end;
$$;
revoke all on function public.unpublish_editorial_story(uuid) from public, anon, authenticated;
grant execute on function public.unpublish_editorial_story(uuid) to service_role;
