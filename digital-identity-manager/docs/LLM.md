# LLM assistant

The identity assistant is **optional**. The default configuration
(`LLM_PROVIDER=disabled`) runs the whole application without any LLM, and no
feature is degraded except the assistant itself. Ollama is not used.

GitHub Copilot / Claude used to *develop* this project and an LLM used by the
*running application* are two different things: only the latter is configured
here.

## Providers

`backend/app/llm/`:

| Provider | Class | Configuration |
| --- | --- | --- |
| None (default) | `DisabledProvider` | `LLM_PROVIDER=disabled` |
| Anthropic Claude | `ClaudeProvider` | `LLM_PROVIDER=claude`, `LLM_API_KEY`, `LLM_MODEL` |
| OpenAI | `OpenAIProvider` | `LLM_PROVIDER=openai`, `LLM_API_KEY`, `LLM_MODEL` |

`build_provider()` is the only place that knows about concrete providers, so a
compatible provider can be added by implementing `LLMProvider` and registering it
there. `IdentityAssistant` wraps the provider with the minimisation policy.

`GET /api/ai/status` reports the provider, the model and the capabilities.
When disabled, `POST /api/ai/suggest` returns `409` — never an error page.

## Capabilities

`analyse_results`, `propose_correlations`, `identify_missing_information`,
`propose_searches`, `summarise_findings`, `classify_results`, `explain_score`.

## Hard limits

The assistant may never:

- invent an identity, an account, a URL or an opt-out address;
- turn a hypothesis into a fact;
- modify data a human has confirmed;
- send a deletion request;
- delete anything.

These rules are stated in the system prompt *and* enforced structurally: a
provider can only return `Suggestion` objects. They are written to
`ai_suggestions` with status `SUGGESTED`, and nothing changes in the inventory
until a human calls `POST /api/ai/suggestions/{id}/decision`.

## Data minimisation

Every payload passes through `app/llm/minimization.py` before leaving the
process. See [PRIVACY.md](../PRIVACY.md) for the full policy. In short:

- only the fields the task needs are collected (never a database dump);
- emails are masked by default, phone numbers are masked or removed, addresses
  and birth data are dropped unless explicitly allowed;
- secret-looking keys and values are replaced by `[REDACTED]`;
- strings and lists are truncated;
- only `prompt_context_hash` (SHA-256 of the minimised context) is stored.

The three escape hatches (`LLM_ALLOW_FULL_EMAILS`, `LLM_ALLOW_PHONE_NUMBERS`,
`LLM_ALLOW_ADDRESSES`) default to `false`. Turning one on is a deliberate,
documented decision.

## Typical flow

1. `POST /api/ai/suggest` with an identity and a task.
2. The service builds a task-specific context, minimises it and hashes it.
3. The provider is called; the raw answer is parsed into suggestions.
4. Suggestions are stored (`ai_suggestions`) with provider, model, confidence and
   the context hash.
5. The operator accepts or rejects each one; the decision is audited.

## Cost and failure behaviour

Calls are bounded by `LLM_MAX_OUTPUT_TOKENS` and `LLM_TIMEOUT_SECONDS`. Any
provider error surfaces as a clean API error; scans, correlation and the
dashboard keep working, because none of them depends on the assistant.
