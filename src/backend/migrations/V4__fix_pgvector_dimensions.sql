-- Drop the existing index on story_embeddings
DROP INDEX IF EXISTS story_embeddings_embedding_idx;

-- Alter the embedding column to 768 dimensions (Gemini standard)
ALTER TABLE story_embeddings 
ALTER COLUMN embedding TYPE vector(768) 
USING embedding::vector(768);

-- Recreate the IVFFlat index for Cosine Similarity
CREATE INDEX ON story_embeddings USING ivfflat (embedding vector_cosine_ops);
