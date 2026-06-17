// Generates a 384-dimension vector embedding using Xenova/all-MiniLM-L6-v2
// running locally via ONNX runtime — no API key required.
//
// The model (~80 MB) is downloaded from HuggingFace Hub on first use and
// cached to ~/.cache/huggingface/hub/ for subsequent requests.
import { pipeline } from "@xenova/transformers";
import type { FeatureExtractionPipeline } from "@xenova/transformers";

// Persist the pipeline across Next.js hot-reloads in development.
declare global {
  // eslint-disable-next-line no-var
  var __embeddingPipeline: FeatureExtractionPipeline | undefined;
}

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!globalThis.__embeddingPipeline) {
    globalThis.__embeddingPipeline = (await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    )) as FeatureExtractionPipeline;
  }
  return globalThis.__embeddingPipeline;
}

// MiniLM-L6-v2 has a 512-token input limit; 2 000 chars comfortably fits.
export async function generateEmbedding(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor(text.slice(0, 2000), {
    pooling: "mean",
    normalize: true,
  });
  return Array.from(output.data) as number[];
}
