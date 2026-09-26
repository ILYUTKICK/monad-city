# Monad City — Model Policy

## Default recommendation

Use `GPT-5.6 Sol` as the lead/orchestrator for the current phase. It is strong enough for product strategy, long-context reasoning, browser work, coordination, and implementation, while being a better default cost/quality balance than using Astra for every turn.

Recommended reasoning effort: `high`.

Use `xhigh` for a difficult architecture decision, a cross-file redesign, or the final product audit. Use `GPT-6 Astra` as a specialist when the task genuinely needs its highest end-to-end visual or reasoning capability.

## Agent routing

| Role | Model | Reasoning | Why |
|---|---|---:|---|
| Lead / orchestrator | `gpt-5.6-sol` | high; xhigh for hard decisions | Owns product intent, resolves conflicts, coordinates agents, reviews final output. |
| Product / architecture | `gpt-5.6-sol` | high or xhigh | Handles ambiguous product decisions, scope, competitor implications, and system boundaries. |
| UX / visual direction | `gpt-6-astra` or `gpt-5.6-sol` | medium/high | Use Astra for the hardest visual or 3D iteration; Sol is sufficient for normal UX work. |
| Trust / data model | `gpt-5.6-sol` | high | Strong enough for evidence semantics, entity relationships, provenance, and edge cases. |
| AI / RAG design | `gpt-5.6-sol` | high | Designs grounded retrieval, graph traversal, answer contracts, and failure behavior. |
| Frontend implementation | `gpt-5.6-terra` | high | Good intelligence/cost balance for focused JS/CSS/UI work with clear acceptance criteria. |
| Browser QA / regression | `gpt-5.6-terra` | medium | Good for repeatable interaction tests, accessibility, responsive checks, and bug isolation. |
| Docs / worklog / small fixes | `gpt-5.6-luna` | low or medium | Use for bounded, well-specified, low-risk tasks. |

## Practical team setup

For the current prototype, use at most four active roles:

1. Lead: Sol high.
2. Visual pass: Astra medium/high for difficult visual work, otherwise Sol high.
3. Trust + AI spec: Sol high, working in docs/data contracts.
4. Frontend + QA: Terra high, after the visual/data contracts are approved.

Do not run multiple agents that edit `src/main.js` or `src/style.css` at the same time. Parallelize documentation, research, and separate data contracts; serialize shared-file implementation.

## When to escalate to Astra

Escalate from Terra/Luna, or from Sol when the task is unusually visual, when:

- the task changes product positioning or MVP scope;
- a visual choice affects the core trust model;
- an agent is unsure whether a claim is evidence or inference;
- several implementation approaches have meaningful tradeoffs;
- the browser prototype needs a coherent multi-step redesign;
- the final demo flow needs an end-to-end review.

## Cost principle

Model routing is about task complexity, not status. Do not use Astra for routine copy edits, repetitive QA, or mechanical documentation. Keep high-cost reasoning for decisions that affect product quality or architecture.

Official API prices are only a relative cost signal here; Codex plan usage is separate from API billing.

## Fallbacks

- If Astra is unavailable: use `gpt-5.6-sol` high for the lead.
- If Sol is unavailable: use `gpt-5.6-terra` high for trust/AI work.
- If Terra is unavailable: use `gpt-5.6-luna` only for bounded implementation or QA, not product architecture.
- Never silently replace a requested model with a materially weaker one for an architecture decision; state the fallback.
