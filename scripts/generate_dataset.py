"""
Generate real GM training data using Groq API.

อ่าน rpg_raw.jsonl → เรียก Groq สร้าง GM response จริงๆ → บันทึก rpg_finetune_real.jsonl

Usage:
    python3 scripts/generate_dataset.py
    python3 scripts/generate_dataset.py --limit 200 --output rpg_finetune_real.jsonl
"""

import json
import os
import time
import random
import argparse
import urllib.request
from pathlib import Path

# โหลด .env.local
def load_env():
    env_path = Path(__file__).parent.parent / ".env.local"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

load_env()

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

SYSTEM_PROMPT = """You are a creative Game Master (GM) running a text-based RPG. Respond ONLY with a valid JSON object.

RULES:
- ALL narrative text MUST be in Thai (ภาษาไทย) only — no English in narrative/summary/objective
- Keep narrative 2-5 sentences, vivid and specific, no generic phrases
- Update player_status to reflect what happened in the narrative
- suggested_actions must be in Thai, under 8 words each

RESPOND WITH ONLY THIS JSON (no markdown, no extra text):
{
  "narrative": "String (Thai)",
  "player_status": {
    "hp": Number, "max_hp": Number, "mana": Number, "max_mana": Number,
    "gold": Number, "inventory": ["String"], "status_effects": ["String"],
    "level": Number, "exp": Number, "skills": ["String"],
    "attributes": {"str": Number, "dex": Number, "int": Number, "con": Number, "wis": Number, "cha": Number}
  },
  "story_summary": "String (Thai, 1-2 sentences)",
  "current_objective": "String (Thai, 1 sentence)",
  "scene_image_prompt": "String (English keywords for image gen, or empty string)",
  "is_dead": false,
  "is_qte_active": false,
  "qte_time_limit": 0,
  "qte_options": [],
  "lives_left": 3,
  "time_of_day": "ค่ำ",
  "in_world_date": "วันที่ 1 แห่งเดือนแรก",
  "dialogue_lines": [],
  "character_updates": [],
  "faction_updates": [],
  "quest_updates": [],
  "companion_updates": [],
  "new_locations": [],
  "open_threads": [],
  "countdown_event": null,
  "suggested_actions": ["String (Thai)", "String (Thai)", "String (Thai)"]
}"""

SAMPLE_STATES = [
    {"hp": 10, "max_hp": 10, "mana": 5, "max_mana": 5, "gold": 5, "inventory": [], "status_effects": [], "level": 1, "exp": 0, "skills": [], "attributes": {"str": 10, "dex": 10, "int": 10, "con": 10, "wis": 10, "cha": 10}},
    {"hp": 22, "max_hp": 30, "mana": 15, "max_mana": 20, "gold": 85, "inventory": ["ดาบสั้น", "โล่ไม้", "ยาฟื้นฟู x2"], "status_effects": [], "level": 3, "exp": 60, "skills": ["โจมตีพื้นฐาน", "ป้องกัน"], "attributes": {"str": 14, "dex": 11, "int": 9, "con": 13, "wis": 10, "cha": 8}},
    {"hp": 8, "max_hp": 25, "mana": 0, "max_mana": 30, "gold": 200, "inventory": ["ไม้เท้าเวทย์", "หนังสือคาถา", "ยาแมนา x1"], "status_effects": ["เหนื่อยล้า"], "level": 5, "exp": 80, "skills": ["ลูกไฟ", "โล่เวทย์"], "attributes": {"str": 7, "dex": 10, "int": 16, "con": 9, "wis": 13, "cha": 12}},
    {"hp": 35, "max_hp": 40, "mana": 10, "max_mana": 10, "gold": 320, "inventory": ["ธนูยาว", "ลูกศร x20", "มีดล่าสัตว์"], "status_effects": [], "level": 6, "exp": 30, "skills": ["ยิงธนู", "ซ่อนตัว", "ติดตามรอย"], "attributes": {"str": 11, "dex": 16, "int": 12, "con": 12, "wis": 14, "cha": 9}},
]

SAMPLE_SUMMARIES = [
    "ผู้เล่นเริ่มต้นการผจญภัยในดินแดนแห่งใหม่",
    "ผู้เล่นกำลังสำรวจเมืองชายแดน Thornwall ที่เต็มไปด้วยพ่อค้าและทหารรับจ้าง",
    "ผู้เล่นได้รับภารกิจกำจัดโจรที่รุกรานหมู่บ้าน และกำลังเดินทางสู่ป่า Darkwood",
    "ผู้เล่นค้นพบว่ามีลัทธิลึกลับซ่อนตัวอยู่ในเมือง และกำลังสืบสวนเรื่องนี้",
    "ผู้เล่นอยู่ในตลาดกลางเมือง กำลังหาข้อมูลเกี่ยวกับสมบัติโบราณ",
]

GENRES = [
    "High Fantasy — magic, dragons, medieval kingdoms",
    "Dark Fantasy — grimdark, morally ambiguous, harsh consequences",
    "Sword & Sorcery — personal adventure, ancient ruins, treasure hunting",
]


def build_user_prompt(action: str, idx: int) -> str:
    state = SAMPLE_STATES[idx % len(SAMPLE_STATES)]
    summary = SAMPLE_SUMMARIES[idx % len(SAMPLE_SUMMARIES)]
    genre = GENRES[idx % len(GENRES)]
    return (
        f"[GENRE]: {genre}\n"
        f"[STORY SO FAR]\n{summary}\n\n"
        f"[CURRENT PLAYER STATUS]\n{json.dumps(state, ensure_ascii=False)}\n\n"
        f"[LIVES LEFT]\n3\n\n"
        f"[NEW PLAYER ACTION]\nPlayer: {action}"
    )


def _parse_gemini_content(raw: str) -> dict:
    text = raw.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1] if len(parts) > 1 else text
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


def _make_gemini_request(user_prompt: str) -> urllib.request.Request:
    payload = json.dumps({
        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": {"temperature": 0.85, "maxOutputTokens": 1024},
    }).encode()
    url = f"{GEMINI_URL}?key={GEMINI_API_KEY}"
    return urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")


def call_gemini(user_prompt: str, retries: int = 3) -> dict | None:
    import urllib.error

    req = _make_gemini_request(user_prompt)
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read())
                raw = data["candidates"][0]["content"]["parts"][0]["text"]
                return _parse_gemini_content(raw)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = 30 * (attempt + 1)
                print(f"  Rate limit — รอ {wait}s...")
                time.sleep(wait)
            else:
                print(f"  HTTP {e.code}: {e.reason}")
                return None
        except (json.JSONDecodeError, KeyError) as e:
            print(f"  Parse error: {e}")
            return None
        except Exception as e:
            print(f"  Error: {e}")
            time.sleep(5)
    return None


def extract_actions(raw_path: str) -> list[str]:
    actions = []
    with open(raw_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
                convs = row.get("conversations", [])
                human = next((c for c in convs if c.get("from") == "human"), None)
                if not human:
                    continue
                text = human.get("value", "").strip()
                if 20 <= len(text) <= 300:
                    actions.append(text)
            except json.JSONDecodeError:
                continue
    return actions


def already_done(output_path: str) -> int:
    if not Path(output_path).exists():
        return 0
    with open(output_path) as f:
        return sum(1 for line in f if line.strip())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="rpg_raw.jsonl")
    parser.add_argument("--output", default="rpg_finetune_real.jsonl")
    parser.add_argument("--limit", type=int, default=500)
    parser.add_argument("--delay", type=float, default=1.5, help="วินาทีรอระหว่าง requests")
    args = parser.parse_args()

    if not GEMINI_API_KEY:
        print("ERROR: ไม่พบ GEMINI_API_KEY ใน .env.local")
        return

    print(f"อ่าน actions จาก {args.input}...")
    actions = extract_actions(args.input)
    random.shuffle(actions)
    print(f"พบ {len(actions)} actions")

    done = already_done(args.output)
    if done > 0:
        print(f"Resume: มี {done} rows แล้ว จะเริ่มต่อจาก row {done+1}")

    target = min(args.limit, len(actions))
    actions = actions[done:target]

    ok = done
    skip = 0

    with open(args.output, "a") as fout:
        for i, action in enumerate(actions):
            global_idx = done + i
            user_prompt = build_user_prompt(action, global_idx)

            print(f"[{global_idx+1}/{target}] {action[:60]}...")
            gm = call_gemini(user_prompt)

            if gm is None:
                skip += 1
                print("  ข้าม (error)")
                continue

            record = {
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                    {"role": "assistant", "content": json.dumps(gm, ensure_ascii=False)},
                ]
            }
            fout.write(json.dumps(record, ensure_ascii=False) + "\n")
            fout.flush()
            ok += 1

            time.sleep(args.delay + random.uniform(0, 0.5))

    print(f"\nเสร็จ! สร้างได้ {ok} examples, ข้าม {skip} rows")
    print(f"Output: {args.output}")


if __name__ == "__main__":
    main()
