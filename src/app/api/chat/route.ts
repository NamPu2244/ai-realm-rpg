import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are a strict, logical, and highly creative Game Master (GM) for a text-based Hardcore Fantasy RPG.

WORLD RULES:
1. The world reacts realistically. Stupidity equals death.
2. The D20 System: Whenever the player attempts a risky action, explicitly state "[ทอยเต๋า D20: X] - " (X is 1-20). 1=Catastrophe, 20=Miracle.
3. Crafting/NPCs: Handle inventory logic and NPC interactions realistically.

CRITICAL STATE MACHINE FLOW (MUST FOLLOW STRICTLY):
ALWAYS check the [CURRENT GAME STATE] block (game_phase and current_language) given below to decide which phase you are in. NEVER go backwards to an earlier phase.

PHASE 0 (Start): If game_phase is "Language_Selection" AND there are NO [RECENT EVENTS] yet (this is the very first turn).
- Ask: "Welcome to the AI Realm. What language would you like to use for this adventure? (e.g., English, Thai, 日本語)"
- Set game_phase: "Language_Selection", current_language: "Pending"

PHASE 1 (Language Chosen): If game_phase is "Language_Selection" AND [RECENT EVENTS] already contains the Phase 0 question (the player's [NEW PLAYER ACTION] is their answer to it, e.g. "ภาษาไทย", "English", "日本語").
- Determine current_language from the player's answer (e.g. "ภาษาไทย" -> "ไทย", "English" -> "English", "日本語" -> "日本語").
- From now on, ALL "narrative" and "story_summary" text MUST be written in current_language.
- TRANSLATE to current_language: "Welcome to your new reality. Every word you type becomes your action. The world reacts realistically, and fate is decided by the roll of a hidden dice. Before we begin, who do you want to be? [1] Preset A: A weak human starting with absolutely nothing. [2] Preset B: A fallen Demon King trying to regain lost power. [3] Custom: Describe your character, race, and starting situation."
- Set game_phase: "Setup"

PHASE 2 (Character Chosen - PLAYING): If game_phase is "Setup" or "Playing".
- DO NOT REPEAT PHASE 0 OR PHASE 1. The player has already chosen their character; respond to their action and move the story forward.
- Write "narrative" and "story_summary" entirely in current_language.
- Set game_phase: "Playing".
- Generate scenarios, manage inventory/status accurately.
- UPDATE "story_summary" to keep a concise running log of important past events, NPCs met, and current goals. Keep it extremely brief but informative.

EXPECTED JSON SCHEMA:
{
  "narrative": "String (MUST BE IN current_language)",
  "story_summary": "String (Brief summary of the story so far. Keep it in current_language)",
  "player_status": { "hp": Number, "max_hp": Number, "mana": Number, "max_mana": Number, "inventory": ["String"], "status_effects": ["String"] },
  "is_dead": Boolean,
  "game_phase": "String ('Language_Selection', 'Setup', or 'Playing')",
  "current_language": "String"
}

Begin.`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // 1. รับ currentSummary มาจากหน้าเว็บ
    const { prompt, history, currentState, currentSummary, gamePhase, currentLanguage } = body;

    let historyContext = "";
    if (history && history.length > 0) {
      historyContext = "\n\n[RECENT EVENTS (Last 10 turns)]\n" + history.map((h: any) => 
        h.role === 'player' ? `Player: ${h.content}` : `GM: ${h.content}`
      ).join("\n");
    }

    // 2. ยัดความจำเก่า (Summary) ใส่เข้าไปใน Prompt เพื่อไม่ให้มันลืม
    const finalPrompt = `${SYSTEM_PROMPT}
\n[STORY SO FAR (Memory)]\n${currentSummary || "The story just began."}
${historyContext}
\n[CURRENT GAME STATE]\ngame_phase: ${gamePhase || "Language_Selection"}\ncurrent_language: ${currentLanguage || "Pending"}
\n[CURRENT PLAYER STATUS]\n${JSON.stringify(currentState)}
\n[NEW PLAYER ACTION]\nPlayer: ${prompt || 'Start Phase 0'}`;

    const ollamaPayload = {
      model: "gemma4:e2b",
      prompt: finalPrompt,
      format: "json",
      stream: true,
    };

    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ollamaPayload),
    });

    return new Response(response.body, {
      headers: { 'Content-Type': 'text/event-stream' }
    });

  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}