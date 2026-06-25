# ========================================================
# Storyweave GM Fine-tuning — Google Colab (T4 GPU)
# รัน cell ทีละอันตามลำดับ
# ========================================================

# --- CELL 1: ติดตั้ง ---
# !pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
# !pip install --no-deps trl peft accelerate bitsandbytes

# --- CELL 2: โหลด model ---
from unsloth import FastLanguageModel

MAX_SEQ_LENGTH = 4096

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="Qwen/Qwen2.5-7B-Instruct",
    max_seq_length=MAX_SEQ_LENGTH,
    load_in_4bit=True,
)

# --- CELL 3: LoRA ---
model = FastLanguageModel.get_peft_model(
    model,
    r=16,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                    "gate_proj", "up_proj", "down_proj"],
    lora_alpha=16,
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth",
)

# --- CELL 4: โหลด dataset ---
# อัปโหลด rpg_finetune.jsonl ขึ้น Colab ก่อน แล้วรัน cell นี้
from datasets import load_dataset

dataset = load_dataset("json", data_files="rpg_finetune.jsonl", split="train")
print(f"Dataset size: {len(dataset)} examples")

# --- CELL 5: Format สำหรับ chat ---
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

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    dataset_text_field="text",
    max_seq_length=MAX_SEQ_LENGTH,
    dataset_num_proc=2,
    args=TrainingArguments(
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        warmup_steps=10,
        num_train_epochs=3,
        learning_rate=2e-4,
        fp16=not is_bfloat16_supported(),
        bf16=is_bfloat16_supported(),
        logging_steps=10,
        optim="adamw_8bit",
        weight_decay=0.01,
        lr_scheduler_type="linear",
        output_dir="./storyweave-output",
        report_to="none",
    ),
)

trainer.train()

# --- CELL 7: Export GGUF สำหรับ Ollama ---
model.save_pretrained_gguf(
    "storyweave-gm",
    tokenizer,
    quantization_method="q4_k_m",  # ขนาด ~4GB เหมาะสำหรับ Mac
)
print("Export เสร็จ! ไฟล์อยู่ที่ storyweave-gm-Q4_K_M.gguf")
