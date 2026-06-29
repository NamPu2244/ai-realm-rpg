"""
Kaggle Notebook: Generate RPG GM Dataset using Gemini API
==========================================================
วิธีใช้:
1. สร้าง Kaggle Dataset จาก rpg_raw.jsonl ก่อน
2. สร้าง Notebook ใหม่ (CPU ก็พอ)
3. เพิ่ม dataset นั้นเข้า notebook
4. Copy code แต่ละ cell ไปวางใน Kaggle
5. ใส่ GEMINI_API_KEY ใน Kaggle Secrets
6. Run All → ปิด browser ได้เลย
"""

# ============================================================
# CELL 1 — ติดตั้ง (ถ้าจำเป็น)
# ============================================================
# import subprocess
# subprocess.run(["pip", "install", "-q", "requests"])

# ============================================================
# CELL 2 — Config (แก้ตรงนี้อย่างเดียว)
# ============================================================
import os
from kaggle_secrets import UserSecretsClient  # type: ignore

secrets = UserSecretsClient()
GEMINI_API_KEY = secrets.get_secret("GEMINI_API_KEY")

INPUT_FILE  = "/kaggle/input/rpg-dataset/rpg_raw.jsonl"   # path dataset ที่ upload ไว้
OUTPUT_FILE = "/kaggle/working/rpg_finetune_real.jsonl"
LIMIT       = 500    # จำนวน examples ที่ต้องการ
DELAY_SEC   = 1.2    # วินาทีรอระหว่าง requests (ป้องกัน rate limit)

# ============================================================
# CELL 3 — System Prompt และ helper data
# ============================================================
SYSTEM_PROMPT = """You are a creative Game Master (GM) running a text-based RPG. Respond ONLY with a valid JSON object. No markdown, no extra text.

RULES:
- ALL text in "narrative", "story_summary", "current_objective", "suggested_actions" MUST be written ENTIRELY in Thai (ภาษาไทย)
- narrative: 2-5 sentences, vivid, specific, no generic filler phrases
- Show don't tell: describe physical sensory facts, never state emotions directly
- Update player_status to exactly match what happens in the narrative
- suggested_actions: 3 items in Thai, each under 8 words

RESPOND WITH ONLY THIS JSON:
{
  "narrative": "String (Thai only)",
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
    {
        "hp": 10, "max_hp": 10, "mana": 5, "max_mana": 5, "gold": 5,
        "inventory": [], "status_effects": [], "level": 1, "exp": 0, "skills": [],
        "attributes": {"str": 10, "dex": 10, "int": 10, "con": 10, "wis": 10, "cha": 10}
    },
    {
        "hp": 22, "max_hp": 30, "mana": 15, "max_mana": 20, "gold": 85,
        "inventory": ["ดาบสั้น", "โล่ไม้", "ยาฟื้นฟู x2"], "status_effects": [], "level": 3, "exp": 60,
        "skills": ["โจมตีพื้นฐาน", "ป้องกัน"],
        "attributes": {"str": 14, "dex": 11, "int": 9, "con": 13, "wis": 10, "cha": 8}
    },
    {
        "hp": 8, "max_hp": 25, "mana": 0, "max_mana": 30, "gold": 200,
        "inventory": ["ไม้เท้าเวทย์", "หนังสือคาถา", "ยาแมนา x1"], "status_effects": ["เหนื่อยล้า"],
        "level": 5, "exp": 80, "skills": ["ลูกไฟ", "โล่เวทย์"],
        "attributes": {"str": 7, "dex": 10, "int": 16, "con": 9, "wis": 13, "cha": 12}
    },
    {
        "hp": 35, "max_hp": 40, "mana": 10, "max_mana": 10, "gold": 320,
        "inventory": ["ธนูยาว", "ลูกศร x20", "มีดล่าสัตว์"], "status_effects": [],
        "level": 6, "exp": 30, "skills": ["ยิงธนู", "ซ่อนตัว", "ติดตามรอย"],
        "attributes": {"str": 11, "dex": 16, "int": 12, "con": 12, "wis": 14, "cha": 9}
    },
    {
        "hp": 50, "max_hp": 50, "mana": 40, "max_mana": 40, "gold": 650,
        "inventory": ["ดาบยาว +1", "เกราะหนัง", "ยาฟื้นฟู x3", "คทาเวทย์"],
        "status_effects": [], "level": 8, "exp": 55,
        "skills": ["โจมตีคู่", "เวทย์ไฟ", "รักษา", "ป้องกันมนต์"],
        "attributes": {"str": 13, "dex": 13, "int": 14, "con": 12, "wis": 12, "cha": 11}
    },
]

SAMPLE_SUMMARIES = [
    "ผู้เล่นเริ่มต้นการผจญภัยในดินแดนแห่งใหม่",
    "ผู้เล่นกำลังสำรวจเมืองชายแดน Thornwall เต็มไปด้วยพ่อค้าและทหารรับจ้าง",
    "ผู้เล่นได้รับภารกิจกำจัดโจรที่รุกรานหมู่บ้าน กำลังเดินทางสู่ป่า Darkwood",
    "ผู้เล่นค้นพบลัทธิลึกลับซ่อนตัวอยู่ในเมือง กำลังสืบสวนเรื่องนี้อย่างลับๆ",
    "ผู้เล่นเอาชนะมังกรเฝ้าถ้ำได้ และกำลังค้นหาสมบัติที่ซ่อนอยู่ข้างใน",
    "ผู้เล่นอยู่ในตลาดกลางเมือง กำลังหาข้อมูลเกี่ยวกับสมบัติโบราณจากพ่อค้าแม่ค้า",
    "ผู้เล่นถูกจับเป็นนักโทษในปราสาทของเจ้าเมืองทุจริต กำลังหาทางหนี",
]

GENRES = [
    "High Fantasy with magic, monsters, and medieval kingdoms",
    "Dark Fantasy — grimdark world, morally ambiguous choices, harsh consequences",
    "Sword and Sorcery — personal adventure, ancient ruins, treasure hunting",
    "Political Fantasy — court intrigue, factions, betrayal, diplomacy",
]

# ============================================================
# CELL 4 — Core functions
# ============================================================
import json
import time
import random
import urllib.request
import urllib.error
from pathlib import Path

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"


def build_user_prompt(action: str, idx: int) -> str:
    state   = SAMPLE_STATES[idx % len(SAMPLE_STATES)]
    summary = SAMPLE_SUMMARIES[idx % len(SAMPLE_SUMMARIES)]
    genre   = GENRES[idx % len(GENRES)]
    return (
        f"[GENRE]: {genre}\n"
        f"[STORY SO FAR]\n{summary}\n\n"
        f"[CURRENT PLAYER STATUS]\n{json.dumps(state, ensure_ascii=False)}\n\n"
        f"[LIVES LEFT]\n3\n\n"
        f"[NEW PLAYER ACTION]\nPlayer: {action}"
    )


def parse_content(raw: str) -> dict:
    text = raw.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1] if len(parts) > 1 else text
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


def call_gemini(user_prompt: str, retries: int = 4) -> dict | None:
    payload = json.dumps({
        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": {"temperature": 0.85, "maxOutputTokens": 1024},
    }).encode()

    url = f"{GEMINI_URL}?key={GEMINI_API_KEY}"
    req = urllib.request.Request(
        url, data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read())
                raw  = data["candidates"][0]["content"]["parts"][0]["text"]
                return parse_content(raw)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = 30 * (attempt + 1)
                print(f"  Rate limit — รอ {wait}s...")
                time.sleep(wait)
            else:
                body = e.read().decode()[:200]
                print(f"  HTTP {e.code}: {body}")
                return None
        except (json.JSONDecodeError, KeyError) as e:
            print(f"  Parse error: {e}")
            if attempt < retries - 1:
                time.sleep(3)
        except Exception as e:
            print(f"  Error: {e}")
            time.sleep(5)
    return None


def extract_actions(path: str) -> list[str]:
    actions = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                row   = json.loads(line)
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


def already_done(path: str) -> int:
    if not Path(path).exists():
        return 0
    with open(path) as f:
        return sum(1 for line in f if line.strip())

# ============================================================
# CELL 5 — Generate (รัน cell นี้แล้วปิด browser ได้เลย)
# ============================================================
print(f"อ่าน actions จาก {INPUT_FILE}...")
all_actions = extract_actions(INPUT_FILE)
random.shuffle(all_actions)
print(f"พบ {len(all_actions)} actions")

done   = already_done(OUTPUT_FILE)
target = min(LIMIT, len(all_actions))

if done > 0:
    print(f"Resume: มี {done} rows แล้ว — เริ่มต่อจาก row {done + 1}")

actions = all_actions[done:target]
ok      = done
skip    = 0

with open(OUTPUT_FILE, "a") as fout:
    for i, action in enumerate(actions):
        idx         = done + i
        user_prompt = build_user_prompt(action, idx)

        print(f"[{idx + 1}/{target}] {action[:70]}...")
        gm = call_gemini(user_prompt)

        if gm is None:
            skip += 1
            print("  ข้าม (error)")
            continue

        record = {
            "messages": [
                {"role": "system",    "content": SYSTEM_PROMPT},
                {"role": "user",      "content": user_prompt},
                {"role": "assistant", "content": json.dumps(gm, ensure_ascii=False)},
            ]
        }
        fout.write(json.dumps(record, ensure_ascii=False) + "\n")
        fout.flush()
        ok += 1

        time.sleep(DELAY_SEC + random.uniform(0, 0.5))

print(f"\nเสร็จ! สร้างได้ {ok} examples, ข้าม {skip} rows")
print(f"Output: {OUTPUT_FILE}")

# ============================================================
# CELL 6 — Download output
# ============================================================
# from IPython.display import FileLink
# FileLink('/kaggle/working/rpg_finetune_real.jsonl')
