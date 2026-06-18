const OLLAMA_BASE = "http://127.0.0.1:11434";

export async function generateEmbedding(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_BASE}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "all-minilm", input: text.slice(0, 2000) }),
  });
  const data = await res.json();
  return data.embeddings[0] as number[];
}
