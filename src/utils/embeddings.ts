// Embedding generation is not available in production (requires a local model server).
// All callers wrap this in try/catch and degrade gracefully when it throws.
export async function generateEmbedding(_text: string): Promise<number[]> {
  throw new Error("Embedding service not available");
}
