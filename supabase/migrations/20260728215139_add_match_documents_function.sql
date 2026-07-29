-- add metadata column 
alter table public.documents
add column if not exists metadata jsonb;

-- Create the similarity search function for LangChain
create or replace function match_documents (
  query_embedding extensions.vector(768),
  match_count int DEFAULT null,
  filter jsonb DEFAULT '{}'
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  embedding extensions.vector(768),
  similarity float
)
language plpgsql
as $$
#variable_conflict use_column
begin
  return query
  select
    id,
    content,
    metadata,
    embedding,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where metadata @> filter
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;