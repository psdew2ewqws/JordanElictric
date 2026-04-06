-- Vector similarity search function for RAG
CREATE OR REPLACE FUNCTION match_knowledge_docs(
  query_embedding extensions.vector(1536),
  match_count INT DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  source_file TEXT,
  section_title TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kd.id,
    kd.source_file,
    kd.section_title,
    kd.content,
    1 - (kd.embedding <=> query_embedding) AS similarity
  FROM knowledge_docs kd
  WHERE kd.embedding IS NOT NULL
  ORDER BY kd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
