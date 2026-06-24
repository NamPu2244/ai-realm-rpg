"""
Convert raw storyweave-save JSON into JSONL training data for fine-tuning.

Usage:
    python scripts/export_training_data.py raw_game_data.json output_train.jsonl

Each line in the output is one conversation turn:
  {"messages": [
    {"role": "system", "content": "<system prompt>"},
    {"role": "user",   "content": "<player action + context>"},
    {"role": "assistant", "content": "<GM JSON response>"}
  ]}
"""

import json
import sys
import re
from pathlib import Path

SYSTEM_PROMPT_LITE = """You are a Game Master (GM) running a text-based RPG. Respond ONLY with a valid JSON object matching the schema. Never add prose outside the JSON.

STORYTELLING RULES:
- Show Don't Tell: never state emotions directly. Use physical sensory details — smell, sound, temperature, texture.
- NPCs have flaws, hidden agendas, and distinct voices. Never polite or helpful without a cost.
- End every narrative with an unresolved tension that forces an immediate decision.
- On failure or injury: describe the exact physical moment it happens before updating stats.
- Vary sentence length to match pacing. Short in action. Longer in exploration.

GAMEPLAY:
- Roll D20 for uncertain actions. Apply attribute modifier. Announce the roll in the narrative.
- Keep player_status 100% consistent with the narrative every turn.
- Update story_summary, current_objective, and suggested_actions every turn.
"""

def build_user_message(turn_index, history, current_state, summary, world_config, player_action):
    recent = history[max(0, turn_index - 10):turn_index]
    history_text = ""
    if recent:
        history_text = "\n\n[RECENT EVENTS]\n" + "\n".join(
            f"{'Player' if h['role'] == 'player' else 'GM'}: {h['content']}"
            for h in recent
        )

    world_text = ""
    if world_config:
        world_text = f"\n\nWORLD: {world_config.get('genre', '')} | Character: {world_config.get('character', '')} | Tone: {world_config.get('tone', 'balanced')} | Language: {world_config.get('language', 'ไทย')}"

    return (
        f"[STORY SO FAR]\n{summary or 'The story just began.'}"
        f"{world_text}"
        f"{history_text}"
        f"\n\n[CURRENT PLAYER STATUS]\n{json.dumps(current_state or {})}"
        f"\n\n[NEW PLAYER ACTION]\nPlayer: {player_action}"
    )

def extract_gm_json(gm_content: str) -> str:
    match = re.search(r'\{[\s\S]+\}', gm_content)
    if not match:
        return ""
    try:
        parsed = json.loads(match.group())
        if "narrative" not in parsed:
            return ""
        return json.dumps(parsed, ensure_ascii=False)
    except json.JSONDecodeError:
        return ""

def convert(input_path: str, output_path: str):
    raw = json.loads(Path(input_path).read_text(encoding="utf-8"))

    # Support both direct save object and array of saves
    saves = raw if isinstance(raw, list) else [raw]

    total = 0
    skipped = 0

    with open(output_path, "w", encoding="utf-8") as out:
        for save in saves:
            history = save.get("history", [])
            world_config = save.get("world_config", {})
            summary = save.get("story_summary", "")

            # Walk through history and pair player → gm turns
            i = 0
            while i < len(history) - 1:
                if history[i]["role"] == "player" and history[i + 1]["role"] == "gm":
                    player_turn = history[i]
                    gm_turn = history[i + 1]

                    gm_json = extract_gm_json(gm_turn["content"])
                    if not gm_json:
                        skipped += 1
                        i += 2
                        continue

                    # Reconstruct approximate player_status from the GM response
                    try:
                        gm_data = json.loads(gm_json)
                        current_state = gm_data.get("player_status", {})
                    except Exception:
                        current_state = {}

                    user_msg = build_user_message(
                        turn_index=i,
                        history=history,
                        current_state=current_state,
                        summary=summary,
                        world_config=world_config,
                        player_action=player_turn["content"],
                    )

                    sample = {
                        "messages": [
                            {"role": "system", "content": SYSTEM_PROMPT_LITE},
                            {"role": "user", "content": user_msg},
                            {"role": "assistant", "content": gm_json},
                        ]
                    }
                    out.write(json.dumps(sample, ensure_ascii=False) + "\n")
                    total += 1

                    # Update rolling summary from GM response
                    try:
                        summary = json.loads(gm_json).get("story_summary", summary)
                    except Exception:
                        pass

                    i += 2
                else:
                    i += 1

    print(f"Done: {total} training samples written, {skipped} GM turns skipped (no valid JSON).")
    print(f"Output: {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python export_training_data.py <input.json> <output.jsonl>")
        sys.exit(1)
    convert(sys.argv[1], sys.argv[2])
