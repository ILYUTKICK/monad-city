#!/usr/bin/env node
// Refresh pass 1 — source availability findings for the approved phase-3.5-v4 projection.
//
// docs/REFRESH_RUNBOOK.md step 1: re-check that every approved record's source is still live
// and still supports the record's bounded scope. This script performs the mechanical part and
// emits FINDINGS ONLY — no review status changes, no payload edits. Decisions (approve/stale/
// successor) belong to the human review sequence through the evidence workflow CLI.
//
// Scope hints are informational:
//  - registry records (api.llama.fi/protocols): is the protocol still listed on Monad now,
//    and does its current category still match the claimed one?
//  - App Portal records: does the project name appear in the current server-rendered HTML?
//  - stable-artifact URLs (explorer tx pages): liveness only — the hash is the identifier.
//
// Output: data/research/refresh-availability-<UTC-date>.json (exclusive creation). Research
// artifact only: never fetched by the browser, never promoted, asserts no new claims.

import fs from 'node:fs';
import path from 'node:path';

const SNAPSHOT = 'data/evidence-snapshots/phase-3.5-v4.json';
const UA = 'monad-city-research/1.0 (build-time refresh pass; no runtime fetching)';

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out') { options.out = argv[i + 1]; i += 1; }
  }
  return options;
}

async function fetchUrl(url, { timeoutMs = 20000 } = {}) {
  const finding = { httpStatus: null, contentType: null, classification: 'unreachable', detail: null, bytes: null };
  try {
    const res = await fetch(url, {
      headers: { accept: 'application/json, text/html;q=0.9,*;q=0.8', 'user-agent': UA },
      signal: AbortSignal.timeout(timeoutMs),
    });
    finding.httpStatus = res.status;
    finding.contentType = res.headers.get('content-type');
    const buffer = await res.arrayBuffer();
    const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    finding.bytes = buffer.byteLength;
    if (res.status === 403 || res.status === 429) {
      finding.classification = /just a moment|challenge|cloudflare/i.test(text) ? 'bot-challenge' : 'http-error';
      finding.detail = text.replace(/\s+/g, ' ').slice(0, 140);
    } else if (res.status >= 500) {
      finding.classification = 'server-error';
      finding.detail = text.replace(/\s+/g, ' ').slice(0, 140);
    } else if (res.status >= 400) {
      finding.classification = 'not-found';
      finding.detail = text.replace(/\s+/g, ' ').slice(0, 140);
    } else if (/json/.test(finding.contentType ?? '')) {
      try { JSON.parse(text); finding.classification = 'json-ok'; } catch { finding.classification = 'non-json'; }
    } else {
      finding.classification = 'html-ok';
    }
    return { finding, text };
  } catch (error) {
    finding.detail = String(error.cause?.code ?? error.message).slice(0, 140);
    return { finding, text: '' };
  }
}

function unescapeHtml(value) {
  return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\"/g, '"');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
  const records = snapshot.records;
  const reviewedAtUtc = snapshot.reviewedAt;
  const generatedAtUtc = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const dateStamp = generatedAtUtc.slice(0, 10);

  const outPath = path.resolve(
    options.out ?? path.join('data', 'research', `refresh-availability-${dateStamp}.json`),
  );
  if (!outPath.startsWith(path.resolve('data', 'research') + path.sep)) {
    throw new Error('refusing to write outside data/research/');
  }
  if (fs.existsSync(outPath)) {
    throw new Error(`refusing to overwrite ${outPath} (exclusive creation; pass --out with a fresh suffix)`);
  }

  // ---- source-level probes (one per unique URL) ----
  const byUrl = new Map();
  records.forEach((record) => {
    const url = record.source.url;
    if (!byUrl.has(url)) byUrl.set(url, []);
    byUrl.get(url).push(record);
  });

  const sourceFindings = [];
  let llamaMonadNow = null;
  let portalHtml = '';

  for (const [url, group] of byUrl) {
    const { finding, text } = await fetchUrl(url, { timeoutMs: url === 'https://api.llama.fi/protocols' ? 45000 : 20000 });
    const row = { url, recordCount: group.length, referenceType: group[0].source.referenceType, ...finding };

    if (url === 'https://api.llama.fi/protocols' && finding.classification === 'json-ok') {
      const protocols = JSON.parse(text);
      llamaMonadNow = new Map();
      for (const protocol of protocols) {
        if (Array.isArray(protocol.chains) && protocol.chains.includes('Monad')) {
          llamaMonadNow.set(String(protocol.name).toLowerCase(), {
            slug: protocol.slug,
            category: protocol.category ?? null,
          });
        }
      }
      row.monadListingsNow = llamaMonadNow.size;
    }
    if (url === 'https://app.monad.xyz/' && finding.classification === 'html-ok') {
      portalHtml = text;
      row.serverRenderedHint = /self\.__next_f/.test(text) ? 'next-flight-payload-present' : 'no-flight-payload';
    }
    sourceFindings.push(row);
    console.log(`probed ${url} -> ${finding.classification} (${finding.httpStatus})`);
  }

  // ---- per-record findings ----
  const recordFindings = records.map((record) => {
    const row = {
      id: record.id,
      projectId: record.projectId,
      sourceUrl: record.source.url,
      sourceClassification: sourceFindings.find((s) => s.url === record.source.url)?.classification ?? 'unprobed',
      reviewStatus: record.reviewStatus,
      reviewedAt: record.reviewMetadata?.reviewedAt ?? record.reviewedAt,
      finding: null,
    };

    if (record.source.url === 'https://api.llama.fi/protocols' && llamaMonadNow) {
      const nameMatch = record.claim.match(/registry lists\s+(.+?)\s+in the '([^']+)'/)
        ?? record.claim.match(/registry lists\s+(.+?)\s+in the “([^”]+)”/);
      const name = nameMatch ? nameMatch[1] : null;
      const claimedCategory = nameMatch ? nameMatch[2] : null;
      const now = name ? llamaMonadNow.get(name.toLowerCase()) : undefined;
      if (now) {
        row.finding = now.category === claimedCategory
          ? 'still-listed: protocol currently listed on Monad with the claimed category'
          : `still-listed-category-drift: current category '${now.category}' differs from claimed '${claimedCategory}' (capture-instant claim unaffected)`;
      } else {
        row.finding = 'not-listed-now: protocol not currently in the Monad chain set (capture-instant claim unaffected; freshness decays)';
      }
      row.subjectNow = now ? { slug: now.slug, category: now.category } : null;
    } else if (record.source.url === 'https://app.monad.xyz/' && portalHtml) {
      const nameMatch = record.claim.match(/App Portal listed\s+(.+?)\s+in\s/);
      const name = nameMatch ? nameMatch[1] : record.claim.match(/App Portal listed\s+(.+?)\s+as\s/)?.[1] ?? null;
      const present = name ? portalHtml.includes(unescapeHtml(name)) : null;
      row.finding = present === null
        ? 'name-not-parsed: claim shape did not expose a directory name'
        : present
          ? 'name-present-in-html: project name appears in the current portal payload'
          : 'name-not-found-in-html: name absent from current portal payload (capture-instant claim unaffected; listing may have changed)';
    } else if (record.source.referenceType === 'stable-artifact-url') {
      row.finding = row.sourceClassification === 'html-ok' || row.sourceClassification === 'json-ok'
        ? 'artifact-url-live: stable artifact page reachable'
        : `artifact-url-issue: ${row.sourceClassification}`;
    } else {
      row.finding = row.sourceClassification === 'html-ok' || row.sourceClassification === 'json-ok'
        ? 'source-live'
        : `source-issue: ${row.sourceClassification}`;
    }
    return row;
  });

  const summary = {
    records: records.length,
    uniqueSources: sourceFindings.length,
    sourceClassifications: sourceFindings.reduce((acc, s) => { acc[s.classification] = (acc[s.classification] ?? 0) + 1; return acc; }, {}),
    recordFindings: recordFindings.reduce((acc, r) => {
      const key = r.finding.split(':')[0];
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  };

  const artifact = {
    kind: 'monad-city-research-refresh-availability',
    schemaVersion: '1',
    generatedAtUtc,
    snapshotVersion: 'phase-3.5-v4',
    snapshotReviewedAt: reviewedAtUtc,
    method: 'Plain HTTPS GET per unique approved source URL (dependency-free Node fetch). Registry sources additionally cross-checked against the current Monad chain set; App Portal records name-searched in the current server-rendered payload. Findings only — no review status changed here.',
    summary,
    sourceFindings,
    recordFindings,
    note: 'Availability findings for the refresh runbook. A bot challenge on a stable-artifact or mutable URL is a reachability finding, not proof that a source is unavailable. Decisions happen only through the evidence workflow CLI with explicit human review.',
  };

  fs.writeFileSync(outPath, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(`\nRefresh artifact written: ${outPath}`);
  console.log(JSON.stringify(summary, null, 1));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
