#!/usr/bin/env bash
# Fuse LoRA adapter เข้า base model, convert เป็น GGUF, และ register กับ Ollama
#
# Usage:
#   bash convert_and_deploy.sh ./lora-adapters
#
# Requirements:
#   - llama.cpp build ไว้ในเครื่อง (สำหรับ convert + quantize)
#   - Ollama running

set -euo pipefail

LORA_DIR="${1:?Usage: bash convert_and_deploy.sh <lora-adapters-dir>}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FUSED_DIR="${SCRIPT_DIR}/fused-model"
GGUF_DIR="${SCRIPT_DIR}/gguf"
MODEL_NAME="storyweave"
BASE_MODEL="mlx-community/Qwen2.5-14B-Instruct-4bit"

# llama.cpp path (override ด้วย env var ถ้าอยู่ที่อื่น)
LLAMA_CPP="${LLAMA_CPP_DIR:-$HOME/llama.cpp}"

# ── 1. Fuse LoRA adapter เข้า base model ────────────────────────────────────
echo "[1/4] Fusing LoRA adapter into base model..."
echo "  Base:    $BASE_MODEL"
echo "  Adapter: $LORA_DIR/adapter"
echo "  Output:  $FUSED_DIR"
echo "  (จะ download base model ถ้ายังไม่มี ~8 GB)"
echo ""

python3 -m mlx_lm fuse \
  --model "$BASE_MODEL" \
  --adapter-path "$LORA_DIR/adapter" \
  --save-path "$FUSED_DIR" \
  --dequantize

echo "Fuse เสร็จแล้ว"

# ── 2. Build llama.cpp ถ้ายังไม่มี ──────────────────────────────────────────
if [ ! -f "$LLAMA_CPP/build/bin/llama-quantize" ]; then
  echo ""
  echo "[2/4] llama.cpp ไม่พบที่ $LLAMA_CPP — clone และ build..."
  git clone https://github.com/ggerganov/llama.cpp "$LLAMA_CPP"
  cmake -B "$LLAMA_CPP/build" -S "$LLAMA_CPP" -DGGML_METAL=ON
  cmake --build "$LLAMA_CPP/build" -j"$(sysctl -n hw.logicalcpu)"
else
  echo "[2/4] llama.cpp พบที่ $LLAMA_CPP — ข้ามการ build"
fi

# ── 3. Convert fused model เป็น GGUF ────────────────────────────────────────
echo ""
echo "[3/4] Converting fused model to GGUF..."
mkdir -p "$GGUF_DIR"

python3 "$LLAMA_CPP/convert_hf_to_gguf.py" \
  "$FUSED_DIR" \
  --outtype f16 \
  --outfile "$GGUF_DIR/model-f16.gguf"

echo "Quantizing to Q4_K_M..."
"$LLAMA_CPP/build/bin/llama-quantize" \
  "$GGUF_DIR/model-f16.gguf" \
  "$GGUF_DIR/model-q4_k_m.gguf" \
  Q4_K_M

# ลบ f16 intermediate file ประหยัด disk
rm "$GGUF_DIR/model-f16.gguf"
echo "GGUF size: $(du -sh "$GGUF_DIR/model-q4_k_m.gguf" | cut -f1)"

# ── 4. Register กับ Ollama ───────────────────────────────────────────────────
echo ""
echo "[4/4] Registering with Ollama as '$MODEL_NAME'..."

MODELFILE="$SCRIPT_DIR/Modelfile"
cat > "$MODELFILE" <<MFEOF
FROM $GGUF_DIR/model-q4_k_m.gguf

TEMPLATE """{{ if .System }}<|im_start|>system
{{ .System }}<|im_end|>
{{ end }}{{ range .Messages }}<|im_start|>{{ .Role }}
{{ .Content }}<|im_end|>
{{ end }}<|im_start|>assistant
"""

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER repeat_penalty 1.1
PARAMETER num_predict 1500
PARAMETER num_ctx 8192
PARAMETER keep_alive 30m
MFEOF

ollama create "$MODEL_NAME" -f "$MODELFILE"

echo ""
echo "สำเร็จ! Model ถูก register เป็น '$MODEL_NAME' แล้ว"
echo ""
echo "ทดสอบ:  ollama run $MODEL_NAME"
echo ""
echo "ใช้ใน game: แก้ route.ts บรรทัด model: \"qwen2.5:14b\"  →  model: \"$MODEL_NAME\""
