create extension if not exists vector with schema extensions;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  body text not null check (char_length(body) between 1 and 20000),
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_chunks (
  id bigserial primary key,
  post_id uuid not null references public.posts(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding extensions.vector(768) not null,
  unique (post_id, chunk_index)
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists post_chunks_post_id_idx on public.post_chunks (post_id);

alter table public.posts enable row level security;
alter table public.post_chunks enable row level security;

create policy "Anyone can read posts" on public.posts
  for select to anon, authenticated using (true);
create policy "Authors can create posts" on public.posts
  for insert to authenticated with check ((select auth.uid()) = author_id);
create policy "Authors can edit posts" on public.posts
  for update to authenticated using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);
create policy "Authors can delete posts" on public.posts
  for delete to authenticated using ((select auth.uid()) = author_id);

-- Embeddings are accessed only by the trusted FastAPI database connection.
revoke all on public.post_chunks from anon, authenticated;

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do update set public = true;

-- Image writes happen through the FastAPI server with the service role key.
create policy "Public post images" on storage.objects
  for select to anon, authenticated using (bucket_id = 'post-images');

