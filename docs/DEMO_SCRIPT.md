# Monad City — 60–90 second demo

## Recording setup

- Open [monad-city.vercel.app](https://monad-city.vercel.app/) at `#/city`, reset the view, and confirm the deployed build exposes the v9 publication check before recording.
- The core flow uses the deterministic local Navigator and works without an AI provider key. Do not describe this keyless flow as “live AI.”
- If a separate sponsor take requires provider-backed AI, configure the endpoint, model, and user key privately, then collapse settings before recording. The provider selects eligible evidence IDs retrieved in that run; local retrieval still controls the map and evidence context.
- Rehearse the Beefy → Kintsu path once so the exact record is already familiar.

## Timed screen actions and narration

### 0:00–0:10 — Establish the city

**Screen:** Start in **City** view and let the district labels settle.

**Say:** “Monad City helps you understand the Monad ecosystem. Each building is a project, and every sourced connection can be traced to its evidence.”

### 0:10–0:22 — Find Beefy with the local Navigator

**Screen:** Open **Navigator**, enter `Beefy`, and select the result so the city and Passport focus Beefy.

**Say:** “Let’s find Beefy. Local search works without an API key and brings the map and project Passport to the same result.”

### 0:22–0:38 — Inspect the Beefy–Kintsu connection

**Screen:** Open **Connections**. On the **Kintsu** card, expand **Evidence** without using the project-jump button, so Beefy stays selected.

**Say:** “Here Beefy’s saved configuration includes sMON, whose published address maps to Kintsu. This is a documented asset dependency, labelled Claimed because it comes from the publisher’s configuration.”

### 0:38–0:55 — Open the source and full record

**Screen:** In the expanded evidence, show the Beefy configuration source link, then expand **Full record** for `E-BEEFY-KINTSU-ASSET-001`.

**Say:** “I can inspect the exact claim, named publisher, source link, and limitations. The record distinguishes that asset dependency from a broader partnership claim.”

### 0:55–1:08 — Check the real v9 Testnet publication

**Screen:** In **Onchain publication**, click **Check publication** and wait for the real result. Hold on the displayed Testnet block and match state.

**Say:** “Now the app checks this record against its published snapshot on Monad Testnet. The returned block confirms exact inclusion; source accuracy and freshness still require separate review.”

### 1:08–1:20 — Close on the focused graph

**Screen:** After the record check, use the **Kintsu** connection button to follow the project. Switch to **Graph**; its **Project** neighborhood shows just Kintsu and Beefy, with their sourced connection.

**Say:** “Following Kintsu opens the same sourced connection in Graph view. People explore the city; sources explain the graph.”

Target recording length: about 75–85 seconds including clicks and the RPC wait. The narration is 139 words; rehearse at your own pace.

## Required proof points in frame

1. `Beefy` search result, focused city, and synchronized Passport.
2. Beefy → Kintsu connection with **Claimed · publisher-claimed** visible.
3. Exact relationship scope and limitations.
4. Source publisher and expanded **Full record**.
5. A real v9 **Check publication** result with the inspected Testnet block.
6. Kintsu **Project** focus in Graph view with Beefy visible.

## Optional provider-backed AI insert

Use this only when a bounty or submission category requires visible provider-backed AI. After the local Beefy result, run the configured provider and show its actual tool trace or eligible project selection. Describe it as an optional agent layer over the same bounded retrieval and evidence records. Do not stage an answer or promise a fixed model result. Allow 10–15 extra seconds.

The submission portal displayed a three-minute technical-demo cap on October 8, 2026. Treat that as historical context and recheck the portal before upload.

## Короткие заметки для записи

- Не говорить, что проект целиком “verified”: статусы относятся только к конкретному утверждению и источнику.
- Если RPC недоступен или ответ неокончательный, оставить честный статус в кадре либо перезаписать позже. Не имитировать успешную проверку.
- После **Check publication** дождаться настоящего результата; паузу можно сократить монтажом, но текст результата не подменять.
- Перед записью проверить читаемость текста, отсутствие ключа в кадре и доступность внешней страницы источника.

## Rehearsal — 2026-10-12

The built candidate was rehearsed without an AI provider key at `http://127.0.0.1:5173/`.
Beefy search, Kintsu relationship, exact full record and its publication check passed.
`E-BEEFY-KINTSU-ASSET-001` matched the active publication at Testnet block `70379100`.
Following Kintsu produced the two-node Beefy/Kintsu Graph neighborhood. The default Beefy
focus shows only six neighbors, so it does not initially include Kintsu; the final step above
uses the verified shorter route instead of assuming all 17 connections are visible.
This was an interaction rehearsal, not a finished video or a timed live-provider take.
The public alias still serves v7 until the reviewed candidate is released.
