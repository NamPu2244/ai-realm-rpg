# AI Realm RPG — Fine-tuning Pipeline (Apple Silicon)

QLoRA fine-tune Qwen2.5-14B-Instruct บน MacBook Pro M-series ด้วย MLX

## ภาพรวมขั้นตอน

```
generate_dataset.py  →  dataset.jsonl       (ใช้ Claude API สร้าง training data)
train_lora.py        →  lora-adapters/      (train LoRA adapter ด้วย MLX)
convert_and_deploy.sh →  Ollama model "ai-realm-rpg"  (fuse → GGUF → register)
```

## ข้อกำหนด

- MacBook Pro M1/M2/M3/M4/M5 ที่มี RAM 16 GB ขึ้นไป (24 GB แนะนำ)
- Python 3.11+
- Ollama running ที่ localhost
- Anthropic API key (สำหรับ generate dataset เท่านั้น)

---

## ขั้นตอนที่ 1: ติดตั้ง dependencies

```bash
cd fine-tuning

# สร้าง virtual environment (ต้องทำครั้งแรกครั้งเดียว)
python3 -m venv .venv
source .venv/bin/activate

# ติดตั้ง packages
pip install -r requirements.txt
```

**หมายเหตุ:** บน macOS ต้องใช้ `pip3` หรือ venv เสมอ ห้ามใช้ `pip` โดยตรง
ครั้งต่อๆ ไปแค่ `source fine-tuning/.venv/bin/activate` ก่อนรัน script

---

## ขั้นตอนที่ 2: สร้าง Training Dataset

```bash
export ANTHROPIC_API_KEY=sk-ant-...
python generate_dataset.py --count 500 --output dataset.jsonl
```

แต่ละ example คือ GM JSON response คุณภาพสูงจาก Claude Opus ใน scenario ต่างๆ
รวม QTE scenarios, ทุก genre, ทุก tone — ใช้เวลาประมาณ 30-60 นาที

---

## ขั้นตอนที่ 3: Train LoRA Adapter

```bash
python train_lora.py \
  --dataset dataset.jsonl \
  --output ./lora-adapters \
  --iters 500 \
  --layers 16
```

| Flag | Default | คำแนะนำ |
|------|---------|---------|
| `--iters` | 500 | 400-800 เหมาะสำหรับ dataset 300-500 ตัวอย่าง |
| `--layers` | 16 | จำนวน layers ที่ apply LoRA (มากขึ้น = ดีขึ้น แต่ช้ากว่า) |
| `--batch-size` | 4 | ลดเป็น 2 ถ้า memory เต็ม |
| `--rank` | 8 | LoRA rank: 4=เร็ว, 16=คุณภาพดีกว่า |

ใช้เวลาประมาณ 20-40 นาที บน M5 24GB (500 iters)

---

## ขั้นตอนที่ 4: Convert และ Deploy

```bash
bash convert_and_deploy.sh ./lora-adapters
```

Script จะทำทั้งหมดโดยอัตโนมัติ:
1. Fuse LoRA adapter เข้า base model (`mlx_lm.fuse`)
2. Clone และ build llama.cpp ถ้ายังไม่มี (ใช้ Metal สำหรับ Mac)
3. Convert เป็น GGUF และ quantize เป็น Q4_K_M (~8 GB)
4. Register กับ Ollama เป็นชื่อ `ai-realm-rpg`

---

## ขั้นตอนที่ 5: ใช้งานใน Game

อัปเดตบรรทัดเดียวใน [route.ts](../src/app/api/chat/route.ts):

```ts
// เปลี่ยนจาก:
model: "qwen2.5:14b",
// เป็น:
model: "ai-realm-rpg",
```

ทดสอบก่อนด้วย: `ollama run ai-realm-rpg`

---

## ถ้า Training Loss ไม่ลด

- เพิ่ม `--iters` เป็น 800-1000
- ลด `--lr` เป็น `5e-6`
- เพิ่ม dataset ให้ครบ 500+ examples
- เพิ่ม QTE scenarios ให้มากขึ้น (ควรมีอย่างน้อย 20-30% ของ dataset)
