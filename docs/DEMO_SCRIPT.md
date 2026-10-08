# Monad City — demo recording script

## Recording target

Approximately 2 minutes 20 seconds. This is an editorial target, not a verified hackathon limit.
Adjust to the exact limit shown in the final form. A separate short pitch is in
`docs/SUBMISSION_PACKAGE.md`.

Record actual application interaction and real provider output. No prepared answer should be
shown as a live model response. A finished video has not yet been created.

## Before recording

- Use the current public build when available; verify that its source matches this repository.
- Use a desktop viewport around 1440×900. Start at `#/city` and reset the map.
- Configure your own endpoint/model/key privately, then collapse AI settings. Record no key.
- Confirm that `Show Kuru sources` and the Magma–Switchboard query finish with actual evidence
  and a tool trace. Source selection and number of tool calls may vary; narration must match.
- Keep a local no-key run available for provider failure. Label it local retrieval, and do not
  describe it as a live AI run.

## Screen actions and English narration

| Time | Screen action | Spoken narration |
| --- | --- | --- |
| 0:00–0:15 | Show the city overview and districts. | “Understanding a Monad project often means jumping between directories, documentation, registries, and explorers. Monad City brings project discovery, relationships, and their sources into one interface.” |
| 0:15–0:35 | Ask `Show Kuru sources`. Keep the local result and actual AI tool activity visible. | “I’ll start with Kuru. Local graph retrieval finds the project and controls the map. The optional AI agent uses graph tools to inspect evidence and select relevant records.” |
| 0:35–1:00 | Open the Kuru Passport. Show one Claimed record, its source link, and `Inspect full record`. | “The Passport shows the exact claim, who published it, and what the source supports. Claimed and Observed are distinct. We can inspect the full record and its limitations; one source does not make the whole project verified.” |
| 1:00–1:35 | Ask `Explain the Magma Switchboard declared integration sources`. Expand the returned relationship and its record, then switch Graph View. | “Now I can inspect a documented connection. This record is a publisher's declaration about Magma and Switchboard. The graph shows its endpoints, but the evidence remains bounded: it is not reciprocal confirmation or a live service-health check.” |
| 1:35–1:55 | Ask `Find AI projects with active contracts`. Show `Evidence unavailable`. | “A project can match the AI category without evidence of current activity. Here the Navigator explains that gap. It does not turn a listing or an inferred connection into proof.” |
| 1:55–2:10 | Return to City, open DeFi Overview, briefly show Projects or Evidence. | “The current build contains 176 projects and 193 evidence records. District views help narrow the search. Sourced connections remain separate from illustrative or inferred edges.” |
| 2:10–2:20 | Finish on the city or one clear Passport. | “Monad City gives people a city to explore and agents a graph they can inspect, with the sources and uncertainty kept visible.” |

The AI waits are not guaranteed to fit these slots. If editing removes waiting time, add a simple
“AI response wait shortened” caption to that cut. Do not speed up output to imply latency that
was not observed. If the real query fails, retry outside the recording or include the honest
failure/local-result state.

## What must be visible

1. A city action tied to a query or project selection.
2. A real agent tool call and resulting selected evidence in at least one recorded run.
3. A source record's claim status, source and scope/limitations.
4. A sourced relationship with its precise claim status.
5. The evidence-gap response.

The live agent layer selects 1–3 records. The local result may expose more. Do not promise that
all five Kuru records will appear in the AI selection or a fixed sequence of tool calls.

## Short version if the form limit is tighter

Keep Kuru search → Passport/source disclosure → one relationship in Graph View → evidence gap.
Remove the district tour. Retain the explanation of what the model selects and what the source
can establish.

## Three rehearsal runs

| Run | Mode | Pass condition | Status |
| --- | --- | --- | --- |
| 1 | No provider key / local discovery | City, Passport, source disclosure, districts and Graph work. | Previous QA covers these flows; repeat on public build. |
| 2 | Owner's configured Qwen provider | Real tool calls end in eligible selected records; sources and limits visible. | Source/relationship queries passed previous QA; full timed rehearsal pending. |
| 3 | Final recording conditions | Complete the chosen script, readable screen, actual output, no exposed key. | Pending recording. |

## Export and hosting

Record at 1080p if the capture tool permits, with readable browser zoom and clear narration.
Use a standard MP4 (H.264/AAC) and retain the original recording. Exact file-size and duration
requirements remain pending the official form. The hosted video link must be accessible to
judges without the presenter's account; test that access before entering it in the form.
