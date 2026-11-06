#!/usr/bin/env bash
# Offline clean-clone validation; no clinical stack or credentials.
set -euo pipefail
repo=$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel)
commit=$(git -C "$repo" rev-parse HEAD)
test_root=$(mktemp -d "${TMPDIR:-/tmp}/vgi-clean-clone.XXXXXX")
clone="$test_root/repo"
port=${CLEAN_CLONE_PORT:-5189}
# Use an isolated package store. Fresh Lean builds default to four workers;
# callers can choose a different bound.
export LEAN_NUM_THREADS=${LEAN_NUM_THREADS:-4}
export pnpm_config_store_dir=${pnpm_config_store_dir:-$test_root/pnpm-store}
export PLAYWRIGHT_BROWSERS_PATH=${PLAYWRIGHT_BROWSERS_PATH:-$test_root/browsers}
server_pid=
now_ms() { node -p 'Date.now()'; }
cleanup() {
  result=$?
  trap - EXIT
  if [[ -n "$server_pid" ]]; then
    kill -TERM -- "-$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
  fi
  if [[ $result -ne 0 ]]; then
    echo "Clean-clone test FAILED. Logs retained in $test_root" >&2
    for log in "$test_root/install.log" "$test_root/run.log"; do
      if [[ -f "$log" ]]; then tail -n 45 "$log" >&2; fi
    done
  elif [[ ${KEEP_CLONE:-0} == 1 ]]; then
    echo "Clone and logs retained in $test_root"
  else
    rm -rf "$test_root"
  fi
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Reject an occupied port before starting anything, so a stale server cannot pass.
node --input-type=module - "$port" <<'JS'
import net from 'node:net';
const server = net.createServer();
server.once('error', error => { console.error(error.message); process.exit(1); });
server.listen(Number(process.argv[2]), '0.0.0.0', () => server.close());
JS

echo "Cloning local HEAD $commit into $clone"
git clone --quiet --no-hardlinks --no-checkout "$repo" "$clone"
git -C "$clone" checkout --quiet --detach "$commit"

cd "$clone"
# HEAD after the hackathon has no tracked data. Restore it before install seeds
# the app catalogs/replays it; no dependencies are needed yet.
node scripts/clean-clone-smoke.mjs --extract-data
# No build outputs, dependencies or Emscripten installation are copied.
install_start=$(now_ms)
timeout --kill-after=10s "${INSTALL_TIMEOUT:-900}" bash -c 'make check && CI=true pnpm install --frozen-lockfile && make wasm-check' >"$test_root/install.log" 2>&1
install_ms=$(( $(now_ms) - install_start ))
echo "offline build/install wall time: ${install_ms} ms (fresh build/dependencies; offline)." | tee "$test_root/timings.log"
pnpm --filter app exec playwright install chromium
echo "Install passed; starting make run without API keys on :$port"
run_start=$(now_ms)
setsid timeout --kill-after=10s "${RUN_TIMEOUT:-180}" env ANTHROPIC_API_KEY= OPENAI_API_KEY= make run APP_PORT="$port" >"$test_root/run.log" 2>&1 &
server_pid=$!
ready=0
for ((attempt=0; attempt<120; attempt++)); do
  if ! kill -0 "$server_pid" 2>/dev/null; then
    echo 'make run exited before the app became ready.' >&2
    exit 1
  fi
  if curl -fsS "http://127.0.0.1:$port/" >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
[[ $ready == 1 ]] || { echo 'Timed out waiting for the app.' >&2; exit 1; }
run_ms=$(( $(now_ms) - run_start ))
echo "make run wall time to first HTTP 200: ${run_ms} ms (includes production build)." | tee -a "$test_root/timings.log"
node scripts/clean-clone-smoke.mjs "http://127.0.0.1:$port"
echo "Clean-clone test PASSED at $commit: offline build/install, make run, five EHR banners, dashboard, WASM and local-only replay."
