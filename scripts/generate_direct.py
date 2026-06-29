"""
Generate high-quality GM training examples directly (no API needed).
Output: rpg_finetune_real.jsonl
"""
import json
from pathlib import Path

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

def base_status(level=1, hp=10, max_hp=10, mana=5, max_mana=5, gold=5,
                inventory=None, status_effects=None, skills=None,
                str_=10, dex=10, int_=10, con=10, wis=10, cha=10, exp=0):
    return {
        "hp": hp, "max_hp": max_hp, "mana": mana, "max_mana": max_mana,
        "gold": gold, "inventory": inventory or [], "status_effects": status_effects or [],
        "level": level, "exp": exp, "skills": skills or [],
        "attributes": {"str": str_, "dex": dex, "int": int_, "con": con, "wis": wis, "cha": cha}
    }

def rec(story, action, narrative, status, summary, objective, image_prompt,
        suggested, time_of_day="ค่ำ", date="วันที่ 1 แห่งเดือนแรก",
        is_dead=False, lives=3, dialogue=None):
    user = (
        f"[STORY SO FAR]\n{story}\n\n"
        f"[CURRENT PLAYER STATUS]\n{json.dumps(status, ensure_ascii=False)}\n\n"
        f"[LIVES LEFT]\n{lives}\n\n"
        f"[NEW PLAYER ACTION]\nPlayer: {action}"
    )
    assistant = {
        "narrative": narrative,
        "player_status": status,
        "story_summary": summary,
        "current_objective": objective,
        "scene_image_prompt": image_prompt,
        "is_dead": is_dead,
        "is_qte_active": False,
        "qte_time_limit": 0,
        "qte_options": [],
        "lives_left": lives,
        "time_of_day": time_of_day,
        "in_world_date": date,
        "dialogue_lines": dialogue or [],
        "character_updates": [],
        "faction_updates": [],
        "quest_updates": [],
        "companion_updates": [],
        "new_locations": [],
        "open_threads": [],
        "countdown_event": None,
        "suggested_actions": suggested
    }
    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user},
            {"role": "assistant", "content": json.dumps(assistant, ensure_ascii=False)}
        ]
    }

EXAMPLES = [
    # ── COMBAT ──────────────────────────────────────────────────────────────
    rec(
        story="ผู้เล่นกำลังเดินทางผ่านป่า Darkwood เพื่อไปยังหมู่บ้าน Millhaven",
        action="โจมตีหมาป่าด้วยดาบสั้น",
        narrative="คุณฟาดดาบสั้นพุ่งเข้าหาหมาป่า ใบมีดกรีดไหล่ซ้ายของมันจนเลือดไหลนองขน หมาป่าหอนลั่นและหันหนีเข้าไปในพุ่มไม้ทึบ กิ่งไม้สั่นไหวจางลงจนเงียบสนิท ฝ่ามือของคุณยังสั่นอยู่เล็กน้อย",
        status=base_status(level=1, hp=8, max_hp=10, mana=5, max_mana=5, gold=5,
                           inventory=["ดาบสั้น"], exp=15),
        summary="ผู้เล่นเดินทางผ่านป่า Darkwood และเพิ่งขับไล่หมาป่าออกไปได้",
        objective="เดินทางไปยังหมู่บ้าน Millhaven",
        image_prompt="dark forest night, wolf retreating, adventurer with short sword, blood on blade",
        suggested=["วิ่งต่อไปอย่างรวดเร็ว", "ตรวจสอบบาดแผลที่โดน", "ค้นหาสิ่งของรอบๆ"],
        time_of_day="ค่ำ"
    ),
    rec(
        story="ผู้เล่นต่อสู้กับโจรในซอยแคบกลางเมือง Thornwall",
        action="ใช้คาถาลูกไฟใส่โจรสองคน",
        narrative="คุณยกมือทั้งสองขึ้น เปลวไฟสีส้มพุ่งออกจากฝ่ามือดังเสียงฟ่อ โจรคนแรกกรีดร้องเมื่อเสื้อคลุมลุกเป็นไฟ คนที่สองหมอบลงหลังกำแพงอิฐด้วยหน้าไหม้เกรียม ซอยหอมกลิ่นไหม้และควันตลบขึ้นสู่ท้องฟ้ายามค่ำ",
        status=base_status(level=4, hp=18, max_hp=22, mana=3, max_mana=15, gold=120,
                           inventory=["ไม้เท้าเวทย์", "หนังสือคาถา"],
                           skills=["ลูกไฟ", "โล่เวทย์"], exp=40,
                           int_=15, wis=12),
        summary="ผู้เล่นสังหารโจรในซอยแคบของ Thornwall ด้วยคาถาลูกไฟ",
        objective="สืบสวนว่าใครส่งโจรมาตามล่า",
        image_prompt="narrow alley night, fireball spell, two bandits burning, smoke rising, medieval city",
        suggested=["ค้นตัวโจรที่ล้มลง", "หลบหนีก่อนมีคนมาเห็น", "ปะทะโจรที่เหลือ"],
        time_of_day="ดึก"
    ),
    rec(
        story="ผู้เล่นบุกเข้าไปในห้องใต้ดินของปราสาทร้าง",
        action="ใช้ทักษะ Sneak Attack จู่โจมทหารโครงกระดูก",
        narrative="คุณย่องออกจากเงามืดหลังเสาหิน มีดสั้นแทงทะลุกระดูกสันหลังของโครงกระดูกจนได้ยินเสียงแตกกรอบ โครงกระดูกล้มลงกองบนพื้นหิน กระดูกกระจายเต็มพื้น ดวงตาที่เรืองแสงสีเขียวดับมอดลงทีละดวง",
        status=base_status(level=5, hp=28, max_hp=30, mana=0, max_mana=0, gold=200,
                           inventory=["มีดสั้น x2", "เชือก", "คบเพลิง x3"],
                           skills=["Sneak Attack", "ซ่อนตัว", "ล็อคประตู"], exp=65,
                           dex=16, str_=12),
        summary="ผู้เล่นกำลังล้วงความลับในห้องใต้ดินปราสาทร้าง",
        objective="ค้นหากุญแจห้องนิรภัยในชั้น B2",
        image_prompt="dark dungeon, skeleton warrior shattered, rogue with daggers, green glowing eyes fading, stone floor",
        suggested=["ค้นห้องนี้ให้ละเอียด", "ระวังเสียงก้าวเท้าข้างหน้า", "ย้อนกลับไปบันทึกแผนที่"],
        time_of_day="ดึก"
    ),
    rec(
        story="ผู้เล่นกำลังเผชิญมังกรน้ำแข็งในยอดเขาสูง",
        action="ล่าถอยและโยนขวดน้ำมันลงพื้นแล้วจุดไฟ",
        narrative="คุณกลิ้งหลบเล็บมังกรแล้วซัดขวดน้ำมันลงบนหิมะ เปลวไฟสีส้มพวยพุ่งขึ้นสูงสามเมตรขวางกั้นระหว่างคุณกับมัน มังกรถอยหน้าสองก้าวเมื่อเปลวไฟแผดกระทบลำตัว แววตาสีน้ำเงินเย็นชาของมันจ้องคุณอยู่เหนือม่านเพลิง",
        status=base_status(level=7, hp=15, max_hp=45, mana=8, max_mana=20, gold=450,
                           inventory=["ดาบยาว", "ขวดน้ำมัน x1", "เกราะหนัง"],
                           status_effects=["บาดแผลจากเล็บ"], skills=["โจมตีคู่", "ล่าถอยกลยุทธ์"],
                           exp=80, str_=14, dex=13, con=12),
        summary="ผู้เล่นกำลังสู้กับมังกรน้ำแข็งบนยอดเขา Frostpeak และพึ่งสร้างกำแพงไฟชั่วคราว",
        objective="เอาชนะหรือหลบหนีมังกรน้ำแข็ง",
        image_prompt="mountain peak snow, ice dragon, wall of fire, injured warrior, dramatic standoff",
        suggested=["โจมตีในขณะที่มันหยุด", "หนีลงเขาตอนนี้เลย", "ใช้ไอเทมรักษาบาดแผล"],
        time_of_day="บ่าย"
    ),
    rec(
        story="ผู้เล่นเพิ่งเริ่มต้นการผจญภัย ยืนอยู่หน้าเมืองชายแดน",
        action="โจมตีหนูยักษ์ในท่อระบายน้ำด้วยกระบอง",
        narrative="กระบองไม้ของคุณฟาดลงบนหลังหนูยักษ์ดังเสียงแก้ก ร่างของมันสั่นและดิ้นทุรนทุราย ก่อนหยุดนิ่งในน้ำขุ่นๆ กลิ่นสาบหอมกัดจมูกคุณในท่อแคบๆ คุณรู้สึกถึงความภาคภูมิใจเล็กๆ จากชัยชนะครั้งแรก",
        status=base_status(level=1, hp=9, max_hp=10, mana=5, max_mana=5, gold=5,
                           inventory=["กระบองไม้"], exp=10),
        summary="ผู้เล่นเริ่มภารกิจแรกด้วยการกำจัดหนูยักษ์ในท่อระบายน้ำใต้เมือง",
        objective="กำจัดหนูยักษ์ในท่อระบายน้ำให้ครบ 5 ตัว",
        image_prompt="sewer tunnel, giant rat dead, beginner adventurer with club, murky water, dim torch light",
        suggested=["เดินหน้าต่อในท่อ", "เก็บซากหนูไว้เป็นหลักฐาน", "ออกไปรายงานกับ NPC"],
        time_of_day="สาย"
    ),

    # ── EXPLORATION ─────────────────────────────────────────────────────────
    rec(
        story="ผู้เล่นกำลังสำรวจวิหารร้างในป่าลึก",
        action="ตรวจสอบแท่นบูชาที่มีของวางอยู่",
        narrative="นิ้วมือของคุณปัดฝุ่นออกจากแท่นหินโบราณ เผยให้เห็นตัวอักษรที่สลักไว้ลึกถึงนิ้วหนึ่ง บนแท่นมีถ้วยทองเก่าและหัวกะโหลกสัตว์เล็กเรียงกันเป็นวงกลม แสงแดดที่ลอดหลังคาพังทลายส่องลงมาพอดีบนสัญลักษณ์ตรงกลาง คุณรู้สึกขนลุกที่ต้นแขน",
        status=base_status(level=3, hp=22, max_hp=25, mana=10, max_mana=10, gold=80,
                           inventory=["ดาบสั้น", "คบเพลิง", "สมุดบันทึก"], exp=35,
                           int_=13, wis=11),
        summary="ผู้เล่นกำลังสำรวจวิหารร้างและพบแท่นบูชาลึกลับ",
        objective="ค้นพบว่าวิหารนี้ถูกใช้เพื่อวัตถุประสงค์ใด",
        image_prompt="ancient ruin temple interior, stone altar with skull offerings, golden cup, sunbeam through broken roof",
        suggested=["คัดลอกตัวอักษรบนแท่น", "หยิบถ้วยทองขึ้นมา", "ค้นหาทางออกด้านหลังวิหาร"],
        time_of_day="บ่าย"
    ),
    rec(
        story="ผู้เล่นสำรวจถ้ำลึกตามคำบอกเล่าของนักขุดแร่",
        action="ใช้คบเพลิงส่องดูโพรงทางซ้ายมือ",
        narrative="แสงไฟส่องเผยผนังถ้ำที่ระยิบระยับไปด้วยแร่คริสตัลสีน้ำเงิน ตลอดเพดานและผนังยาวสิบกว่าเมตร มีแอ่งน้ำใสขนาดเล็กอยู่ตรงกลาง และรอยเท้าขนาดใหญ่ในโคลนเปียกชี้ไปในโพรงถัดไป",
        status=base_status(level=2, hp=14, max_hp=15, mana=8, max_mana=8, gold=30,
                           inventory=["คบเพลิง x2", "กระเป๋าเป้", "มีดล่าสัตว์"], exp=20,
                           wis=12, int_=11),
        summary="ผู้เล่นพบโพรงคริสตัลในถ้ำและเห็นรอยเท้าลึกลับ",
        objective="สำรวจถ้ำและค้นหาแหล่งแร่ที่นักขุดหายตัวไป",
        image_prompt="crystal cave blue gemstones, torch light reflecting, small pool, giant footprints in mud",
        suggested=["เก็บแร่คริสตัลใส่ถุง", "ติดตามรอยเท้าต่อไป", "ทำเครื่องหมายทางกลับ"],
        time_of_day="ไม่มีแสงตามธรรมชาติ"
    ),
    rec(
        story="ผู้เล่นมาถึงซากเมืองโบราณที่ถูกทิ้งร้างมาสองร้อยปี",
        action="ค้นหาในบ้านหลังใหญ่ที่ยังมีหลังคาสมบูรณ์",
        narrative="บานประตูร้องเอี๊ยดดังเมื่อคุณผลักเข้าไป ชั้นวางหนังสือทรุดตัวแต่ยังตั้งอยู่ได้ บนโต๊ะมีจดหมายที่หมึกซีดจางแทบอ่านไม่ออกและเหรียญทองสองสามเหรียญที่สนิมกินไปครึ่ง ในลิ้นชักด้านล่างมีพับแผนที่เก่าของเมืองที่ยังสภาพดีอยู่",
        status=base_status(level=4, hp=30, max_hp=30, mana=5, max_mana=5, gold=95,
                           inventory=["ดาบสั้น", "ไฟแช็ก", "ถุงผ้า"], exp=50,
                           int_=12, wis=13, dex=11),
        summary="ผู้เล่นกำลังค้นหาข้อมูลในซากเมืองโบราณและพบแผนที่เก่า",
        objective="ค้นหาเบาะแสว่าเกิดอะไรขึ้นกับเมืองโบราณแห่งนี้",
        image_prompt="abandoned ancient house interior, dusty bookshelves, old map on table, faded letters, golden coins",
        suggested=["อ่านจดหมายบนโต๊ะ", "เก็บแผนที่ใส่กระเป๋า", "ค้นชั้นบนของบ้าน"],
        time_of_day="เช้าตรู่"
    ),
    rec(
        story="ผู้เล่นเพิ่งรอดจากพายุทะเลและขึ้นฝั่งบนเกาะที่ไม่รู้จัก",
        action="ปีนเนินเขาเพื่อมองดูภาพรวมของเกาะ",
        narrative="เมื่อถึงยอดเนิน ทัศนียภาพทั้งหมดของเกาะปรากฎให้เห็น ป่าทึบปกคลุมพื้นที่ส่วนใหญ่ มีแสงไฟจางๆ สว่างอยู่ทางทิศตะวันออก และหอคอยหินโบราณยื่นพ้นยอดไม้ขึ้นมาทางเหนือ ลมทะเลพัดแรงจนคุณต้องเกาะกิ่งไม้เพื่อทรงตัว",
        status=base_status(level=3, hp=12, max_hp=20, mana=6, max_mana=6, gold=0,
                           inventory=["มีดเดินป่า", "เชือก", "ไฟแช็ก"], status_effects=["เปียกชื้น", "หิวโหย"],
                           exp=30, str_=11, dex=12, wis=13),
        summary="ผู้เล่นรอดจากเรืออับปางและขึ้นฝั่งบนเกาะลึกลับ เห็นแสงไฟและหอคอยโบราณ",
        objective="หาแหล่งอาหารและที่พักพิงก่อนค่ำ",
        image_prompt="tropical island hilltop view, dense jungle, distant fire light, ancient stone tower, stormy sea",
        suggested=["มุ่งหน้าสู่แสงไฟทางตะวันออก", "ไปสำรวจหอคอยทางเหนือ", "หาน้ำดื่มและอาหารในป่าก่อน"],
        time_of_day="บ่าย"
    ),
    rec(
        story="ผู้เล่นสืบสวนการหายตัวของชาวบ้านในหมู่บ้านเล็กๆ",
        action="ตรวจสอบกระท่อมสุดท้ายที่เห็นผู้หายตัว",
        narrative="ประตูกระท่อมเปิดค้างอยู่ ภายในถ้วยชากับขนมปังยังวางอยู่บนโต๊ะ ควันจากเตาไฟเพิ่งดับ ร่องรอยการลากบนพื้นดินดิบชี้ออกไปทางหน้าต่างหลัง และกลิ่นกำมะถันจางๆ ยังคงลอยอยู่ในอากาศ",
        status=base_status(level=5, hp=35, max_hp=38, mana=12, max_mana=15, gold=180,
                           inventory=["ดาบยาว", "โล่โลหะ", "คบเพลิง"], exp=70,
                           int_=13, wis=14, str_=13),
        summary="ผู้เล่นกำลังสืบสวนการหายตัวปริศนาของชาวบ้าน พบร่องรอยถูกลากออกทางหน้าต่าง",
        objective="ค้นหาผู้หายตัวก่อนที่คืนนี้จะผ่านไป",
        image_prompt="dark cottage interior, abandoned meal on table, drag marks on floor, sulfur smell, candle just extinguished",
        suggested=["ติดตามรอยลากออกนอกกระท่อม", "ซักถามเพื่อนบ้านอีกครั้ง", "ตรวจสอบกลิ่นกำมะถัน"],
        time_of_day="เย็น"
    ),

    # ── SOCIAL / DIALOGUE ────────────────────────────────────────────────────
    rec(
        story="ผู้เล่นเดินทางมาถึงเมือง Thornwall และต้องการข้อมูลเกี่ยวกับมังกร",
        action="เข้าไปในผับและถามเรื่องมังกรกับบาร์เทนเดอร์",
        narrative="บาร์เทนเดอร์อ้วนป้อมเช็ดแก้วแล้วมองคุณด้วยสายตาสงสัย ก่อนจะโน้มตัวมากระซิบว่ามังกรนั้นอยู่ที่ถ้ำหินขาวทางเหนือ แต่นักล่าคนสุดท้ายที่ไปไม่เคยกลับมา เขาปัดปากก่อนจะหันไปรับออเดอร์ลูกค้าคนอื่น ทิ้งคุณไว้กับข้อมูลและความกังวล",
        status=base_status(level=3, hp=25, max_hp=25, mana=8, max_mana=8, gold=60,
                           inventory=["ดาบสั้น", "เกราะหนัง"], exp=40, cha=13, wis=11),
        summary="ผู้เล่นได้ข้อมูลจากบาร์เทนเดอร์ว่ามังกรอยู่ที่ถ้ำหินขาวทางเหนือ",
        objective="ค้นหาถ้ำหินขาวทางเหนือของเมือง",
        image_prompt="medieval tavern interior, bartender whispering, warm candlelight, adventurer at bar counter",
        suggested=["ถามต่อว่านักล่าคนนั้นชื่ออะไร", "ซื้อเครื่องดื่มและฟังการสนทนาอื่น", "ออกไปหาข้อมูลเพิ่มเติม"],
        time_of_day="ค่ำ",
        dialogue=[{"speaker": "บาร์เทนเดอร์", "text": "ถ้ำหินขาวทางเหนือ แต่ระวังตัวด้วย... คนสุดท้ายที่ไปไม่กลับมาแล้ว"}]
    ),
    rec(
        story="ผู้เล่นต้องเจรจากับหัวหน้าโจรเพื่อปล่อยตัวประกัน",
        action="เสนอให้โจรยกเว้นค่าไถ่แลกกับการทำภารกิจให้",
        narrative="หัวหน้าโจรพิงกำแพงถ้ำด้วยแขนไขว้ แววตาคมคายพิจารณาใบหน้าของคุณอยู่ครู่ใหญ่ ก่อนจะยิ้มมุมปากข้างเดียว เขาบอกว่ามีงานที่เขาส่งคนทำไม่ได้ และถ้าคุณทำสำเร็จ ตัวประกันและอิสรภาพของคุณเป็นสิ่งที่ได้รับ",
        status=base_status(level=4, hp=22, max_hp=25, mana=5, max_mana=5, gold=15,
                           inventory=["ดาบสั้น", "โล่ไม้"], exp=55, cha=14, str_=12),
        summary="ผู้เล่นเจรจากับหัวหน้าโจร Draven ตกลงจะทำภารกิจลึกลับแลกกับการปล่อยตัวประกัน",
        objective="ฟังรายละเอียดภารกิจที่หัวหน้าโจรต้องการ",
        image_prompt="cave hideout interior, bandit leader arms crossed, torchlight, negotiation scene",
        suggested=["ถามรายละเอียดภารกิจให้ชัดก่อน", "ต่อรองเงื่อนไขเพิ่มเติม", "ปฏิเสธและหาทางหนีอื่น"],
        time_of_day="ค่ำ",
        dialogue=[{"speaker": "Draven", "text": "มีงานที่ลูกน้องฉันทำไม่ได้... แต่คนอย่างแกอาจทำได้"}]
    ),
    rec(
        story="ผู้เล่นอยู่ในราชสำนักและต้องการโน้มน้าวให้กษัตริย์ส่งกองทหารช่วย",
        action="โต้แย้งข้าราชบริพารที่คัดค้านด้วยหลักฐานที่มี",
        narrative="คุณกางแผนที่ออกบนโต๊ะประชุม นิ้วชี้ลงที่รอยกากบาทสีแดงที่คุณวาดไว้เอง ขุนนางอ้วนที่นั่งข้างขวาสั่นหัวน้อยลง เมื่อคุณอธิบายว่ากองกำลังปีศาจกำลังเคลื่อนผ่านเส้นทางการค้าสายหลัก กษัตริย์เริ่มเอนตัวไปข้างหน้าด้วยความสนใจ",
        status=base_status(level=8, hp=50, max_hp=55, mana=20, max_mana=20, gold=800,
                           inventory=["ดาบยาว +1", "เกราะแผ่น", "แผนที่ยุทธศาสตร์"],
                           skills=["การทูต", "ยุทธศาสตร์", "โจมตีคู่"], exp=90,
                           cha=16, int_=14, wis=13),
        summary="ผู้เล่นกำลังโน้มน้าวกษัตริย์ให้ส่งกองทหารเพื่อหยุดการรุกรานของปีศาจ และกษัตริย์เริ่มสนใจ",
        objective="ได้รับคำมั่นสัญญาจากกษัตริย์ว่าจะส่งกองทหาร",
        image_prompt="royal throne room, map on table, knight presenting evidence, king leaning forward interested, court nobles",
        suggested=["อธิบายแผนการป้องกันโดยละเอียด", "ขอเวลาประชุมส่วนตัวกับกษัตริย์", "เสนอให้ขุนนางคนอื่นยืนยัน"],
        time_of_day="สาย"
    ),
    rec(
        story="ผู้เล่นพบพ่อมดชราผู้โดดเดี่ยวอาศัยอยู่ในป่า",
        action="ขอให้พ่อมดสอนคาถาใหม่",
        narrative="พ่อมดชราส่ายหัวและพูดว่าความรู้ไม่ใช่สิ่งที่ให้ได้โดยเปล่า ผมสีขาวของเขาปลิวไหวในลมยามเช้า เขาชี้ไปที่สวนหลังบ้านและบอกว่าถ้าคุณเก็บดอก Moonbloom ได้สิบดอกก่อนตะวันตกดิน เขาจะสอนคาถาหนึ่งอย่างให้",
        status=base_status(level=3, hp=18, max_hp=20, mana=10, max_mana=15, gold=40,
                           inventory=["ไม้เท้า", "ถุงผ้า"], skills=["ลูกไฟ"],
                           exp=38, int_=14, wis=12),
        summary="ผู้เล่นตกลงกับพ่อมด Aldric ว่าจะเก็บดอก Moonbloom 10 ดอกแลกกับคาถาใหม่",
        objective="เก็บดอก Moonbloom 10 ดอกในป่าก่อนพระอาทิตย์ตก",
        image_prompt="forest cottage, elderly wizard white hair, moonbloom flowers garden, morning mist",
        suggested=["ออกหาดอก Moonbloom ในป่า", "ถามว่าดอกไม้หน้าตาเป็นอย่างไร", "ต่อรองเงื่อนไขอื่น"],
        time_of_day="เช้าตรู่",
        dialogue=[{"speaker": "Aldric", "text": "สิบดอก Moonbloom ก่อนพระอาทิตย์ตก แล้วข้าจะสอนคาถาหนึ่งอย่างให้เจ้า"}]
    ),

    # ── INVENTORY / MERCHANT ─────────────────────────────────────────────────
    rec(
        story="ผู้เล่นมาถึงร้านค้าอาวุธในเมือง Thornwall",
        action="ขายของที่ปล้นมาจากโจรและซื้อดาบใหม่",
        narrative="ช่างตีเหล็กชราพลิกดูมีดสั้นของโจรและพยักหน้า ราคาสิบสองทอง ไม่ต่อ เขาวางดาบสั้นเหล็กขาวบนเคาน์เตอร์ คมดีกว่าของเก่าคุณสามเท่า เมื่อคุณทดลองถือ น้ำหนักสมดุลดีในมือ คุณเสียเงินออกไปสี่สิบห้าทอง แต่ได้อาวุธที่คุ้มค่ากลับมา",
        status=base_status(level=2, hp=15, max_hp=15, mana=5, max_mana=5, gold=53,
                           inventory=["ดาบสั้นเหล็กขาว", "เกราะหนัง", "ยาฟื้นฟู x1"],
                           exp=22, str_=12, dex=11),
        summary="ผู้เล่นซื้อดาบสั้นเหล็กขาวจากช่างตีเหล็กใน Thornwall ด้วยเงินจากการปล้นโจร",
        objective="เตรียมตัวให้พร้อมก่อนออกเดินทางไปป่า Darkwood",
        image_prompt="blacksmith shop, iron sword on counter, adventurer buying weapon, medieval market",
        suggested=["ซื้อยาฟื้นฟูเพิ่ม", "ถามช่างเรื่องอาวุธพิเศษ", "ออกเดินทางสู่ป่า Darkwood"],
        time_of_day="สาย"
    ),
    rec(
        story="ผู้เล่นกำลังหาทางรักษาพิษจากงูยักษ์",
        action="ซื้อยาแก้พิษจากร้านขายยาสมุนไพร",
        narrative="หญิงชราเจ้าของร้านหยิบขวดแก้วสีเขียวขุ่นออกมาจากหิ้ง ยาแก้พิษจากรากบัวทองราคาสามสิบทอง หรือจะเอาแบบธรรมดาสิบห้าทองก็ได้แต่ประสิทธิภาพต่างกัน เธอพูดพร้อมยื่นทั้งสองขวดให้คุณดู แสงเทียนสะท้อนผ่านของเหลวสีต่างกัน",
        status=base_status(level=3, hp=10, max_hp=22, mana=8, max_mana=8, gold=65,
                           inventory=["ดาบสั้น"], status_effects=["พิษงู (เบา)"],
                           exp=35, con=11, wis=10),
        summary="ผู้เล่นโดนพิษงูยักษ์และกำลังเลือกซื้อยาแก้พิษจากร้านสมุนไพร",
        objective="รักษาพิษงูก่อนที่อาการจะแย่ลง",
        image_prompt="herbalist shop, two antidote vials green and clear, candlelight, old woman shopkeeper",
        suggested=["ซื้อยาแก้พิษรากบัวทอง 30 ทอง", "ซื้อยาธรรมดา 15 ทอง", "ต่อรองราคาหรือขอแลกด้วยของ"],
        time_of_day="บ่าย"
    ),
    rec(
        story="ผู้เล่นพบหีบสมบัติในห้องลับของปราสาท",
        action="เปิดหีบสมบัติที่ล็อคไว้",
        narrative="กุญแจสีทองที่คุณเพิ่งหามาพอดีกับรูกุญแจอย่างสมบูรณ์แบบ หีบเปิดออกพร้อมเสียงกลไกโบราณดังกริ๊ก ภายในมีเหรียญทองกองสูง ผ้าคลุมสีน้ำเงินเข้มที่ส่องแสงจางๆ และจดหมายผนึกตราตระกูลที่คุณไม่รู้จัก",
        status=base_status(level=5, hp=32, max_hp=35, mana=0, max_mana=0, gold=420,
                           inventory=["ดาบสั้น x2", "เชือก", "ผ้าคลุมเวทมนตร์", "จดหมายผนึก"],
                           exp=75, dex=16, str_=12),
        summary="ผู้เล่นเปิดหีบสมบัติและพบผ้าคลุมเวทมนตร์กับจดหมายลึกลับ",
        objective="ค้นพบความลับที่ซ่อนอยู่ในปราสาทนี้",
        image_prompt="castle secret room, treasure chest open, gold coins, glowing blue cloak, sealed letter with crest",
        suggested=["อ่านจดหมายผนึกทันที", "สวมผ้าคลุมสีน้ำเงินทดสอบ", "เก็บทุกอย่างและออกไปก่อน"],
        time_of_day="ดึก"
    ),

    # ── REST / CAMP ──────────────────────────────────────────────────────────
    rec(
        story="ผู้เล่นเดินทางมาทั้งวันและบาดแผลเริ่มอักเสบ",
        action="ตั้งแคมป์ในป่าและพักผ่อน",
        narrative="คุณวางฟืนลงและจุดไฟขึ้น เปลวไฟสีส้มให้ความอบอุ่นในคืนที่ลมพัด คุณล้างแผลด้วยน้ำสะอาดจากลำธารและพันผ้าไว้ก่อนนอนหลับใต้ต้นไม้ใหญ่ รุ่งเช้าแผลหายดีขึ้น ร่างกายพักผ่อนเต็มที่",
        status=base_status(level=2, hp=15, max_hp=15, mana=8, max_mana=8, gold=35,
                           inventory=["ดาบสั้น", "ผ้าพันแผล", "ถุงนอน"], exp=25,
                           con=11),
        summary="ผู้เล่นพักฟื้นในป่าระหว่างทางไปยังเมือง Ashford",
        objective="เดินทางต่อไปยังเมือง Ashford",
        image_prompt="forest campfire night, adventurer sleeping, tent, stars visible through trees",
        suggested=["เดินทางต่อในยามเช้า", "ล่าสัตว์หาอาหารก่อนออกเดินทาง", "สำรวจรอบแคมป์ก่อน"],
        time_of_day="เช้าตรู่"
    ),
    rec(
        story="ผู้เล่นเข้าพักที่โรงแรมในเมืองหลังสู้รบหนักทั้งวัน",
        action="จ่ายเงินพักห้องพักดีและสั่งอาหาร",
        narrative="เจ้าของโรงแรมรับเหรียญทองแปดเหรียญและส่งกุญแจห้องให้ อาหารค่ำมาพร้อมกับเนื้อสตูร้อนๆ และขนมปังสดอีกก้อน คุณนอนบนเตียงนุ่มเป็นครั้งแรกในรอบสัปดาห์ ร่างกายที่ล้าแสนล้าของคุณฟื้นฟูเต็มที่ตลอดคืน",
        status=base_status(level=4, hp=30, max_hp=30, mana=15, max_mana=15, gold=72,
                           inventory=["ดาบสั้น", "เกราะหนัง", "ยาฟื้นฟู x2"],
                           exp=58, con=12),
        summary="ผู้เล่นพักฟื้นในโรงแรมหลังการต่อสู้และฟื้นฟู HP/Mana เต็ม",
        objective="วางแผนภารกิจต่อไปตอนเช้า",
        image_prompt="cozy inn room, warm meal on table, soft bed, lantern light, medieval inn",
        suggested=["ลงไปฟังข่าวสารในบาร์ข้างล่าง", "นอนหลับพักผ่อนเต็มที่", "ศึกษาแผนที่ก่อนนอน"],
        time_of_day="ค่ำ"
    ),

    # ── QUEST / STORY MOMENTS ────────────────────────────────────────────────
    rec(
        story="ผู้เล่นได้รับใบมอบภารกิจจากนายกเทศมนตรี",
        action="รับภารกิจกำจัดโจรที่ตั้งฐานในป่าทางเหนือ",
        narrative="นายกเทศมนตรีตีตราประทับลงบนเอกสารและยื่นให้คุณ ท่าทางหน้าตาเครียดผ่อนคลายลงเล็กน้อย เขาบอกว่าโจรกลุ่มนี้ปล้นกองคาราวานมาสามเดือนแล้ว และผู้ที่นำหัวหน้าโจรกลับมาได้รับรางวัลสองร้อยทอง ตราประทับบนเอกสารส่องแสงในแดดบ่าย",
        status=base_status(level=3, hp=25, max_hp=25, mana=10, max_mana=10, gold=55,
                           inventory=["ดาบสั้น", "โล่ไม้", "ใบมอบภารกิจ"],
                           exp=40, str_=13, cha=11),
        summary="ผู้เล่นรับภารกิจกำจัดโจรในป่าเหนือ รางวัล 200 ทอง ต้องนำหัวหน้าโจรกลับมา",
        objective="ค้นหาฐานโจรในป่าทางเหนือของเมือง",
        image_prompt="mayor's office, quest document with seal, map of northern forest, reward poster",
        suggested=["เตรียมอุปกรณ์ก่อนออกเดินทาง", "ถามชาวบ้านเรื่องที่ตั้งของโจร", "ออกเดินทางทันที"],
        time_of_day="บ่าย",
        dialogue=[{"speaker": "นายกเทศมนตรี", "text": "นำหัวหน้าโจรมาให้ข้า รางวัลสองร้อยทองรอท่านอยู่"}]
    ),
    rec(
        story="ผู้เล่นกำลังค้นหาอาวุธโบราณในห้องสมุดของพ่อมดที่ตายแล้ว",
        action="อ่านหนังสือที่มีรอยขีดเส้นใต้หลายหน้า",
        narrative="หนังสือหนาเปิดออกที่หน้าที่มีรอยพับ บรรทัดที่ขีดเส้นใต้ด้วยหมึกแดงกล่าวถึงดาบ Nightfall ที่ถูกซ่อนไว้ในสุสานทางตะวันออก แต่มีคำเตือนว่าผู้ที่ไม่มีเลือดของบรรพบุรุษจะถูกสาปเมื่อจับดาบ หน้าต่อไปถูกฉีกออก",
        status=base_status(level=6, hp=40, max_hp=42, mana=18, max_mana=20, gold=230,
                           inventory=["ดาบยาว", "หนังสือคาถา", "สมุดบันทึก"],
                           skills=["ค้นคว้า", "โจมตีคู่", "เวทมนตร์ไฟ"],
                           exp=85, int_=15, wis=13),
        summary="ผู้เล่นค้นพบว่าดาบ Nightfall ซ่อนอยู่ในสุสานทางตะวันออก แต่มีคำสาปสำหรับผู้ที่ไม่มีเลือดบรรพบุรุษ",
        objective="ค้นหาว่าหน้าที่ถูกฉีกออกมีข้อมูลอะไรและอยู่ที่ไหน",
        image_prompt="wizard library dusty, ancient tome red underlines, sword illustration, torn pages mystery",
        suggested=["ค้นหาหน้าที่ฉีกออกในห้องสมุด", "บันทึกข้อมูลก่อนออกไป", "มุ่งหน้าสุสานทางตะวันออก"],
        time_of_day="สาย"
    ),
    rec(
        story="ผู้เล่นเพิ่งกำจัดเจ้าเมืองทุจริตได้สำเร็จ",
        action="ออกมาจากปราสาทพร้อมหลักฐานการทุจริต",
        narrative="ชาวเมืองที่รวมตัวอยู่หน้าประตูปราสาทส่งเสียงโห่ฮิ้วเมื่อเห็นคุณถือเอกสารออกมา คนชราถึงกับน้ำตาซึม เด็กๆ วิ่งมาหาด้วยความยินดี คุณยืนอยู่บนบันไดและรู้สึกว่านี่คือเหตุผลที่ออกมาผจญภัย อิสรภาพของเมืองนี้คือรางวัลที่ยิ่งใหญ่กว่าทองคำใดๆ",
        status=base_status(level=9, hp=55, max_hp=60, mana=22, max_mana=25, gold=1200,
                           inventory=["ดาบยาว +2", "เกราะแผ่น", "เอกสารหลักฐาน"],
                           skills=["โจมตีคู่", "เวทมนตร์", "การทูต", "รักษา"],
                           exp=95, str_=15, cha=16, int_=13),
        summary="ผู้เล่นปลดปล่อยเมือง Ashford จากการปกครองของเจ้าเมืองทุจริตและได้รับการต้อนรับจากชาวเมือง",
        objective="นำหลักฐานไปมอบให้กษัตริย์เพื่อตั้งผู้ปกครองใหม่",
        image_prompt="castle gate crowd cheering, hero holding documents, liberation celebration, tearful citizens",
        suggested=["กล่าวสุนทรพจน์กับชาวเมือง", "มุ่งหน้าไปพบกษัตริย์ทันที", "พักฟื้นในเมืองก่อน"],
        time_of_day="บ่าย"
    ),
    rec(
        story="ผู้เล่นถูกดักจับและถูกขังในคุกใต้ดิน",
        action="ตรวจสอบห้องขังและหาทางหนี",
        narrative="แสงเทียนริบหรี่ส่องให้เห็นห้องหินแคบๆ ประตูเหล็กหนาล็อคจากนอก แต่บานหน้าต่างเล็กด้านบนเปิดออกสู่ท้องฟ้ายามค่ำ ร่างกายคุณถูกริบอาวุธไปหมด ในมุมห้องมีฟาง เชือกเก่า และกระดูกไก่ที่ใครบางคนเหลือทิ้งไว้",
        status=base_status(level=5, hp=18, max_hp=35, mana=5, max_mana=15, gold=0,
                           inventory=["เสื้อผ้าขาดรุ่ย"],
                           status_effects=["บาดแผล", "หิวโหย"],
                           exp=72, dex=14, int_=13, str_=12),
        summary="ผู้เล่นถูกขังในคุกใต้ดิน ถูกริบอาวุธและทรัพย์สินทั้งหมด มีเพียงเชือกเก่าและกระดูกไก่",
        objective="หาทางหลบหนีออกจากคุกก่อนถูกสอบสวนตอนเช้า",
        image_prompt="prison cell stone walls, small window moonlight, rope on floor, iron door, dim candle",
        suggested=["ใช้กระดูกไก่งัดกลอนประตู", "ผูกเชือกกับซี่กรงหน้าต่างปีนออก", "รอจนยามเผลอแล้วขอความช่วยเหลือ"],
        time_of_day="ดึก"
    ),

    # ── MAGIC / SPECIAL SKILLS ───────────────────────────────────────────────
    rec(
        story="ผู้เล่นนักเวทย์กำลังฝึกฝนคาถาใหม่",
        action="ฝึกคาถา Lightning Bolt กับเป้าหมายฝึกซ้อม",
        narrative="คุณกำมือและรู้สึกถึงพลังงานสะสมที่ปลายนิ้ว เส้นสายฟ้าพุ่งออกจากฝ่ามือดังเสียงแตกดังลั่น โดนเสาฝึกซ้อมพอดี รอยไหม้สีดำปรากฎกลางเสาชัดเจน พลังงาน Mana ของคุณลดลงฮวบ แต่ความรู้สึกเมื่อกี้ทำให้ใจสั่น",
        status=base_status(level=6, hp=30, max_hp=30, mana=8, max_mana=25, gold=180,
                           inventory=["ไม้เท้าเวทย์", "หนังสือคาถา"],
                           skills=["ลูกไฟ", "โล่เวทย์", "Lightning Bolt"],
                           exp=80, int_=16, wis=14),
        summary="ผู้เล่นเรียนรู้คาถา Lightning Bolt สำเร็จ แต่ใช้ Mana สูงมาก",
        objective="ฝึกคาถาเพิ่มเติมก่อนออกภารกิจ",
        image_prompt="training ground, lightning bolt spell, scorched wooden post, mage concentration, sparks",
        suggested=["ฝึกซ้อมต่อเพื่อลด Mana cost", "พักฟื้น Mana ก่อน", "ทดสอบในสถานการณ์จริง"],
        time_of_day="สาย"
    ),
    rec(
        story="ผู้เล่นนักบวชต้องรักษาบาดแผลสาวิกาที่บาดเจ็บสาหัส",
        action="ใช้คาถา Heal ระดับสูงรักษาบาดแผล",
        narrative="คุณวางมือลงบนหน้าอกของสาวิกาที่หายใจรวยรินและสวดมนต์ แสงสีทองแผ่ออกจากฝ่ามือของคุณ บาดแผลค่อยๆ ปิดจากข้างในออกมา รอยเลือดจางลงจนเหลือแค่รอยสี สาวิกาลืมตาขึ้นช้าๆ ด้วยน้ำตาในดวงตา",
        status=base_status(level=7, hp=35, max_hp=38, mana=5, max_mana=30, gold=260,
                           inventory=["คทาศักดิ์สิทธิ์", "เกราะผ้า", "ยาฟื้นฟู x1"],
                           skills=["Heal", "Holy Light", "Ward Evil", "Resurrect"],
                           exp=88, wis=16, cha=14, int_=12),
        summary="ผู้เล่นนักบวชรักษาสาวิกาที่บาดเจ็บสาหัสสำเร็จ Mana เหลือน้อยมาก",
        objective="พาสาวิกาออกจากพื้นที่อันตรายให้ปลอดภัย",
        image_prompt="healing magic golden light, wounded woman, cleric hands glowing, tears of relief, temple ruins",
        suggested=["พาสาวิกาออกจากที่นี่", "รอฟื้นฟู Mana ก่อนเดินทาง", "ตรวจสอบว่ามีศัตรูอยู่รอบๆ"],
        time_of_day="เย็น"
    ),

    # ── FAILURE / DEATH RISK ─────────────────────────────────────────────────
    rec(
        story="ผู้เล่นพยายามขโมยของจากคลังสินค้าของกิลด์พ่อค้า",
        action="ใช้ทักษะ Picklock เปิดประตูลับ",
        narrative="ลวดสอดเข้ากลไกกุญแจ นิ้วมือของคุณสั่นเล็กน้อยจากความตึงเครียด ได้ยินเสียงกลไกขยับ... แต่แล้วเสียงแตกดังลั่น ลวดหักในกุญแจ เสียงก้าวเท้าของยามดังมาจากมุมทางขวา คุณมีเวลาไม่ถึงสิบวินาที",
        status=base_status(level=3, hp=20, max_hp=20, mana=0, max_mana=0, gold=30,
                           inventory=["มีดสั้น", "ชุดดำ", "อุปกรณ์งัดแงะ (เสียหาย)"],
                           skills=["Picklock", "ซ่อนตัว", "วิ่งเงียบ"],
                           exp=42, dex=15, str_=10),
        summary="ผู้เล่นพยายามเปิดประตูลับคลังสินค้า แต่ลวดหักและยามกำลังมา",
        objective="หนีออกจากคลังสินค้าก่อนยามเจอตัว",
        image_prompt="warehouse night, broken lockpick, guard approaching with torch, thief in dark clothes, urgent",
        suggested=["ซ่อนตัวในเงามืดทันที", "วิ่งออกทางหน้าต่าง", "หันหน้าเผชิญยามและโกหก"],
        time_of_day="ดึก"
    ),
    rec(
        story="ผู้เล่นตกลงไปในกับดักของทหารรับจ้างสี่คน",
        action="ยืนหยัดสู้แม้จะเสียเปรียบ",
        narrative="เลือดไหลจากริมฝีปากที่แตกของคุณ ทหารรับจ้างสามคนล้อมคุณอยู่ครึ่งวงกลม คนที่สี่ยืนอยู่ทางออกพร้อมธนู HP ของคุณวิกฤต แต่มือของคุณยังกำดาบแน่น คุณรู้ว่าถ้าจะออกไปได้ต้องทำลายแนวป้องกันให้พังก่อน",
        status=base_status(level=4, hp=4, max_hp=28, mana=2, max_mana=10, gold=80,
                           inventory=["ดาบยาว", "เกราะหนังเสียหาย"],
                           status_effects=["บาดแผลสาหัส", "เลือดออก"],
                           skills=["โจมตีคู่", "ป้องกัน"],
                           exp=60, str_=14, dex=12, con=11),
        summary="ผู้เล่นถูกล้อมโดยทหารรับจ้าง 4 คน HP เหลือน้อยวิกฤต",
        objective="หลบหนีหรือเอาชนะทหารรับจ้างก่อนตาย",
        image_prompt="outnumbered warrior, four mercenaries surrounding, blood on face, desperate standoff, sword raised",
        suggested=["จู่โจมคนที่อยู่ใกล้ทางออกที่สุด", "ใช้คาถาสุดท้ายที่เหลือ", "ขอยอมแพ้และเจรจา"],
        time_of_day="ค่ำ"
    ),

    # ── GENRE VARIETY: DARK FANTASY ──────────────────────────────────────────
    rec(
        story="โลก Grimdark ที่เทพทิ้งมนุษย์ไปนานแล้ว ผู้เล่นเป็นนักล่าสัตว์ประหลาด",
        action="เข้าไปในหมู่บ้านที่ได้รับรายงานว่ามีสัตว์ประหลาดกินคน",
        narrative="หมู่บ้านเงียบเกินไป ไก่ไม่ขัน สุนัขไม่เห่า คุณเดินผ่านบ้านที่ประตูเปิดค้างด้วยมือบนดาบ ในบ้านหลังแรก มีรอยเลือดดำๆ ลากจากเตาผิงออกสู่ประตู กลิ่นเหม็นคาวที่คุ้นเคยหนักขึ้นทุกก้าว",
        status=base_status(level=7, hp=42, max_hp=45, mana=0, max_mana=0, gold=120,
                           inventory=["ดาบเงิน", "ไม้กางเขนเหล็ก", "ยาแก้พิษ x2", "คบเพลิงน้ำมันศักดิ์สิทธิ์"],
                           skills=["ล่าสัตว์ประหลาด", "ระบุสายพันธุ์", "โจมตีจุดอ่อน"],
                           exp=85, str_=14, dex=15, wis=14),
        summary="นักล่าสัตว์ประหลาดสำรวจหมู่บ้านร้างที่มีรอยเลือดดำและกลิ่นสัตว์ประหลาด",
        objective="ค้นหาสัตว์ประหลาดและชาวบ้านที่หายไปก่อนมืด",
        image_prompt="grimdark abandoned village, black blood trail, monster hunter, silver sword, oppressive silence",
        suggested=["ติดตามรอยเลือดไปทิศเหนือ", "ตรวจสอบโบสถ์ที่อยู่ตรงกลางหมู่บ้าน", "จุดคบเพลิงและรอค่ำ"],
        time_of_day="เย็น"
    ),
    rec(
        story="Dark Fantasy — ราชอาณาจักรล่มสลาย ผู้เล่นเป็นอัศวินที่ถูกกษัตริย์ทรยศ",
        action="เผชิญหน้ากับอัศวินที่เคยเป็นเพื่อนร่วมรบ",
        narrative="ใบหน้าของ Kael ไม่เปลี่ยนแปลงเมื่อเห็นคุณ เขายกดาบขึ้นโดยไม่พูดคำเดียว คุณรู้ว่าเขาทำตามคำสั่ง ไม่ใช่เพราะต้องการ ผมขาวที่ขมับของเขาเพิ่มขึ้นกว่าที่จำได้ และดวงตาที่เคยเต็มไปด้วยเสียงหัวเราะตอนนี้ว่างเปล่า",
        status=base_status(level=10, hp=60, max_hp=65, mana=15, max_mana=15, gold=0,
                           inventory=["ดาบ Oathbreaker", "เกราะแตกหัก"],
                           status_effects=["ถูกเนรเทศ"],
                           skills=["โจมตีคู่", "จิตวิทยาการต่อสู้", "ป้องกันสมบูรณ์"],
                           exp=98, str_=16, dex=14, cha=13, wis=12),
        summary="อัศวินผู้ถูกทรยศเผชิญหน้ากับเพื่อนเก่า Kael ผู้ยังจงรักภักดีต่อกษัตริย์",
        objective="เอาชนะหรือโน้มน้าว Kael ให้เข้าใจความจริง",
        image_prompt="grimdark duel, two knights facing each other, battlefield ruins, rain, emotional tension",
        suggested=["พูดชื่อเขาและขอให้หยุด", "สู้เพื่อป้องกันตัว", "วางดาบและยอมรับชะตากรรม"],
        time_of_day="เย็น"
    ),

    # ── GENRE VARIETY: POLITICAL ─────────────────────────────────────────────
    rec(
        story="ผู้เล่นเป็นตัวแทนลับของราชินีในการเจรจาสันติภาพ",
        action="แอบดักฟังการประชุมลับของฝ่ายตรงข้าม",
        narrative="คุณหมอบอยู่หลังผ้าม่านหนา เสียงพูดคุยในห้องชัดเจนพอที่จะจับใจความ ขุนนาง Valen บอกกับสายลับว่าสนธิสัญญาเป็นแค่กลอุบายล่อให้ราชินีออกจากกำแพงเมือง คุณบันทึกทุกคำลงสมุดโน้ตในความมืด มือสั่นเล็กน้อยจากความตื่นเต้น",
        status=base_status(level=6, hp=28, max_hp=28, mana=0, max_mana=0, gold=300,
                           inventory=["มีดสั้น x2", "ชุดขุนนาง", "สมุดโน้ตเข้ารหัส", "แหวนตราตระกูลปลอม"],
                           skills=["แทรกซึม", "ปลอมตัว", "จดจำ", "ล็อคประตู"],
                           exp=82, dex=15, int_=14, cha=13, wis=15),
        summary="ตัวแทนลับค้นพบว่าสนธิสัญญาสันติภาพเป็นกับดักเพื่อจับราชินี ต้องรีบแจ้งเตือน",
        objective="หนีออกจากพระราชวังและนำข้อมูลกลับไปยังราชินีภายในรุ่งเช้า",
        image_prompt="palace curtain hiding spy, secret meeting, noble conspiring, candlelit chamber, notebook writing",
        suggested=["หนีออกทันทีก่อนถูกจับได้", "ฟังต่ออีกสักครู่เพื่อข้อมูลเพิ่มเติม", "ส่งสัญญาณเตือนลับให้ทีม"],
        time_of_day="ดึก"
    ),
]

def main():
    output = Path("/Users/nampu/ai-realm-rpg/rpg_finetune_real.jsonl")
    with open(output, "w", encoding="utf-8") as f:
        for ex in EXAMPLES:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")
    print(f"เขียน {len(EXAMPLES)} examples → {output}")

if __name__ == "__main__":
    main()
