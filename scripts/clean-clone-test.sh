#!/usr/bin/env bash
# Reuses the named vgi-medplum stack. Never resets, stops or removes its data.
set -euo pipefail
repo=$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel)
commit=$(git -C "$repo" rev-parse HEAD)
test_root=$(mktemp -d "${TMPDIR:-/tmp}/vgi-clean-clone.XXXXXX")
clone="$test_root/repo"
port=${CLEAN_CLONE_PORT:-5189}
server_pid=
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

# setup resets persona passwords if .env is absent. Preserve the installed stack's
# credentials when sharing it; this is local configuration, never committed.
if [[ -f "$repo/.env" ]]; then
  install -m 600 "$repo/.env" "$clone/.env"
  echo 'Reusing vgi-medplum and existing .env credentials; no data reset.'
elif curl -fsS --max-time 3 http://localhost:8103/healthcheck >/dev/null 2>&1; then
  echo 'A Medplum stack is running but this worktree has no .env. Restore its .env before testing, to preserve persona passwords.' >&2
  exit 1
else
  echo 'No running Medplum stack; make install will create the shared vgi-medplum stack.'
fi
cd "$clone"
# No build outputs, dependencies, Emscripten installation or gitignored runs copied.
timeout --kill-after=10s "${INSTALL_TIMEOUT:-900}" make install >"$test_root/install.log" 2>&1
pnpm --filter app exec playwright install chromium
echo "Install passed; starting make run without API keys on :$port"
setsid timeout --kill-after=10s "${RUN_TIMEOUT:-180}" env ANTHROPIC_API_KEY= OPENAI_API_KEY= make run APP_PORT="$port" >"$test_root/run.log" 2>&1 &
server_pid=$!
ready=0
for ((attempt=0; attempt<120; attempt++)); do
  if ! kill -0 "$server_pid" 2>/dev/null; then
    echo 'make run exited before the app became ready.' >&2
    exit 1
  fi
  if curl -fsS "http://127.0.0.1:$port/" >/dev/null; then ready=1; break; fi
  sleep 1
done
[[ $ready == 1 ]] || { echo 'Timed out waiting for the app.' >&2; exit 1; }
pnpm --filter app exec node scripts/clean-clone-smoke.mjs "http://127.0.0.1:$port"
echo "Clean-clone test PASSED at $commit: make install, make run, five EHR banners, dashboard, WASM and local-only replay."
