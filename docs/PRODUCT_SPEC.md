# Monad City — Product Specification

## Core job to be done

When someone wants to understand or navigate Monad, help them discover a relevant project, understand what it does, and see why the system believes the information.

## Main user journeys

### Journey A — Guided onboarding

1. User opens Monad City.
2. User asks: “I’m new to Monad. Show me what I can do here.”
3. Navigator presents a short path through relevant districts.
4. Map highlights one or more buildings.
5. User opens a Passport and follows a relationship to the next project.

### Journey B — Goal-based discovery

1. User asks for a capability, for example: “Find lending projects with active contracts.”
2. Navigator retrieves matching projects from structured data and documents.
3. The map focuses the relevant district and highlights candidates.
4. The answer lists evidence and uncertainty.
5. User compares two Passports.

### Journey C — Project understanding

1. User selects a building.
2. Passport shows overview, facts, evidence, and relationships.
3. User asks a project-specific question.
4. Navigator answers from the project manifest and cited sources.

### Journey D — Relationship inspection

1. User opens Graph View or selects a connection in a Passport.
2. The relationship is highlighted.
3. The interface states the relationship type and evidence.
4. AI explains the relationship in plain language.

## Information architecture

### Header

- Monad City brand;
- one-line product explanation;
- Explore City;
- About the graph;
- current data mode: Demo or Live.

### AI Navigator

Must support:

- free-text query;
- a small number of useful suggested prompts;
- result summary;
- highlighted buildings and/or relationships;
- source/evidence affordance;
- clear “no result” state.

It must not look like a generic chat window with a long transcript as the primary UI.

### City View

- districts;
- project buildings;
- relationship lines;
- selected project state;
- lightweight map controls;
- visible legend;
- no decorative elements that compete with project names or links.

### Graph View

- projects as nodes;
- typed relationships as edges;
- edge state and provenance;
- selected path or neighborhood;
- ability to return to City View.

### Project Passport

Required sections:

1. Identity: name, category, short description.
2. Status: Observed, Claimed, Attested, AI-inferred.
3. Evidence: source, timestamp, contract/address/event where applicable.
4. Relationships: connected projects, relationship type, evidence state.
5. Sources: project website, docs, explorer, repository, attestations.
6. Ask about this project.

## MVP scope

### Must have

- one stable city screen;
- 8–12 curated projects;
- 4–5 districts;
- one grounded Navigator query;
- clickable buildings;
- Passport with evidence structure;
- typed relationship display;
- City/Graph toggle;
- a truthful Demo data mode.

### Should have

- a guided tour for newcomers;
- one animated event, such as a new project entering construction;
- a machine-readable manifest endpoint or export;
- responsive mobile layout.

### Not in MVP

- full ecosystem coverage;
- arbitrary AI-generated 3D geometry at runtime;
- autonomous transactions;
- tokenomics or trading recommendations;
- complex founder governance;
- a full production indexer;
- a custom foundation model.

## Acceptance criteria

- A user can reach a useful answer in three interactions or fewer.
- Every visible trust state has a definition.
- Every “verified” relationship in live mode has an evidence object.
- Demo mode clearly labels illustrative data.
- The selected building, Passport, and Navigator result always stay synchronized.
- Keyboard users can select buildings and use the main controls.

