# 🔊 คู่มือทำไฟล์เสียงจริง (AudioGen → howler.js) — ตั้งแต่ 0

เป้าหมาย: ใช้ AI (AudioGen) ที่เครื่องตัวเอง **ผลิตไฟล์เสียง** ครั้งเดียว → วางใน `public/sfx/` →
เกมเล่นด้วย howler.js (มี **synth เดิมเป็น fallback** อัตโนมัติ ฉากไหนยังไม่มีไฟล์ก็ไม่พัง)

> **สำคัญ:** เราไม่รัน AI ในเว็บ — AI แค่ช่วย"ปั๊มไฟล์" ที่เครื่องเรา แล้วเอาไฟล์ไปใช้

---

## 📋 รายการไฟล์ที่ต้องทำ (14 ไฟล์)

ชื่อไฟล์ต้อง **ตรงเป๊ะ** ตามนี้ (โค้ดหาไฟล์จากชื่อนี้):

### Ambient loops → `public/sfx/ambient/<name>.ogg` (+ `.m4a`)
ต้องเป็น **loop เนียน** (วนไม่มีรอยต่อ) · ยาว ~12–20 วินาที · mono

| ไฟล์ | Prompt AudioGen (อังกฤษ) | มี visual ด้วย |
|------|--------------------------|:---:|
| `rain` | steady rain falling on stone, gentle downpour, wet ground | ✅ |
| `snow` | soft wind over snow, quiet winter ambience, faint howl | ✅ |
| `fog` | low eerie wind, misty hollow tones, distant | ✅ |
| `embers` | crackling campfire, burning wood, close up | ✅ |
| `wind` | howling wind gusts over open plains, strong | |
| `water` | dripping water in a cave, small trickling stream, echoey | |
| `ocean` | ocean waves rolling onto shore, calm sea | |
| `underwater` | submerged muffled ambience, deep, faint bubbles | |
| `cave` | deep cavern rumble, distant drips, eerie echo | |
| `crowd` | busy medieval market crowd murmur, indistinct chatter | |
| `machinery` | industrial machinery hum, factory drone, mechanical | |
| `magic` | arcane shimmering hum, ethereal mystical energy | |

### One-shot impacts → `public/sfx/impact/<name>.ogg` (+ `.m4a`)
เล่นครั้งเดียว (ไม่ต้อง loop) · ยาว ~1–2 วินาที

| ไฟล์ | Prompt |
|------|--------|
| `boom` | large explosion, deep boom, debris, cinematic |
| `thunder` | loud thunderclap, sharp crack with rumble |

> ทุก prompt ปิดท้ายด้วย **`, no music, no speech`** เสมอ

---

## STEP 0 — เตรียมเครื่อง (ครั้งเดียว)

- **Mac (Apple Silicon M1–M4):** RAM ≥ 16GB รันได้สบาย (ใช้ MPS)
- **Windows:** การ์ด Nvidia RTX ≥ 8GB VRAM
- พื้นที่ว่างดิสก์ ~10–15GB (ตัวโมเดล)
- ติดตั้ง **Audacity** (ฟรี) ไว้ตัด loop → https://www.audacityteam.org
- ติดตั้ง **ffmpeg** (แปลงไฟล์) → Mac: `brew install ffmpeg`

---

## STEP 1 — ติดตั้ง Pinokio (ตัวรัน AI แบบคลิกเดียว)

1. โหลดจาก https://pinokio.computer → ติดตั้งเหมือนแอปทั่วไป
2. เปิด Pinokio (มันคือ browser สำหรับรัน AI local)

---

## STEP 2 — ติดตั้ง AudioCraft (AudioGen) ใน Pinokio

1. ในหน้า Pinokio กด **Discover / Explore** → ค้น **"AudioCraft"**
2. กด **Install** → รอมันโหลด environment + โมเดล (นานหน่อยครั้งแรก)
3. กด **Start** → มันจะเปิดหน้า **WebUI** ในเบราว์เซอร์ให้พิมพ์สั่งงาน
4. ในหน้า WebUI เลือกโหมด **AudioGen** (ไม่ใช่ MusicGen)
   - Model: **`audiogen-medium`** (ถ้าเครื่องไหว) หรือ `small` ถ้าช้า

---

## STEP 3 — เจนเสียง (ทำทีละไฟล์ตามตาราง)

สำหรับแต่ละไฟล์:
1. วาง **prompt** จากตารางด้านบน (เติม `, no music, no speech`)
2. ตั้ง **Duration:**
   - ambient loop → **~25–30 วินาที** (เผื่อไว้ตัด loop ทีหลัง)
   - impact → **~2 วินาที**
3. กด Generate → ฟัง → ถ้าไม่ถูกใจ กดใหม่ (สุ่มทุกครั้ง) จนได้ที่ชอบ
4. **Download** เป็น `.wav` → เซฟไว้โฟลเดอร์ชั่วคราว เช่น `~/sfx-raw/rain.wav`

> เคล็ด: เจน 2–3 รอบต่อ prompt แล้วเลือกอันดีสุด · เสียง ambient เอาแบบ "สม่ำเสมอ ไม่มี event เด่น" จะ loop ง่าย

---

## STEP 4 — ทำ loop ให้เนียน (เฉพาะ ambient) ด้วย Audacity

ambient ต้องวนไม่มีรอยต่อ — วิธี crossfade หัว-ท้าย:

1. เปิดไฟล์ `.wav` ใน Audacity
2. ตัดเอาช่วงกลางที่นิ่งๆ ~15 วินาที (Trim)
3. **Effect → Crossfade Loop** (หรือทำมือ: ก๊อป 2 วิ แรกไปแปะท้าย แล้ว Effect → Crossfade Tracks)
4. ฟังวนดู (กด Loop Play) ว่ารอยต่อเนียนไหม
5. **Tracks → Mix → Stereo to Mono** (ให้เป็น mono ไฟล์เล็กลง)
6. **File → Export → Export as WAV** → `~/sfx-loop/rain.wav`

> ถ้าไม่อยากใช้ Audacity: มีเว็บ/ทูล "seamless loop" อัตโนมัติได้ แต่ Audacity คุมง่ายสุด

---

## STEP 5 — แปลงเป็น .ogg + .m4a แล้ววางในโปรเจกต์

**ทำไม 2 format:** `.ogg` loop เนียน (ใช้หลัก) · `.m4a` ให้ Safari (Safari ไม่เล่น ogg)
> ห้ามใช้ `.mp3` สำหรับ loop — mp3 มี padding ทำให้มีรอยต่อ!

แปลงด้วย ffmpeg (mono, บีบพอดี):
```bash
# ambient (ตัวอย่าง rain) — ทำทุกไฟล์
ffmpeg -i ~/sfx-loop/rain.wav -ac 1 -c:a libvorbis -q:a 4 rain.ogg
ffmpeg -i ~/sfx-loop/rain.wav -ac 1 -c:a aac -b:a 96k rain.m4a

# impact (ตัวอย่าง boom)
ffmpeg -i ~/sfx-raw/boom.wav -ac 1 -c:a libvorbis -q:a 5 boom.ogg
ffmpeg -i ~/sfx-raw/boom.wav -ac 1 -c:a aac -b:a 128k boom.m4a
```

วางไฟล์ในโครงนี้ (สร้างโฟลเดอร์ได้เลย):
```
public/sfx/
  ambient/
    rain.ogg   rain.m4a
    snow.ogg   snow.m4a
    ... (ครบ 12 ตัว)
  impact/
    boom.ogg    boom.m4a
    thunder.ogg thunder.m4a
```

> วางได้ทีละตัว ไม่ต้องครบ! ฉากไหนมีไฟล์ = เสียงจริง, ฉากไหนยังไม่มี = synth เดิม

---

## STEP 6 — ให้ Claude ต่อ howler (ครั้งเดียว)

พอมีไฟล์อย่างน้อย 1 ตัวใน `public/sfx/` แล้ว บอก Claude ว่า **"ต่อ howler layer ได้"** →
Claude จะ:
1. `npm install howler @types/howler`
2. เขียน loader ใน `src/lib/sounds.ts`:
   - ถ้ามีไฟล์ `sfx/ambient/<name>.ogg` → เล่นด้วย howler (loop + fade)
   - ถ้าไม่มี → fallback ไป synth เดิม
   - lazy-load (โหลดตอนใช้) + คุม volume/mute เดิม
3. ไม่ต้องแก้ FXManager/prompt/schema — ชื่อ fx เหมือนเดิมทุกอย่าง

---

## 📐 สรุปสเปกไฟล์ (อ้างอิงเร็ว)

| อย่าง | format | channel | ยาว | หมายเหตุ |
|------|--------|---------|-----|---------|
| ambient loop | `.ogg` + `.m4a` | mono | 12–20s | ต้อง loop เนียน, ห้าม mp3 |
| impact | `.ogg` + `.m4a` | mono | 1–2s | เล่นครั้งเดียว |
| ความดัง | normalize ให้ใกล้กันทุกไฟล์ | | | เกมคุม volume เอง (ambient เบา) |
| ขนาด/ไฟล์ | ~50–200 KB ต่อไฟล์ | | | lazy-load ไม่โหลดพร้อมกัน |

## 💡 Tips
- **เริ่มจาก 3–4 ตัวที่เจอบ่อย** (rain, cave, water, boom) ก่อน แล้วค่อยเติม — เห็นผลเร็ว
- ambient อย่าเอาที่มี "เหตุการณ์เด่น" (เช่นฟ้าผ่ากลางฝน) เพราะ loop แล้วจะรู้สึกซ้ำ — แยกฟ้าผ่าเป็น impact
- **BGM/เพลง** เป็นอีกงาน (ใช้ MusicGen) — เก็บไว้ทีหลัง คนละระบบกับ FX
- อยากได้เสียงหลากหลาย: เจนหลายเวอร์ชันของ effect เดียว (rain1/rain2) แล้วให้ Claude สุ่มเล่นก็ได้ (ค่อยคุยตอนต่อ howler)

---
*สร้างโดย Claude — ถ้าติดตรงไหนถามได้เลย*
