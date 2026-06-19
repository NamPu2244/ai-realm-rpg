import { NextResponse } from "next/server";

export const maxDuration = 30;
import { generateEmbedding } from "@/utils/embeddings";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// POST /api/memories
// Called by the client every N turns to summarize recent history and store it
// as a searchable embedding in the game_memories table.
//
// Body: {
//   saveSlotId:     string               — UUID of the current save slot
//   recentHistory:  { role, content }[]  — last ~20 messages (player + gm)
// }

const SUMMARY_INSTRUCTION = `You are a precise note-taker for an RPG game. Summarize the following recent game events into 2-4 concise factual sentences in English. Focus only on: key plot events, items acquired or lost, named NPCs encountered, locations visited, and active quest progress. Omit blow-by-blow combat details. Be specific — use proper names, not vague pronouns.

Recent events:
`;

async function getSummaryFromGroq(historyText: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "user", content: SUMMARY_INSTRUCTION + historyText + "\n\nSummary:" },
      ],
      max_tokens: 256,
      temperature: 0.3,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { saveSlotId, recentHistory } = body as {
      saveSlotId: string;
      recentHistory: { role: "player" | "gm"; content: string }[];
    };

    if (!saveSlotId || !Array.isArray(recentHistory) || recentHistory.length === 0) {
      return NextResponse.json({ error: "Missing saveSlotId or recentHistory" }, { status: 400 });
    }

    const historyText = recentHistory
      .map((h) => `${h.role === "player" ? "Player" : "GM"}: ${h.content.slice(0, 600)}`)
      .join("\n");

    let memoryText = "";
    try {
      memoryText = await getSummaryFromGroq(historyText);
    } catch (err) {
      console.error("[memories] summarization failed:", err);
      return NextResponse.json({ error: "Summarization failed" }, { status: 502 });
    }

    if (!memoryText) {
      return NextResponse.json({ error: "Empty summary from AI" }, { status: 422 });
    }

    let embedding: number[];
    try {
      embedding = await generateEmbedding(memoryText);
    } catch (err) {
      console.error("[memories] embedding failed:", err);
      return NextResponse.json({ error: "Embedding generation failed" }, { status: 502 });
    }

    const supabase = getSupabaseServerClient();
    const { error: dbError } = await supabase.from("game_memories").insert({
      save_slot_id: saveSlotId,
      memory_text: memoryText,
      // pgvector expects the vector literal format: '[0.1, 0.2, ...]'
      embedding: `[${embedding.join(",")}]`,
    });

    if (dbError) {
      console.error("[memories] insert error:", dbError);
      return NextResponse.json({ error: "Storage failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, memoryText });
  } catch (err) {
    console.error("[memories] unexpected error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
