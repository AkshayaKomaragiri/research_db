create extension if not exists vector;
create table if not exists public.documents (
  id bigserial primary key,
  content text not null,
  embedding extensions.vector(768)
);