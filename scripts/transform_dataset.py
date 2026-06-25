"""
Transform OpenHermes-2.5 RPG-filtered rows into fine-tuning format
for the Storyweave GM model.

Input:  rpg_raw.jsonl  (output from download/filter step)
Output: rpg_finetune.jsonl  (ready for Unsloth / Colab training)
"""

import json
import random
import sys

SYSTEM_PROMPT = """You are a creative, adaptive Game Master (GM) running a text-based RPG. Respond ONLY with a valid JSON object matching the schema below. All narrative text must be in Thai (ภาษาไทย).

SCHEMA:
{
  "narrative": "String (Thai)",
  "player_status": {
    "hp": Number, "max_hp": Number, "mana": Number, "max_mana": Number,
    "gold": Number, "inventory": ["String"], "status_effects": ["String"],
    "level": Number, "exp": Number, "skills": ["String"],
    "attributes": {"str": Number, "dex": Number, "int": Number, "con": Number, "wis": Number, "cha": Number}
  },
  "story_summary": "String (Thai)",
  "current_objective": "String (Thai)",
  "scene_image_prompt": "String (English, or empty string)",
  "is_dead": Boolean,
  "is_qte_active": Boolean,
  "qte_time_limit": Number,
  "qte_options": ["String"],
  "lives_left": Number,
  "time_of_day": "String (เช้าตรู่/สาย/บ่าย/เย็น/ค่ำ/ดึก)",
  "in_world_date": "String",
  "dialogue_lines": [{"speaker": "String", "text": "String"}],
  "character_updates": [],
  "faction_updates": [],
  "quest_updates": [],
  "companion_updates": [],
  "new_locations": [],
  "open_threads": [],
  "countdown_event": null,
  "suggested_actions": ["String (Thai, under 8 words)"]
}"""

# Sample player statuses for variety
SAMPLE_STATUSES = [
    {"hp": 10, "max_hp": 10, "mana": 5, "max_mana": 5, "gold": 5, "inventory": [], "status_effects": [], "level": 1, "exp": 0, "skills": [], "attributes": {"str": 10, "dex": 10, "int": 10, "con": 10, "wis": 10, "cha": 10}},
    {"hp": 18, "max_hp": 25, "mana": 12, "max_mana": 20, "gold": 47, "inventory": ["ดาบสั้น", "โล่ไม้", "ยาฟื้นฟู x2"], "status_effects": [], "level": 3, "exp": 45, "skills": ["โจมตีพื้นฐาน", "ป้องกัน"], "attributes": {"str": 13, "dex": 11, "int": 9, "con": 12, "wis": 10, "cha": 8}},
    {"hp": 8, "max_hp": 30, "mana": 0, "max_mana": 15, "gold": 120, "inventory": ["ไม้เท้าเวทย์", "หนังสือคาถา", "ยาแมนา x1"], "status_effects": ["บาดแผลเล็กน้อย"], "level": 5, "exp": 72, "skills": ["ลูกไฟ", "โล่เวทย์", "อ่านความคิด"], "attributes": {"str": 7, "dex": 10, "int": 16, "con": 9, "wis": 13, "cha": 12}},
]

SAMPLE_SUMMARIES = [
    "The story just began.",
    "ผู้เล่นเพิ่งมาถึงเมืองชายแดนชื่อ Thornwall และได้รับภารกิจกำจัดแก๊งโจรจากนายกเทศมนตรี",
    "ผู้เล่นกำลังสืบสวนการหายตัวของนักบวชในป่า Darkwood พบร่องรอยของลัทธิที่บูชาปีศาจ",
]

def build_user_prompt(player_action: str, status_idx: int = 0, summary_idx: int = 0) -> str:
    status = SAMPLE_STATUSES[status_idx % len(SAMPLE_STATUSES)]
    summary = SAMPLE_SUMMARIES[summary_idx % len(SAMPLE_SUMMARIES)]
    lives = 3
    return (
        f"[STORY SO FAR]\n{summary}\n\n"
        f"[CURRENT PLAYER STATUS]\n{json.dumps(status, ensure_ascii=False)}\n\n"
        f"[LIVES LEFT]\n{lives}\n\n"
        f"[NEW PLAYER ACTION]\nPlayer: {player_action}"
    )


def extract_rpg_action(row: dict) -> str | None:
    """Extract a usable player action string from an OpenHermes row."""
    convs = row.get("conversations", [])
    if not convs:
        return None
    human_turn = next((c for c in convs if c.get("from") == "human"), None)
    if not human_turn:
        return None
    text = human_turn.get("value", "").strip()
    # Skip very short or very long texts
    if len(text) < 20 or len(text) > 500:
        return None
    return text


def extract_gpt_response(row: dict) -> str | None:
    """Extract the GPT/assistant response from an OpenHermes row."""
    convs = row.get("conversations", [])
    gpt_turn = next((c for c in convs if c.get("from") == "gpt"), None)
    if not gpt_turn:
        return None
    return gpt_turn.get("value", "").strip()


def make_synthetic_gm_response(action: str, status_idx: int) -> dict:
    """
    Build a minimal but valid GM JSON response for training.
    In production you'd use a strong model (GPT-4/Claude) to generate these.
    This produces structurally-correct placeholders for format training.
    """
    status = SAMPLE_STATUSES[status_idx % len(SAMPLE_STATUSES)].copy()
    return {
        "narrative": f"[GM RESPONSE TO: {action[:80]}]",  # placeholder — replace with real generations
        "player_status": status,
        "story_summary": SAMPLE_SUMMARIES[status_idx % len(SAMPLE_SUMMARIES)],
        "current_objective": "ดำเนินภารกิจต่อไป",
        "scene_image_prompt": "",
        "is_dead": False,
        "is_qte_active": False,
        "qte_time_limit": 0,
        "qte_options": [],
        "lives_left": 3,
        "time_of_day": "ค่ำ",
        "in_world_date": "วันที่ 1 แห่งเดือนลมหนาว",
        "dialogue_lines": [],
        "character_updates": [],
        "faction_updates": [],
        "quest_updates": [],
        "companion_updates": [],
        "new_locations": [],
        "open_threads": [],
        "countdown_event": None,
        "suggested_actions": ["สำรวจพื้นที่โดยรอบ", "พูดคุยกับ NPC ใกล้เคียง", "ตรวจสอบสิ่งของในกระเป๋า"]
    }


def transform(input_path: str, output_path: str, limit: int = 0):
    total = 0
    written = 0

    with open(input_path, "r") as fin, open(output_path, "w") as fout:
        for line in fin:
            line = line.strip()
            if not line:
                continue
            total += 1
            if limit and written >= limit:
                break

            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue

            action = extract_rpg_action(row)
            if not action:
                continue

            idx = written % len(SAMPLE_STATUSES)
            user_prompt = build_user_prompt(action, status_idx=idx, summary_idx=idx)
            gm_response = make_synthetic_gm_response(action, status_idx=idx)

            record = {
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                    {"role": "assistant", "content": json.dumps(gm_response, ensure_ascii=False)},
                ]
            }
            fout.write(json.dumps(record, ensure_ascii=False) + "\n")
            written += 1

    print(f"อ่าน {total} rows → เขียน {written} examples ไปที่ {output_path}")


if __name__ == "__main__":
    input_file = sys.argv[1] if len(sys.argv) > 1 else "rpg_raw.jsonl"
    output_file = sys.argv[2] if len(sys.argv) > 2 else "rpg_finetune.jsonl"
    limit = int(sys.argv[3]) if len(sys.argv) > 3 else 0
    transform(input_file, output_file, limit)
