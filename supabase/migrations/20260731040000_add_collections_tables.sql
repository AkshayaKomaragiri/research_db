create extension if not exists pgcrypto;

create table if not exists public.collection_papers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  paper_name text not null,
  paper_path text not null,
  created_at timestamptz not null default now(),
  unique (user_id, collection_id, paper_path)
);

alter table public.collections enable row level security;
alter table public.collection_papers enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'collections' and policyname = 'Users can view their own collections'
  ) then
    create policy "Users can view their own collections"
      on public.collections for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'collections' and policyname = 'Users can insert their own collections'
  ) then
    create policy "Users can insert their own collections"
      on public.collections for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'collections' and policyname = 'Users can update their own collections'
  ) then
    create policy "Users can update their own collections"
      on public.collections for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'collections' and policyname = 'Users can delete their own collections'
  ) then
    create policy "Users can delete their own collections"
      on public.collections for delete
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'collection_papers' and policyname = 'Users can view their own collection papers'
  ) then
    create policy "Users can view their own collection papers"
      on public.collection_papers for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'collection_papers' and policyname = 'Users can insert their own collection papers'
  ) then
    create policy "Users can insert their own collection papers"
      on public.collection_papers for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'collection_papers' and policyname = 'Users can update their own collection papers'
  ) then
    create policy "Users can update their own collection papers"
      on public.collection_papers for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'collection_papers' and policyname = 'Users can delete their own collection papers'
  ) then
    create policy "Users can delete their own collection papers"
      on public.collection_papers for delete
      using (auth.uid() = user_id);
  end if;
end $$;
