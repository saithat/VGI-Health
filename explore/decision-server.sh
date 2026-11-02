#!/bin/sh
set -eu
export TMPDIR=/home/saithat/Projects/run-tmp
export UV_CACHE_DIR="$TMPDIR/uv-cache"
export XDG_CACHE_HOME="$TMPDIR/cache"
export HF_HOME="$TMPDIR/huggingface"
export MPLCONFIGDIR="$TMPDIR/matplotlib"
export SKB_DATA_DIRECTORY="$TMPDIR/skrub"
export OMP_NUM_THREADS=2
export TOKENIZERS_PARALLELISM=false
venv="$TMPDIR/explore-venv"
engine="${DECISION_ENGINE:-cpu}"
model="${DECISION_MODEL:-HuggingFaceTB/SmolLM2-135M-Instruct}"
revision="${DECISION_REVISION:-12fd25f77366fa6b3b4b768ec3050bf629380bac}"
if [ "$engine" = cpu ]; then
  exec "$venv/bin/python" explore/decision_server.py --model "$model" --revision "$revision" "$@"
elif [ "$engine" = vllm ]; then
  # Run on the host with a working NVIDIA driver. Install vLLM explicitly first.
  "$venv/bin/python" explore/verify_model.py "$model" "$revision"
  exec "$venv/bin/vllm" serve "$model" --revision "$revision" --host 127.0.0.1 --port 8787 \
    --gpu-memory-utilization 0.65 --max-model-len 2048 --max-num-seqs 4 "$@"
else
  echo 'DECISION_ENGINE must be cpu or vllm' >&2; exit 2
fi
