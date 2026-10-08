# How Monad City uses a tool-calling AI agent to select ecosystem evidence

Draft implementation article for the submission. It has not been published and is not a
statement that a sponsor bounty's conditions have been met.

Monad City starts with a problem in ecosystem discovery: finding a project is easier than
understanding which statements about it have a source. The interface presents Monad projects
as a city, backed by a structured graph of projects, relationships, and bounded evidence.

## The agent's job

The optional agent selects relevant evidence. It can call four local tools:

- `search_projects`: find named projects or literal capabilities and categories;
- `get_project_evidence`: read approved evidence for an identified project;
- `get_project_relationships`: inspect its typed edges and provenance;
- `get_district_coverage`: read data-derived counts for a district or the full city.

These tools inspect the checked-in graph in the browser. They do not crawl websites, query a
blockchain, execute transactions, or change the snapshot. The provider receives the question
and tool results through an OpenAI-compatible chat-completions API.

## Why final output is a selection

The model returns constrained JSON selecting 1–3 evidence IDs, previously queried coverage, or
an evidence gap. Every selected ID must have been retrieved in that tool conversation and pass
the application's eligibility checks. Unknown IDs, unqueried global IDs, unsupported fields,
and incomplete responses are rejected.

The interface gets factual text from exact source records. It shows the claim, source, claim
status, scope and limitations. AI relevance is still an inference; record validation does not
make the source accurate or current. This design limits fabricated factual prose and citations
without claiming that the model or underlying data cannot be wrong.

## Deterministic map authority

Local structured retrieval determines map selection and relationships to highlight. It remains
available with no key or a failed provider. Unsupported safety conclusions and unmet activity
requirements are handled locally rather than inviting the model to supply a confident answer.
The completion loop is capped at six rounds. Truncated provider output is rejected.

## Actual Qwen path and verification

The current build was tested with `qwen/qwen3.8-max-0902` through OpenRouter, using the owner's
browser configuration. Real queries included Kuru sources and Magma–Switchboard declared
integration sources. The latter selected the exact declaration and a Switchboard capability
record, with the one-sided claim scope preserved. The trace reports actual local tool activity;
it does not reveal or manufacture hidden model reasoning.

Nineteen bounded fixture/dataset tests cover valid multi-round selection, fabricated or
unretrieved IDs, arbitrary prose, unavailable evidence, malformed output, provider errors,
truncation and round limits. The fixtures use artificial credentials and no network. Real
provider checks are recorded separately in `docs/QA_REPORT_2026-10-08.md`.

## Current boundaries

The build is static. Its 193 evidence records cover 172 of 176 displayed projects, with 6 sourced
relationships. Sources commonly support listing or publisher declarations, rather than current
contract activity. The app does not implement document RAG, a live indexer, wallet execution,
model training or automatic evidence refresh.

AI is optional and uses the visitor's own key. The browser stores that key locally and sends it
to the chosen provider; queries and tool results go there too. No shared provider key is part
of the public build. Future shared access would require a separately scoped backend and key
management design.

The next product step is reviewed relationship coverage and evidence refresh, followed by easier
access to the structured graph for other agents. Sponsor eligibility, accepted endpoints/models,
and any article-publication requirements must be checked against the actual bounty rules.
