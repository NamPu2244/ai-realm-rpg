"""
Dataset generator for AI Realm RPG fine-tuning.

Uses Claude to generate high-quality GM responses in the exact JSON schema
the game expects, across diverse scenarios (genre, tone, player actions).
Output: JSONL file where each line is one training example.

Usage:
    export ANTHROPIC_API_KEY=sk-ant-...
    python generate_dataset.py --count 500 --output dataset.jsonl
"""

import json
import random
import argparse
import sys
import urllib.request
from pathlib import Path

# ── System prompt (mirrors route.ts buildSystemPrompt exactly) ──────────────

TONE_RULES = {
    "hardcore": """TONE - HARDCORE REALISM:
- The world reacts realistically and consequences can be severe. Reckless or foolish actions can lead to serious injury or death.
- Track resources (food, health, items, mana) strictly and let scarcity matter.
- Do not artificially protect the player from the consequences of the dice and their own choices.""",
    "balanced": """TONE - BALANCED ADVENTURE:
- The world is challenging but fair. Mistakes have real consequences, but character death should generally only result from major failures or sustained reckless behavior, not a single unlucky roll.
- Give the player reasonable opportunities to recover, retreat, or adapt before things become fatal.""",
    "story": """TONE - STORY-FOCUSED:
- Prioritize narrative pacing, character development, emotional stakes, and worldbuilding over punishing mechanics.
- Keep lethality low: setbacks usually cost resources, time, or complications rather than character death.
- Lean into dialogue, atmosphere, and dramatic moments.""",
    "sandbox": """TONE - CREATIVE SANDBOX:
- Be highly flexible and permissive. Embrace a "yes, and" attitude toward unusual, creative, or out-of-the-box player actions.
- Minimize hard restrictions and avoid punishing creativity. Prioritize fun, wonder, and player agency.
- Severe consequences and death should be rare, generally only when the player explicitly seeks out extreme risk.""",
}

def build_system_prompt(language: str, genre: str, character: str, tone: str) -> str:
    tone_rules = TONE_RULES.get(tone, TONE_RULES["balanced"])
    return f"""You are a creative, adaptive Game Master (GM) running a text-based RPG.

WORLD SETTING:
- Genre / Setting: {genre}
- Player Character: {character}
- Every location, character, technology, faction, and cultural detail you invent MUST stay strictly consistent with this genre/setting.

{tone_rules}

LANGUAGE:
- ALL "narrative" and "story_summary" text MUST be written in: {language}.
- DIALOGUE GENDER AGREEMENT: NPC dialogue particles/pronouns must match that NPC's established gender.

D20 SYSTEM:
- Whenever the player attempts a risky or uncertain action, state "[ทอยเต๋า D20: X] - " (X is 1-20) at the relevant point in the narrative.

CONTINUITY RULE:
- Each new "narrative" must contain ONLY what happens NEXT. Do NOT re-introduce the character, re-describe the current location from scratch, or restart the scene.

GAMEPLAY RULES:
- "player_status" MUST always be 100% consistent with "narrative".
- INJURY RULE: If the narrative describes the character getting hurt, DECREASE "hp" and ADD to "status_effects".
- RECOVERY RULE: If the narrative describes healing, increase "hp" and remove from "status_effects".
- ITEM RULE: If the player picks up, uses, or loses an item, update "inventory" to match exactly.
- QTE RULE: If an enemy or hazard launches a sudden, fast, potentially lethal attack requiring immediate reaction, set "is_qte_active" to true, "qte_time_limit" to 2-7 seconds, and provide 2-3 short "qte_options". Otherwise is_qte_active MUST be false, qte_time_limit 0, qte_options [].
- LIVES & RESPAWN RULE: If "hp" drops to 0 and "lives_left" > 0, decrease lives_left by 1, restore hp to max_hp, clear inventory.
- Award "exp" after successful encounters. When exp reaches 100, increment "level" by 1.

EXPECTED JSON SCHEMA (respond with ONLY this JSON object):
{{
  "narrative": "String (in {language})",
  "player_status": {{"hp": Number, "max_hp": Number, "mana": Number, "max_mana": Number, "inventory": ["String"], "status_effects": ["String"], "level": Number, "exp": Number, "skills": ["String"]}},
  "story_summary": "String",
  "current_objective": "String (in {language})",
  "scene_image_prompt": "String (English, or empty string)",
  "is_dead": false,
  "is_qte_active": Boolean,
  "qte_time_limit": Number,
  "qte_options": ["String"],
  "lives_left": Number
}}"""


# ── Scenario seeds ───────────────────────────────────────────────────────────

SCENARIOS = [
    # (genre, language, character_desc, tone, story_summary, player_status, player_action, should_have_qte)
    {
        "genre": "High fantasy with magic, monsters, and medieval kingdoms",
        "language": "ไทย",
        "character": "นักรบหญิงผู้มีพลังเวทมนตร์แห่งไฟ",
        "tone": "balanced",
        "story_summary": "ผู้เล่นกำลังสำรวจป่าไม้โบราณ ใกล้ถึงหมู่บ้านที่ถูกปีศาจยึดครอง",
        "player_status": {"hp": 18, "max_hp": 20, "mana": 8, "max_mana": 12, "inventory": ["ดาบสั้น", "ยาฟื้นฟู x2"], "status_effects": [], "level": 3, "exp": 45, "skills": ["ลูกไฟ", "ป้องกันไฟ"]},
        "player_action": "ฉันแอบเข้าไปในหมู่บ้านผ่านรั้วด้านหลัง",
        "lives_left": 3,
        "should_have_qte": False,
    },
    {
        "genre": "High fantasy with magic, monsters, and medieval kingdoms",
        "language": "ไทย",
        "character": "นักธนูเอลฟ์ผู้เชี่ยวชาญป่า",
        "tone": "hardcore",
        "story_summary": "ผู้เล่นกำลังต่อสู้กับมังกรในถ้ำ มังกรบาดเจ็บแต่ยังดุร้าย",
        "player_status": {"hp": 9, "max_hp": 14, "mana": 2, "max_mana": 10, "inventory": ["ธนู", "ลูกศร x5", "ยาพิษ"], "status_effects": ["บาดแผลที่ไหล่"], "level": 5, "exp": 80, "skills": ["ยิงสามลูก", "ตาเหยี่ยว"]},
        "player_action": "ฉันยิงลูกศรพิษเข้าที่ตาของมังกร",
        "lives_left": 1,
        "should_have_qte": True,
    },
    {
        "genre": "Cyberpunk dystopia with megacorporations, hackers, and neon-lit cities",
        "language": "ไทย",
        "character": "แฮกเกอร์ไซเบอร์พังก์ติดชิปประสาท",
        "tone": "balanced",
        "story_summary": "ผู้เล่นแทรกซึมเซิร์ฟเวอร์ของ NeoTech Corp เพื่อขโมยข้อมูล",
        "player_status": {"hp": 15, "max_hp": 15, "mana": 20, "max_mana": 20, "inventory": ["ปืนกล", "อุปกรณ์แฮก", "สมาร์ทคาร์ด"], "status_effects": [], "level": 4, "exp": 60, "skills": ["แฮกระยะไกล", "พรางตัว ICE"]},
        "player_action": "ฉันพยายามเจาะรหัสประตูห้องเซิร์ฟเวอร์หลัก",
        "lives_left": 3,
        "should_have_qte": False,
    },
    {
        "genre": "Post-apocalyptic wasteland with survivors, mutants, and scarce resources",
        "language": "ไทย",
        "character": "นักรอดชีวิตผู้เชี่ยวชาญด้านการแลกเปลี่ยน",
        "tone": "hardcore",
        "story_summary": "ผู้เล่นกำลังข้ามทะเลทรายเพื่อไปถึงป้อมปราการของกลุ่มผู้รอดชีวิต",
        "player_status": {"hp": 12, "max_hp": 16, "mana": 0, "max_mana": 0, "inventory": ["ปืนลูกซอง (กระสุน 3 นัด)", "อาหารกระป๋อง x1", "น้ำ 0.5L"], "status_effects": ["กระหายน้ำ"], "level": 2, "exp": 20, "skills": ["ต่อรองราคา", "ซ่อมแซมพื้นฐาน"]},
        "player_action": "ฉันตรวจสอบซากรถที่อยู่ข้างทางเพื่อหาเสบียง",
        "lives_left": 2,
        "should_have_qte": False,
    },
    {
        "genre": "Cosmic and psychological horror, full of dread and sanity-testing events",
        "language": "ไทย",
        "character": "นักสืบเอกชนผู้สืบสวนเหตุการณ์เหนือธรรมชาติ",
        "tone": "story",
        "story_summary": "ผู้เล่นกำลังสืบสวนคฤหาสน์ร้างที่ผู้คนหายสาบสูญ พบห้องใต้ดินลึกลับ",
        "player_status": {"hp": 13, "max_hp": 13, "mana": 5, "max_mana": 5, "inventory": ["ไฟฉาย", "ปืนพก", "สมุดบันทึก", "กล้องถ่ายรูป"], "status_effects": ["ความกลัว"], "level": 2, "exp": 35, "skills": ["สังเกตการณ์", "รู้ภาษาโบราณ"]},
        "player_action": "ฉันเปิดประตูห้องใต้ดินและก้าวลงไป",
        "lives_left": 3,
        "should_have_qte": False,
    },
    {
        "genre": "Wuxia world of martial arts sects, cultivation, and ancient-China-inspired settings",
        "language": "ไทย",
        "character": "นักดาบหญิงผู้ฝึกฝนวิทยายุทธ์ลมเหนือ",
        "tone": "balanced",
        "story_summary": "ผู้เล่นกำลังท้าดวลกับผู้นำสำนักงูพิษ ระหว่างการแข่งขันมวลรวม",
        "player_status": {"hp": 20, "max_hp": 25, "mana": 15, "max_mana": 20, "inventory": ["ดาบหยก"], "status_effects": ["พลังเสริม: ลมเหนือ"], "level": 6, "exp": 10, "skills": ["ดาบลมเหนือ", "ก้าวเก้าทิศ", "รวมพลังภายใน"]},
        "player_action": "ฉันใช้ท่าดาบลมเหนือโจมตีจุดอ่อนของเขา",
        "lives_left": 3,
        "should_have_qte": True,
    },
    {
        "genre": "Science fiction with advanced technology, space travel, and aliens",
        "language": "ไทย",
        "character": "กัปตันยานอวกาศขนาดเล็กรับจ้าง",
        "tone": "sandbox",
        "story_summary": "ยานของผู้เล่นจอดอยู่ที่สถานีอวกาศ Kepler-9 เพิ่งรับงานขนส่งลึกลับ",
        "player_status": {"hp": 14, "max_hp": 14, "mana": 0, "max_mana": 0, "inventory": ["ปืนพลาสม่า", "ชุดอวกาศ", "เครดิตชิป 500 UC"], "status_effects": [], "level": 3, "exp": 55, "skills": ["บังคับยาน", "ต่อรอง", "ยิงปืน"]},
        "player_action": "ฉันเปิดกล่องบรรทุกลึกลับเพื่อดูว่าอยู่ข้างใน",
        "lives_left": 3,
        "should_have_qte": False,
    },
    {
        "genre": "High fantasy with magic, monsters, and medieval kingdoms",
        "language": "ไทย",
        "character": "นักเวทย์ผู้ศึกษาเวทมนตร์มืด",
        "tone": "story",
        "story_summary": "ผู้เล่นอยู่ในห้องสมุดเวทมนตร์โบราณ ค้นหาคำสาปที่จะปลดปล่อยวิญญาณครู",
        "player_status": {"hp": 10, "max_hp": 10, "mana": 18, "max_mana": 20, "inventory": ["ไม้เท้าเวทมนตร์", "คัมภีร์ว่างเปล่า", "หมึกสีเลือด"], "status_effects": ["ถูกสาป: มองเห็นวิญญาณ"], "level": 4, "exp": 70, "skills": ["ระเบิดเวทย์", "อ่านใจ", "เรียกวิญญาณ"]},
        "player_action": "ฉันอ่านออกเสียงคาถาจากหน้าที่ค้นพบ",
        "lives_left": 3,
        "should_have_qte": False,
    },
]

# เพิ่ม scenario แบบ QTE ชัดเจน (โดน ambush กลางการสำรวจ)
QTE_SCENARIOS = [
    {
        "genre": "High fantasy with magic, monsters, and medieval kingdoms",
        "language": "ไทย",
        "character": "นักรบผู้เชี่ยวชาญโล่และดาบ",
        "tone": "hardcore",
        "story_summary": "ผู้เล่นกำลังเดินผ่านทางเดินในปราสาท ได้ยินเสียงก้าวเท้า",
        "player_status": {"hp": 22, "max_hp": 25, "mana": 5, "max_mana": 5, "inventory": ["ดาบยาว", "โล่เหล็ก", "ยาฟื้นฟู x1"], "status_effects": [], "level": 4, "exp": 30, "skills": ["ป้องกันสมบูรณ์", "โจมตีโต้กลับ"]},
        "player_action": "ฉันเดินต่อไปอย่างระมัดระวัง",
        "lives_left": 2,
        "should_have_qte": True,
    },
    {
        "genre": "Cyberpunk dystopia with megacorporations, hackers, and neon-lit cities",
        "language": "ไทย",
        "character": "นักต่อสู้ไซเบอร์ผู้ติดอาวุธดัดแปลง",
        "tone": "balanced",
        "story_summary": "ผู้เล่นกำลังหนีจากหน่วยรักษาความปลอดภัยของบริษัท ลงมาถึงชั้น B2",
        "player_status": {"hp": 17, "max_hp": 20, "mana": 8, "max_mana": 10, "inventory": ["มีดโมโน", "ระเบิดควัน x2"], "status_effects": ["ถูกยิงข่วน"], "level": 3, "exp": 40, "skills": ["ประหัตประหาร", "สัญชาตญาณหลบ"]},
        "player_action": "ฉันวิ่งผ่านประตูหมุน",
        "lives_left": 3,
        "should_have_qte": True,
    },
]


def build_user_prompt(scenario: dict) -> str:
    status_json = json.dumps(scenario["player_status"], ensure_ascii=False)
    return f"""[STORY SO FAR (Memory)]
{scenario['story_summary']}

[RECENT EVENTS (Last 10 turns)]
GM: คุณกำลังเดินทางในโลกของ{scenario['genre'][:20]}...

[CURRENT PLAYER STATUS]
{status_json}

[LIVES LEFT]
{scenario['lives_left']}

[NEW PLAYER ACTION]
Player: {scenario['player_action']}

[QTE REMINDER] After writing the narrative, ask yourself: did a sudden dangerous attack/hazard just strike the player with no time to think? If YES → is_qte_active: true, set qte_time_limit (2-7s), provide 2-3 short qte_options. If NO → is_qte_active: false, qte_time_limit: 0, qte_options: []."""


def call_ollama(system_prompt: str, user_prompt: str, model: str) -> str:
    """เรียก Ollama local API — ฟรี ไม่ต้องการ API key"""
    full_prompt = (
        f"<|im_start|>system\n{system_prompt}<|im_end|>\n"
        f"<|im_start|>user\n{user_prompt}<|im_end|>\n"
        f"<|im_start|>assistant\n"
    )
    payload = json.dumps({
        "model": model,
        "prompt": full_prompt,
        "format": "json",
        "stream": False,
        "options": {"temperature": 0.85, "num_ctx": 8192, "num_predict": 1500},
    }).encode()

    req = urllib.request.Request(
        "http://127.0.0.1:11434/api/generate",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read())["response"].strip()


def generate_example(scenario: dict, model: str) -> dict | None:
    system_prompt = build_system_prompt(
        scenario["language"],
        scenario["genre"],
        scenario["character"],
        scenario["tone"],
    )
    user_prompt = build_user_prompt(scenario)

    try:
        raw = call_ollama(system_prompt, user_prompt, model)

        parsed = json.loads(raw)
        required = ["narrative", "player_status", "story_summary", "current_objective",
                    "scene_image_prompt", "is_dead", "is_qte_active", "qte_time_limit",
                    "qte_options", "lives_left"]
        if not all(k in parsed for k in required):
            print("  [SKIP] Missing required fields", file=sys.stderr)
            return None

        if parsed["is_qte_active"] and len(parsed["qte_options"]) == 0:
            print("  [SKIP] QTE active but no options", file=sys.stderr)
            return None

        return {
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
                {"role": "assistant", "content": raw},
            ]
        }

    except (json.JSONDecodeError, OSError) as e:
        print(f"  [ERROR] {e}", file=sys.stderr)
        return None


def main():
    parser = argparse.ArgumentParser(description="Generate RPG GM fine-tuning dataset (ฟรี ใช้ Ollama local)")
    parser.add_argument("--count", type=int, default=300, help="จำนวน examples ที่ต้องการ")
    parser.add_argument("--output", type=str, default="dataset.jsonl", help="Output JSONL file")
    parser.add_argument("--model", type=str, default="qwen2.5:14b", help="Ollama model ที่ใช้ generate")
    args = parser.parse_args()

    output_path = Path(args.output)
    all_scenarios = SCENARIOS + QTE_SCENARIOS

    print(f"Generating {args.count} examples ด้วย {args.model} (Ollama local — ฟรี)")
    print(f"Output: {output_path}")
    print(f"ใช้เวลาประมาณ {args.count * 15 // 60} - {args.count * 30 // 60} นาที\n")

    generated = 0
    skipped = 0

    with open(output_path, "w", encoding="utf-8") as f:
        while generated < args.count:
            scenario = random.choice(all_scenarios)
            scenario = dict(scenario)
            scenario["player_status"] = dict(scenario["player_status"])
            hp_variance = random.randint(-5, 3)
            scenario["player_status"]["hp"] = max(1, min(
                scenario["player_status"]["max_hp"],
                scenario["player_status"]["hp"] + hp_variance
            ))

            print(f"[{generated+1}/{args.count}] {scenario['player_action'][:55]}...")
            example = generate_example(scenario, args.model)
            if example:
                f.write(json.dumps(example, ensure_ascii=False) + "\n")
                f.flush()
                generated += 1
            else:
                skipped += 1

    print(f"\nเสร็จ: {generated} examples → {output_path}  (skipped: {skipped})")


if __name__ == "__main__":
    main()
