# Model backends and frozen-night comparisons

[Overview](../../README.md) · [Methods and reproduction](../../README.md#documentation)

Night commands accept `--backend claude|codex|openai-compat|replay` and
`--model <id>`. `openai-compat` uses built-in fetch against a Chat Completions
endpoint, including vLLM, llama.cpp server, Ollama, OpenRouter, Together and
OpenAI. Set the API base including its version path, e.g.
`OPENAI_COMPAT_BASE_URL=http://127.0.0.1:8000/v1`; the backend appends
`/chat/completions`. It requires an explicit `--model` or
`OPENAI_COMPAT_MODEL` and refuses an unrecorded server default.

| Environment variable | Meaning |
|---|---|
| `OPENAI_COMPAT_BASE_URL` | Required HTTP(S) API base; no embedded credentials, query or fragment. |
| `OPENAI_COMPAT_API_KEY` | Optional bearer key; omit for unauthenticated local servers. Never included in recordings or error bodies. |
| `OPENAI_COMPAT_MODEL` | Required unless `--model` supplies the requested model ID. |
| `OPENAI_COMPAT_MAX_TOKENS` | Optional positive integer output limit, sent as `max_tokens`; otherwise the server selects its limit. |
| `OPENAI_COMPAT_TEMPERATURE` | Optional sampling temperature from 0 to 2; otherwise the server default. |
| `OPENAI_COMPAT_SCHEMA_MODE` | `json_schema` (default), `json_object`, or `prompt`. |
| `OPENAI_COMPAT_TIMEOUT_MS` | Per-attempt timeout, including response-body reading; default 1,200,000 ms. |
| `OPENAI_COMPAT_RETRIES` | Additional attempts for HTTP 429/5xx only; default 2, maximum 4. |

`json_schema` sends `response_format: {type: "json_schema", json_schema:
{name, schema, strict: true}}`. `json_object` sends
`response_format: {type: "json_object"}` and appends the schema to the user
message. `prompt` appends the schema without sending `response_format`, for
servers without constrained decoding. All modes validate JSON locally against
the request schema using the installed Zod JSON Schema converter. Unsupported
schema constructs fail before the call. There is no coercion, JSON extraction,
code-fence removal or repair; complete `<think>…</think>` blocks are stripped
before parsing. Truncation (`finish_reason=length`), refusals and tool finishes
fail. Retry waits honor `Retry-After` within a ten-second cap; outer loop and
recording retries do not multiply this transport's budget. Responses record the
requested model, response `model` as `servedBy`, raw usage and `finishReason`;
recording/replay preserves the new backend's provenance. Replay retains usage
in the original recording and does not charge it as new usage. Dashboard labels
render the recorded backend name directly. The backend enum extension lives in the
review-only evidence schema; the base schema used by certified rendering stays
byte-identical.

The `claude` backend (Anthropic SDK, four SDK retries) treats a 429 that
remains after those retries as an exhausted rate limit. It raises a
`UsageLimitError`, an infrastructure error and never `llm-error`.
`proposal-quality` then pauses the run, which resumes with `--resume`; see
[Usage limits pause the run](harness-night.md#usage-limits-pause-the-run).

Real night prompts are roughly 347K characters (about 90K input tokens). A local
model needs **≥ ~100K context**, with additional room for output and tokenizer
variation. The 12,288-token local test server is suitable only for tiny transport
probes. In live use, every proposal still passes the same checker and validation
gates before deployment; changing the model or schema mode bypasses no gate.

`agent/src/model-compare.ts` reissues the recorded nightly propose prompts,
without reconstructing their evidence or running a deployment. It reuses
`quality.ts` frozen input reconstruction, the production proposal decoder,
`evaluateCandidate` and `TrainEstimator`, and the existing idea-identity rule.
It copies source programs, decisions, calls, days, frozen specifications, world
and fixtures into a new directory below `TMPDIR`; the source run is read-only.
Native operations use frozen specifications and the copied world/fixtures.
Set `EHR_BIN` to an already-built binary; this command never builds Lean.

```sh
export TMPDIR="${TMPDIR:?Set disk-backed TMPDIR}" CI=true
export EHR_BIN=./lean/.lake/build/bin/ehr
export OPENAI_COMPAT_BASE_URL=https://your-endpoint.example/v1
export OPENAI_COMPAT_MODEL=your-long-context-model
# Set OPENAI_COMPAT_API_KEY in the environment if the endpoint requires it.
pnpm --filter agent exec tsx src/model-compare.ts \
  --source runs/core-10day \
  --backend openai-compat --model "$OPENAI_COMPAT_MODEL" \
  --nights 1-9 --personas P1,P5 --out "$TMPDIR/model-compare/long-context"
```

Use `--backend replay` with a fresh output label for an exact self-check: saved
responses and their recomputed native scores must match the recorded-reference
arm. Reference calls must originate from Codex. Legacy recordings recover the
named historical proposal/choice schema; request sidecars, when present, supply
the exact schema and must match the saved prompt bytes. Unknown schemas fail
closed. `--choose` also reissues the saved choose prompts against their original
candidate menus: these are independent chooser probes, not selections among the
new proposals. Migration and feature-surfacing decisions are listed as excluded;
missing requested nights/personas fail. `--world <dir>` selects restored source
world inputs when the manifest's path is unavailable.

Each output contains `binding.json`, native transcripts, recorded model calls,
`report.json` and `report.md`. Per-call schema validity and per-candidate checker
status/property, undecodable patches, density-only edits, earlier idea duplicates
and train-day savings are reported beside the recorded Codex reference. Counts
exclude seeded probes. Production's five-candidate decoding limit is retained;
returned and ignored counts are both explicit. Density-only identifies the
historical dead-move class; it does not assert zero effect in the current renderer.
Both arms are rescored with native train simulations over the most recent two
training days. These estimates use native scroll counts and leave browser pixel
metrics unavailable; historical browser-measured estimates are retained separately
in JSON. Model/schema failures remain per-call evidence; native infrastructure
failures abort. No browser geometry, screen checks, held-out validation, repairs
or deployment run in this harness. The comparison measures proposal pre-screen
quality on frozen inputs, not release acceptance or compounding nightly benefit.
The existing `proposal-quality` A/B/D experiment also accepts the new backend;
its query-tool arm C remains restricted to Codex/replay.
