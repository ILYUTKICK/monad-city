# Monad City — Project Intake Pipeline (runbook)

Companion to `docs/ECOSYSTEM_SCALE_PLAN.md` (Phase 5). This is the operational runbook for
taking one project — or a batch — from "exists somewhere on the internet" to "building in the
city with evidence". It reuses the existing evidence workflow; it does not introduce a runtime
backend or change claim semantics.

## 0. Roles

| Step | Role |
| --- | --- |
| Seed & identity | Source Research agent (or owner) |
| Manifest drafting | Source Research agent (LLM-assisted drafting allowed) |
| Evidence proposal | Trust/Data agent |
| Review & approval | Human reviewer (governance policy phase-3.7) |
| Promotion & QA | Evidence Workflow agent + QA agent |

## 1. Seed sources (checked into `data/research/`)

| Source | What it gives | Artifact |
| --- | --- | --- |
| DefiLlama free API — `https://api.llama.fi/protocols` filtered by `chain: "Monad"` | project list, categories, site URLs, TVL/activity signals | `data/research/defillama-monad-<date>.json` |
| Official Monad App Portal — `https://app.monad.xyz/` | canonical app list with taglines, category tags, links, and a "Most Active Apps" gas-usage ranking; server-rendered, parseable without JS | `data/research/monad-app-portal-<date>.json` |
| Official Monad ecosystem directory export | canonical names, categories, links | `data/research/monad-directory-<date>.json` |
| Manual research notes | anything the directories miss | `data/research/manual-<topic>.md` |

Seed artifacts are research inputs, not runtime data. They are dated, checked in, and never
fetched by the browser.

## 2. Per-project intake steps

1. **Identity resolution.** Find the Monad mainnet deployment (contract or verified deployment)
   via an explorer. No deployment → mark `pending`, do not draft a city manifest yet.
2. **Dedup check.** Search existing manifests by alias (name, ticker, domain, address). One
   project = one manifest; add the alias to the existing manifest instead of creating a twin.
3. **Draft manifest** (schema per `docs/EVIDENCE_DATA_CONTRACT.md`): name, district,
   application type, description, site, aliases, deployment address(es). Descriptions must be
   neutral and verifiable — no marketing adjectives, no "official/trusted/safe".
   > Owner decision 2026-09-27: pending groups with no seed-verifiable Monad deployment stay
   > out of the city — manual research for them is closed. They may only enter through
   > onchain-verified deployment evidence (live contract code on chainid 143) via the normal
   > evidence gates. The city records the absence of verifiable evidence; it never labels a
   > group "fake".
4. **Claim candidates.** For each checkable fact, draft an evidence record: exact claim, source
   (title, URL, publisher), retrieval timestamp, scope, limitations. LLM-assisted summarization
   of docs is allowed; the drafted record is labeled as a candidate until human review.
5. **Relationship candidates.** Only with a citable basis: integration named in docs
   (publisher claim), shared registry/onchain reference (source-observed), third-party
   attestation, or similarity (AI-inferred, stays dashed). Record the basis in the proposal.
6. **Emit proposals** through the existing workflow:
   `npm run evidence:prepare` → review → `npm run evidence:snapshot` (see
   `docs/EVIDENCE_SNAPSHOT_WORKFLOW.md` for the exact command sequence).
7. **Human review** applies the phase-3.7 policy: approve, reject, or needs-review per record.
   A record without a human-checked exact source is never approved.
8. **Promote**: `npm run evidence:promote` → new versioned snapshot pair; `npm run build`
   verifies SHA-256; prior snapshot stays as the rollback boundary.
9. **City layout**: assign illustrative placement in the project's district (placement is
   layout only, never ranking or endorsement); update district capacity if needed.
10. **QA**: desktop + narrow flows, Navigator query that touches the new project, WORKLOG note.

## 3. Batch discipline

- Batches are sized to one governance window (30 → 100 → full sweep; see scale plan §5).
- A batch is done when every proposal in it has a review decision and the promoted snapshot
  passes `npm run evidence:governance-check`.
- No batch mixes "add projects" and "change claim semantics" — semantic changes are separate
  proposals.

## 4. Explicit non-goals

- No runtime fetching: the browser only ever reads promoted snapshots.
- No auto-import of directory text as approved claims: directories are seeds; claims come from
  the project's own docs or another exact source.
- No ranking signals in placement, size, or order — evidence status is the only visual
  distinction, per the trust model.
- No claim flow / wallet attribution (Phase 4 remains deferred).
