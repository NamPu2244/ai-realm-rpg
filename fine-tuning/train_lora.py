"""
LoRA fine-tuning สำหรับ Apple Silicon (M1/M2/M3/M4/M5) ด้วย MLX

ใช้ mlx-lm ซึ่งเป็น framework ของ Apple เองที่ optimize สำหรับ Unified Memory
รองรับ Qwen2.5-14B ได้ดีบน MacBook Pro M5 24GB

Usage:
    python train_lora.py --dataset dataset.jsonl --output ./lora-adapters
    python train_lora.py --dataset dataset.jsonl --output ./lora-adapters --iters 600 --layers 16
"""

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path


BASE_MODEL = "mlx-community/Qwen2.5-14B-Instruct-4bit"


def prepare_mlx_data(input_jsonl: str, output_dir: Path) -> None:
    """
    แปลง dataset.jsonl เป็น format ที่ mlx_lm.lora ต้องการ:
    - data/train.jsonl  (90%)
    - data/valid.jsonl  (10%)
    แต่ละ line คือ {"messages": [...]} ซึ่ง generate_dataset.py ออกมาแล้ว
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    examples = []
    with open(input_jsonl, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                examples.append(json.loads(line))

    if len(examples) < 10:
        raise ValueError(f"Dataset too small: {len(examples)} examples (need at least 10)")

    split = max(1, len(examples) // 10)
    train_examples = examples[split:]
    valid_examples = examples[:split]

    def write_jsonl(path: Path, data: list) -> None:
        with open(path, "w", encoding="utf-8") as f:
            for ex in data:
                f.write(json.dumps(ex, ensure_ascii=False) + "\n")

    write_jsonl(output_dir / "train.jsonl", train_examples)
    write_jsonl(output_dir / "valid.jsonl", valid_examples)
    print(f"  train: {len(train_examples)} examples")
    print(f"  valid: {len(valid_examples)} examples")


def main():
    parser = argparse.ArgumentParser(description="LoRA fine-tune Qwen2.5-14B บน Apple Silicon")
    parser.add_argument("--dataset", type=str, required=True, help="Path to dataset.jsonl จาก generate_dataset.py")
    parser.add_argument("--output", type=str, default="./lora-adapters", help="Output directory สำหรับ LoRA adapter")
    parser.add_argument("--iters", type=int, default=500, help="จำนวน training iterations (แนะนำ 400-800)")
    parser.add_argument("--layers", type=int, default=8, help="จำนวน transformer layers ที่จะ apply LoRA (8=ประหยัด memory, 16=ดีกว่า)")
    parser.add_argument("--batch-size", type=int, default=1, help="Batch size (1 ประหยัด memory ที่สุด)")
    parser.add_argument("--lr", type=float, default=1e-5, help="Learning rate (แนะนำ 1e-5 ถึง 2e-5)")
    parser.add_argument("--rank", type=int, default=4, help="LoRA rank (4=ประหยัด memory, 8=ดีกว่า)")
    args = parser.parse_args()

    output_path = Path(args.output)
    data_dir = output_path / "data"

    print(f"[1/3] เตรียม dataset จาก {args.dataset}...")
    prepare_mlx_data(args.dataset, data_dir)

    print(f"\n[2/3] โหลด model: {BASE_MODEL}")
    print("  (ถ้ายังไม่มีในเครื่องจะ download อัตโนมัติ ~8 GB)")

    adapter_path = output_path / "adapter"
    adapter_path.mkdir(parents=True, exist_ok=True)

    # LoRA hyperparameters ต้องส่งผ่าน YAML config ใน mlx-lm >= 0.20
    config_path = output_path / "lora_config.yaml"
    config_path.write_text(
        f"model: \"{BASE_MODEL}\"\n"
        f"train: true\n"
        f"data: \"{data_dir}\"\n"
        f"iters: {args.iters}\n"
        f"batch_size: {args.batch_size}\n"
        f"num_layers: {args.layers}\n"
        f"learning_rate: {args.lr}\n"
        f"adapter_path: \"{adapter_path}\"\n"
        f"val_batches: 5\n"
        f"save_every: 100\n"
        f"steps_per_report: 10\n"
        f"max_seq_length: 2048\n"
        f"lora_parameters:\n"
        f"  rank: {args.rank}\n"
        f"  alpha: {args.rank}\n"
        f"  dropout: 0.05\n"
        f"  scale: 10.0\n"
        f"grad_checkpoint: true\n"
    )

    # python -m mlx_lm lora (space, ไม่ใช่ dot — deprecated ใน >= 0.20)
    cmd = [sys.executable, "-m", "mlx_lm", "lora", "-c", str(config_path)]

    print("\n[3/3] เริ่ม training...")
    print(f"  model:      {BASE_MODEL}")
    print(f"  iters:      {args.iters}")
    print(f"  layers:     {args.layers}")
    print(f"  batch size: {args.batch_size}")
    print(f"  lr:         {args.lr}")
    print(f"  rank:       {args.rank}")
    print(f"  output:     {adapter_path}")
    print()

    result = subprocess.run(cmd, check=False)
    if result.returncode != 0:
        print("\nERROR: Training failed. ตรวจสอบ error ด้านบน", file=sys.stderr)
        sys.exit(1)

    print(f"\nTraining เสร็จแล้ว! Adapter อยู่ที่: {adapter_path}")
    print("\nขั้นตอนต่อไป — Fuse adapter เข้า base model:")
    print(f"  python -m mlx_lm fuse --model {BASE_MODEL} --adapter-path {adapter_path} --save-path {output_path}/fused-model --dequantize")
    print("\nจากนั้น convert เป็น GGUF:")
    print(f"  bash convert_and_deploy.sh {output_path}/fused-model")


if __name__ == "__main__":
    main()
