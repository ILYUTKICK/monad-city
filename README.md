# Monad City

A dependency-free visual prototype of an AI-readable ecosystem trust graph, presented as an interactive isometric city.

## Project context

Read [AGENTS.md](AGENTS.md) before making changes. The product definition and implementation context live in:

- [Project Context](docs/PROJECT_CONTEXT.md)
- [Product Spec](docs/PRODUCT_SPEC.md)
- [Visual Direction](docs/VISUAL_DIRECTION.md)
- [Trust Model](docs/TRUST_MODEL.md)
- [AI Navigator](docs/AI_NAVIGATOR.md)
- [Evidence Data Contract](docs/EVIDENCE_DATA_CONTRACT.md)
- [Evidence Snapshot Workflow](docs/EVIDENCE_SNAPSHOT_WORKFLOW.md)
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)
- [Model Policy](docs/MODEL_POLICY.md)
- [Demo Script](docs/DEMO_SCRIPT.md)
- [Worklog](docs/WORKLOG.md)
- [External Agent Handoff](HANDOFF.md)

## Run

Requires Node.js 18 or later. No installation needed.

```sh
npm run dev
```

Open http://localhost:5173. `npm run build` first verifies that the approved JSON evidence snapshot
exactly matches its promoted runtime module, then creates the static `dist/` directory;
`npm run preview` serves it.

## Explore

- Select buildings with a click or keyboard to update the Project Passport.
- Follow passport connections to navigate between projects.
- Filter five districts or search project names, districts, and types.
- Use the deterministic local AI Navigator to search projects, capabilities, relationships, and evidence.
- Drag to pan, zoom, reset, switch between city and graph, or toggle relationships.
- Open About the graph for state definitions.

The app uses a hybrid static dataset: 22 approved source-backed evidence records and six sourced
relationships for a bounded six-entity subset, alongside visibly separate illustrative Demo
fallbacks. Every sourced claim remains limited to its cited scope; approval is not project-wide
verification or endorsement. Project profile copy, placement, and state patterns remain Demo unless
an exact evidence record says otherwise. No live indexer, wallet, blockchain connection,
application backend, external API, or real AI is implemented. The Node server only serves static
files. Typography uses Google Fonts with local sans-serif fallbacks.
