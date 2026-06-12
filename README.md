# 🗺️ AI Realm RPG

> เกม Text-Based RPG ที่ขับเคลื่อนด้วย AI — สร้างโลก, ตัวละคร, และเนื้อเรื่องของคุณเอง แล้วให้ Game Master AI เล่าเรื่องแบบไดนามิกไปกับคุณทุกการตัดสินใจ

เกมนี้สร้างด้วย [Next.js](https://nextjs.org) (App Router), React 19, TypeScript, Tailwind CSS 4 และ Zustand โดยทำงานเป็นแอปหน้าเดียว (SPA-like) ที่คุยกับ AI ผ่าน API Route เดียว ซึ่งสามารถต่อกับโมเดล AI ได้หลายผู้ให้บริการ ทั้งแบบรันในเครื่อง (Ollama) และแบบ Cloud (Groq, Google Gemini)

---

## ✨ Features

- 🌍 **สร้างโลกของคุณเอง** — กำหนดภาษา, แนวเกม (genre), โทนเรื่อง (hardcore / balanced / story / sandbox), ตัวละคร, และรายละเอียดโลกที่กำหนดเอง
- 🤖 **Game Master AI แบบ Real-time** — AI เล่าเนื้อเรื่อง คำนวณผลลัพธ์ และอัปเดตสถานะผู้เล่นแบบสตรีม (streaming) ให้ความรู้สึกเหมือนกำลังพิมพ์อยู่
- 🎲 **กลไก D20** — ระบบทอยเต๋าแบบ D20 สำหรับการตัดสินผลการกระทำ พร้อมแสดงผลด้วย Dice Roll Badge
- ⚡ **Quick Time Event (QTE)** — เหตุการณ์เร่งด่วนที่ต้องตัดสินใจภายในเวลาจำกัด
- 🎒 **สถานะผู้เล่นเต็มรูปแบบ** — HP, Mana, Inventory, Status Effects, Level, EXP, Skills ที่ AI ควบคุมและอัปเดตเองทุกเทิร์น
- 📖 **Journal / สรุปเนื้อเรื่อง** — ติดตามเป้าหมายปัจจุบันและสรุปเรื่องราวที่ผ่านมา
- 🖼️ **ภาพประกอบฉากอัตโนมัติ** — สร้างภาพจาก `scene_image_prompt` ที่ AI กำหนด ผ่าน [Pollinations.ai](https://pollinations.ai)
- ☁️ **ระบบบัญชีและ Cloud Save** — ล็อกอิน, จัดการ Save Slot หลายช่อง, ซิงค์ข้อมูลเกมขึ้น Cloud ผ่าน Supabase
- 💾 **Save / Load ในเครื่อง** — บันทึกอัตโนมัติด้วย `localStorage` พร้อม Export/Import เซฟเกมเป็นไฟล์ JSON
- 🔌 **รองรับ AI หลายผู้ให้บริการ** — เลือกได้ระหว่าง Ollama (รันในเครื่อง, ฟรี), Groq (Cloud, เร็ว), หรือ Google Gemini (Cloud)

---

## 🚀 Quick Start

### 1. ติดตั้ง dependencies

```bash
npm install
```

### 2. ตั้งค่า Environment Variables

คัดลอกไฟล์ตัวอย่างแล้วกรอกค่าที่ต้องใช้:

```bash
cp .env.local.example .env.local
```

| Variable | จำเป็นเมื่อ | คำอธิบาย |
| --- | --- | --- |
| `GROQ_API_KEY` | ผู้เล่นเลือกโมเดล "Cloud (Groq)" | ขอ free API key ได้ที่ [console.groq.com/keys](https://console.groq.com/keys) |
| `GEMINI_API_KEY` | ผู้เล่นเลือกโมเดล "Cloud (Google AI)" | ขอ free API key ได้ที่ [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |
| `NEXT_PUBLIC_SUPABASE_URL` | ต้องการระบบล็อกอิน/Cloud Save | สร้างโปรเจกต์ที่ [supabase.com](https://supabase.com) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ต้องการระบบล็อกอิน/Cloud Save | จาก Supabase project settings |

> ถ้าใช้ Supabase ให้รันไฟล์ [`supabase/schema.sql`](supabase/schema.sql) ใน SQL Editor ของโปรเจกต์เพื่อสร้างตารางที่จำเป็น

### 3. (ตัวเลือก) ติดตั้ง Ollama สำหรับ AI แบบรันในเครื่อง

ถ้าต้องการเล่นแบบไม่ต้องมี API key สามารถรัน AI ในเครื่องได้ด้วย [Ollama](https://ollama.com/):

```bash
ollama pull qwen2.5:14b
```

จากนั้นตรวจสอบให้ Ollama รันอยู่ที่ `http://127.0.0.1:11434` (ค่า default)

### 4. รัน Development Server

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) เพื่อเริ่มเล่น 🎮

---

## 📜 Available Scripts

| Script | คำอธิบาย |
| --- | --- |
| `npm run dev` | รัน dev server ที่ `http://localhost:3000` |
| `npm run build` | สร้าง production build |
| `npm run start` | รัน production server (ต้อง build ก่อน) |
| `npm run lint` | ตรวจสอบโค้ดด้วย ESLint |
| `npm run serve` | build + start + เปิด tunnel สาธารณะผ่าน [ngrok](https://ngrok.com) (ดู [`scripts/serve.sh`](scripts/serve.sh)) |

---

## 🧠 AI Providers

ผู้เล่นสามารถเลือกผู้ให้บริการ AI ได้ตอนสร้างโลกใหม่ ผ่าน `world_config.aiProvider`:

| Provider | ค่า | ต้องการอะไร |
| --- | --- | --- |
| **Ollama** (default) | `ollama` | รัน Ollama ในเครื่อง, ไม่มีค่าใช้จ่าย |
| **Groq** | `groq` | `GROQ_API_KEY`, รวดเร็วผ่าน Cloud |
| **Google Gemini** | `gemini` | `GEMINI_API_KEY` |

API Route ที่ [`src/app/api/chat/route.ts`](src/app/api/chat/route.ts) จะแปลงการตอบกลับของทุก provider ให้อยู่ในรูปแบบสตรีมแบบเดียวกัน (Ollama NDJSON format) เพื่อให้ฝั่ง client จัดการแบบเดียวกันทั้งหมด

---

## 🏗️ Architecture

### State Management — [`src/store/useGameStore.ts`](src/store/useGameStore.ts)

Zustand store ตัวเดียว (persist ลง `localStorage` ในชื่อ `ai-realm-save`) เก็บ state ทั้งหมดของเกม:

- **`game_phase`** — `'Auth' | 'Dashboard' | 'Menu' | 'Playing'` ควบคุม UI หลักใน `page.tsx`
- **`world_config`** — ภาษา, genre, tone, ตัวละคร, รายละเอียดโลก, opening seed, AI provider/model — กำหนดครั้งเดียวตอนสร้างเกมโดย `WorldCreationMenu`
- **`player_status`** — hp/mana/inventory/status_effects/level/exp/skills — AI เป็นผู้ควบคุมและอัปเดตค่าเหล่านี้ทั้งหมดผ่าน JSON response แต่ละเทิร์น
- **`history`** — log ของบทสนทนาระหว่างผู้เล่นและ GM
- **`story_summary`, `current_objective`, `current_image_prompt`, `suggested_actions`** — ขับเคลื่อนโดย AI response ทุกเทิร์นเช่นกัน
- **Auth & Cloud Save state** — `user`, `auth_status`, `save_slots`, `current_save_slot_id` สำหรับระบบล็อกอินและจัดการ Save Slot ผ่าน Supabase

### Game Loop — [`src/app/page.tsx`](src/app/page.tsx)

1. `WorldCreationMenu` เก็บข้อมูล `WorldConfig` และเรียก `handleStartGame` เพื่อตั้ง `game_phase: 'Playing'` และส่งเทิร์นแรก "Begin the adventure."
2. ทุกการกระทำของผู้เล่นจะผ่าน `runTurn` ซึ่ง POST ไปที่ `/api/chat` พร้อมข้อมูล: prompt ใหม่, ประวัติ 10 เทิร์นล่าสุด, `player_status` ปัจจุบัน, `story_summary`, และ `world_config`
3. Response เป็น NDJSON stream (รูปแบบ Ollama) — ฝั่ง client จะ extract ฟิลด์ `narrative` ด้วย regex เพื่อแสดงผลแบบ "กำลังพิมพ์" สด ๆ จากนั้นเมื่อ stream เสร็จจะ parse JSON ทั้งก้อน (`extractAndParseJSON`) แล้วเขียนค่า `player_status`, `story_summary`, `current_objective`, `is_dead`, `current_image_prompt`, `suggested_actions`, และ history เทิร์นใหม่ลง store
4. หาก parse/network ผิดพลาด UI จะแสดง error พร้อมปุ่ม "retry" เพื่อเรียก `runTurn` เดิมซ้ำ
5. รองรับ Save/Load ผ่าน JSON export/import นอกเหนือจากการ persist อัตโนมัติลง `localStorage`

### AI Integration — [`src/app/api/chat/route.ts`](src/app/api/chat/route.ts)

- `buildSystemPrompt(worldConfig)` สร้าง system prompt ขนาดใหญ่ที่ครอบคลุม: world setting/genre, กฎเฉพาะของแต่ละ tone (`TONE_RULES` สำหรับ hardcore/balanced/story/sandbox), ข้อกำหนดด้านภาษา, กลไก D20, และกฎเข้มงวดสำหรับการรักษาความสอดคล้องของ `player_status`, `story_summary`, และ `current_objective` กับเนื้อเรื่องในแต่ละเทิร์น
- Prompt ทั้งหมด (system prompt + story summary + ประวัติล่าสุด + player status ปัจจุบัน + การกระทำใหม่ของผู้เล่น) จะถูกส่งไปยัง provider ที่เลือก (Ollama `/api/generate`, Groq, หรือ Gemini) โดยขอ `format: "json"` และ `stream: true` แล้วส่ง raw stream กลับไปยัง client โดยตรง
- **AI ต้องตอบกลับเป็น JSON object เดียวที่ตรงตาม schema คงที่** (`narrative`, `player_status`, `story_summary`, `current_objective`, `scene_image_prompt`, `is_dead`, `suggested_actions`) เมื่อแก้ไข game mechanics ต้องอัปเดต schema/prompt ใน `route.ts` พร้อมกับ type ใน `useGameStore.ts` และ logic การ parse ใน `page.tsx` ให้สอดคล้องกัน

### Scene Images

เมื่อ AI กำหนด `scene_image_prompt` ที่ไม่ใช่ค่าว่าง `page.tsx` จะ render รูปภาพผ่าน `https://image.pollinations.ai/prompt/...` โดยใช้ prompt นั้น (ต่อท้ายด้วย style suffix ที่กำหนดไว้) — เป็นบริการ image generation ภายนอกที่ไม่ต้อง authentication และเรียกตรงจาก client

### Authentication & Cloud Save — Supabase

- [`src/lib/supabase/client.ts`](src/lib/supabase/client.ts) — Supabase client สำหรับฝั่ง browser
- [`supabase/schema.sql`](supabase/schema.sql) — schema สำหรับตาราง save slots และข้อมูลผู้ใช้ (รันใน Supabase SQL Editor ก่อนใช้งาน)
- ผู้เล่นสามารถล็อกอิน, สร้าง/โหลด/ลบ Save Slot ได้หลายช่อง และซิงค์ข้อมูลเกมขึ้น Cloud

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/chat/route.ts      # API Route — proxy ไปยัง Ollama/Groq/Gemini
│   ├── layout.tsx
│   └── page.tsx                # Game loop หลัก
├── components/
│   ├── AuthScreen.tsx          # หน้าล็อกอิน/สมัครสมาชิก
│   ├── MainMenuDashboard.tsx   # Dashboard จัดการ Save Slot
│   ├── WorldCreationMenu.tsx   # ตั้งค่าโลก/ตัวละครก่อนเริ่มเกม
│   ├── game/
│   │   ├── GameHeader.tsx
│   │   ├── CharacterSidebar.tsx
│   │   ├── ChatHistory.tsx
│   │   ├── ActionBar.tsx
│   │   ├── DiceRollBadge.tsx
│   │   ├── QTEOverlay.tsx
│   │   └── JournalModal.tsx
│   └── ui/Modal.tsx
├── lib/
│   ├── gameText.ts
│   └── supabase/client.ts
└── store/
    └── useGameStore.ts          # Zustand store (persisted)

supabase/
└── schema.sql                   # Database schema สำหรับ Cloud Save

scripts/
└── serve.sh                      # build + start + ngrok tunnel
```

---

## 🎨 Conventions

- ข้อความ UI หลักเป็น **ภาษาไทย**; prompt และ types ที่ใช้สื่อสารกับ AI เป็น **ภาษาอังกฤษ** — ข้อความใหม่ที่ผู้เล่นเห็นควรเป็นภาษาไทยตามเดิม เว้นแต่ `world_config.language` กำหนดไว้เป็นอย่างอื่น
- Styling ใช้ **Tailwind utility classes** เท่านั้น โทนสีเป็นธีม dark/neutral แบบ RPG (`neutral-9xx` เป็นพื้นหลัง, accent color สำหรับ HP/Mana/Status)

---

## 🛠️ Tech Stack

- [Next.js 16](https://nextjs.org) (App Router)
- [React 19](https://react.dev)
- [TypeScript 5](https://www.typescriptlang.org)
- [Tailwind CSS 4](https://tailwindcss.com)
- [Zustand 5](https://zustand-demo.pmnd.rs) (state management + persistence)
- [Supabase](https://supabase.com) (auth + cloud save)
- [Ollama](https://ollama.com) / [Groq](https://groq.com) / [Google Gemini](https://ai.google.dev) (AI providers)
- [Pollinations.ai](https://pollinations.ai) (scene image generation)

---

## ⚠️ ข้อควรรู้

- ไม่มี test suite ในโปรเจกต์นี้
- ถ้าเลือกใช้ Ollama แต่ไม่ได้รัน Ollama ไว้ที่ `http://127.0.0.1:11434` คำขอ `/api/chat` จะ fail
- การสร้างภาพผ่าน Pollinations.ai เป็นบริการภายนอกที่ไม่ต้อง authentication — โปรดพิจารณาความเหมาะสมของ prompt ที่ส่งออกไป
