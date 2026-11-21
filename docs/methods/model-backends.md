# Model backends

[Overview](../../README.md) · [Methods and reproduction](../../README.md#documentation)

The live hill-climbing loop uses Codex. Recorded sessions support replay.

The standalone safety challenge accepts `--backend claude|codex|openai-compat|replay` and
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
Recorded historical model comparisons and their full method are preserved in the [pre-cleanup snapshot](https://github.com/saithat/VGI-Health/blob/pre-cleanup-2026-11-20/docs/methods/model-backends.md).
