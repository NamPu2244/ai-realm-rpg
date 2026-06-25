# ========================================================
# Storyweave GM Fine-tuning — Kaggle (2x T4 = 30GB)
# Settings: Accelerator = GPU T4 x2, Internet = ON
# ========================================================

# --- CELL 1: ติดตั้ง ---
# !pip install "unsloth[kaggle-new] @ git+https://github.com/unslothai/unsloth.git"
# !pip install --no-deps trl peft accelerate bitsandbytes

# --- CELL 2: โหลด model (7B ได้เลยบน Kaggle) ---
from unsloth import FastLanguageModel
import torch
import os

os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"

MAX_SEQ_LENGTH = 2048  # Kaggle มี 30GB ใช้ได้เต็มๆ

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="unsloth/Qwen2.5-7B-Instruct",  # 7B ได้เลย
    max_seq_length=MAX_SEQ_LENGTH,
    load_in_4bit=True,
    dtype=None,
)

# --- CELL 3: LoRA ---
model = FastLanguageModel.get_peft_model(
    model,
    r=32,                    # เพิ่มจาก 16 → 32 เพราะ VRAM พอ
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                    "gate_proj", "up_proj", "down_proj"],
    lora_alpha=32,
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth",
)

# --- CELL 4: โหลด dataset จาก Kaggle ---
from datasets import load_dataset

# path ของ dataset บน Kaggle
DATASET_PATH = "/kaggle/input/storyweave-rpg-dataset/rpg_finetune.jsonl"

dataset = load_dataset("json", data_files=DATASET_PATH, split="train")
print(f"Dataset size: {len(dataset)} examples")

# --- CELL 5: Format ---
from unsloth.chat_templates import get_chat_template

tokenizer = get_chat_template(tokenizer, chat_template="qwen-2.5")

def format_example(example):
    text = tokenizer.apply_chat_template(
        example["messages"],
        tokenize=False,
        add_generation_prompt=False,
    )
    return {"text": text}

dataset = dataset.map(format_example)

# --- CELL 6: Train ---
from trl import SFTTrainer
from transformers import TrainingArguments
from unsloth import is_bfloat16_supported

torch.cuda.empty_cache()

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    dataset_text_field="text",
    max_seq_length=MAX_SEQ_LENGTH,
    dataset_num_proc=2,
    args=TrainingArguments(
        per_device_train_batch_size=2,   # เพิ่มได้เพราะ VRAM พอ
        gradient_accumulation_steps=4,
        warmup_steps=20,
        num_train_epochs=3,              # 3 epochs เต็มๆ
        learning_rate=2e-4,
        fp16=not is_bfloat16_supported(),
        bf16=is_bfloat16_supported(),
        logging_steps=25,
        optim="adamw_8bit",
        weight_decay=0.01,
        lr_scheduler_type="cosine",
        output_dir="./storyweave-output",
        report_to="none",
        save_strategy="steps",
        save_steps=200,                  # save checkpoint ทุก 200 steps
    ),
)

trainer.train()

# --- CELL 7: Export GGUF ---
model.save_pretrained_gguf(
    "/kaggle/working/storyweave-gm-7b",
    tokenizer,
    quantization_method="q4_k_m",
)
print("Done! ไฟล์อยู่ที่ /kaggle/working/storyweave-gm-7b-Q4_K_M.gguf")
