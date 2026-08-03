-- 1. Drop the existing function signature
DROP FUNCTION IF EXISTS public.match_documents(extensions.vector, integer, jsonb);
-- Also drop with generic vector type if using different schema path
DROP FUNCTION IF EXISTS public.match_documents;

-- 2. Create the updated function
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding extensions.vector(768),
  match_count int DEFAULT 4,
  filter jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 
    CASE 
      WHEN filter IS NULL OR filter = '{}'::jsonb THEN TRUE
      ELSE documents.metadata @> filter
    END
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;