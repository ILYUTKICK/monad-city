#!/usr/bin/env node
// Build-time research tooling only. Never imported or fetched by the browser.
//
// Captures the official Monad App Portal (https://app.monad.xyz/) into a dated seed artifact
// under data/research/ for the ecosystem intake pipeline (docs/PROJECT_INTAKE_PIPELINE.md).
//
// The page is server-rendered: the full app directory, featured sections, and the
// "Most Active Apps" gas-usage ranking arrive inside the static HTML as React flight chunks
// (`self.__next_f.push(...)`). This script extracts those payloads statically — no JavaScript
// is executed, no browser is driven.
//
// The artifact is a research seed, not an evidence snapshot: nothing here is a claim,
// verification, or endorsement. Facts drafted from it stay outside any snapshot until a
// human records an approved review decision.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const SOURCE_URL = 'https://app.monad.xyz/';

function utcDateStamp(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const options = { out: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') {
      options.out = argv[i + 1];
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function assertExclusiveOutput(outPath) {
  if (fs.existsSync(outPath)) {
    throw new Error(
      `Refusing to overwrite existing artifact: ${outPath}. ` +
        'Seed artifacts are dated and immutable; delete the stale file by hand or pick a new path.',
    );
  }
}

function canonicalJson(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

// The static HTML ships the app data as escaped string payloads inside
// `self.__next_f.push([1,"..."])` calls. Concatenate and unescape them without executing.
function extractFlightText(html) {
  const chunks = [...html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)].map(
    (match) => match[1],
  );
  if (chunks.length === 0) {
    throw new Error('No Next.js flight payload found; the page structure may have changed');
  }
  const joined = chunks.join('');
  try {
    return JSON.parse(`"${joined}"`);
  } catch {
    // Fall back to per-chunk unescaping if a chunk boundary breaks the single-string parse.
    return chunks.map((chunk) => JSON.parse(`"${chunk}"`)).join('');
  }
}

// Extract the JSON array that directly follows `marker` using bracket matching, so nested
// objects containing `]` cannot truncate the array.
function extractArrayAfter(text, marker) {
  const arrayStart = text.indexOf(marker);
  if (arrayStart === -1) return null;
  const start = text.indexOf('[', arrayStart);
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (char === '[') depth += 1;
    else if (char === ']') {
      depth -= 1;
      if (depth === 0) return JSON.parse(text.slice(start, i + 1));
    }
  }
  return null;
}

function nearbySectionTitle(flightText, occurrenceIndex) {
  const window = flightText.slice(Math.max(0, occurrenceIndex - 2500), occurrenceIndex);
  const titles = [...window.matchAll(/"title":"([^"]{2,80})"/g)].map((match) => match[1]);
  return titles.length > 0 ? titles[titles.length - 1] : null;
}

// Hydration payloads repeat directory records with flight references instead of values
// (e.g. categories: "$1f:props:apps:0:categories"). They are pointers, not data, and must
// not be captured as a second directory copy.
function isRealPayload(apps) {
  return apps.every(
    (app) =>
      Array.isArray(app.categories) &&
      typeof app.name === 'string' &&
      typeof app.blurb === 'string',
  );
}

function classifyAppArray(apps) {
  const first = apps[0] ?? {};
  if (first.rank !== undefined) return 'most-active';
  if (first.appLink !== undefined) return 'featured-section';
  if (first.slug !== undefined && first.logo !== undefined && isRealPayload(apps)) return 'directory';
  return 'unknown';
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const fetchedAtUtc = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const outPath = path.resolve(
    options.out ?? path.join('data', 'research', `monad-app-portal-${utcDateStamp()}.json`),
  );
  assertExclusiveOutput(outPath);

  const response = await fetch(SOURCE_URL, {
    headers: { accept: 'text/html', 'user-agent': 'monad-city-research/1.0' },
  });
  if (!response.ok) {
    throw new Error(`App Portal request failed: HTTP ${response.status} ${response.statusText}`);
  }
  const html = await response.text();
  const htmlSha256 = crypto.createHash('sha256').update(html).digest('hex');

  const flightText = extractFlightText(html);
  const occurrences = [...flightText.matchAll(/"apps":\[/g)].map((match) => match.index);
  if (occurrences.length === 0) {
    throw new Error('No app arrays found in the flight payload; the page structure may have changed');
  }

  const directoryCandidates = [];
  const sections = [];
  const mostActiveCandidates = [];
  occurrences.forEach((index) => {
    const apps = extractArrayAfter(flightText.slice(index), '"apps":[');
    if (!apps || apps.length === 0) return;
    const kind = classifyAppArray(apps);
    if (kind === 'directory') directoryCandidates.push(apps);
    else if (kind === 'featured-section') {
      sections.push({ section: nearbySectionTitle(flightText, index), apps });
    } else if (kind === 'most-active') mostActiveCandidates.push(apps);
  });

  if (directoryCandidates.length === 0) {
    throw new Error('Directory payload not found in the flight data');
  }

  // The directory payload can be embedded more than once. Keep the first and record whether
  // any repeat differs, so the artifact never silently hides a divergence.
  const directory = directoryCandidates[0].map((app) => ({
    id: app.id,
    slug: app.slug,
    name: app.name,
    tagline: app.tagline,
    logo: app.logo,
    categories: Array.isArray(app.categories) ? app.categories : [],
    blurb: app.blurb,
  }));
  let directoryRepeatNote = null;
  for (const repeat of directoryCandidates.slice(1)) {
    const normalized = repeat.map((app) => ({
      id: app.id,
      slug: app.slug,
      name: app.name,
      tagline: app.tagline,
      logo: app.logo,
      categories: Array.isArray(app.categories) ? app.categories : [],
      blurb: app.blurb,
    }));
    if (JSON.stringify(normalized) !== JSON.stringify(directory)) {
      directoryRepeatNote = 'A repeated directory payload in the page differs from the first one.';
      break;
    }
  }

  const mostActive = (mostActiveCandidates[0] ?? []).map((app) => ({
    rank: app.rank,
    rankDelta: app.rankDelta,
    slug: app.slug,
    name: app.name,
    tagline: app.tagline,
    category: app.category,
    tags: app.tags,
    badge: app.badge,
    onlyOnMonad: app.onlyOnMonad,
  }));

  const artifact = {
    kind: 'monad-city-research-seed',
    source: 'Monad App Portal (official Monad app directory)',
    sourceUrl: SOURCE_URL,
    fetchedAtUtc,
    parseMethod:
      'Static extraction of the server-rendered Next.js flight payload from the HTML response. ' +
      'No JavaScript was executed and no browser was driven.',
    htmlSha256,
    note:
      'Research seed for the ecosystem intake pipeline. Names, taglines, and blurbs are the ' +
      'publisher’s own marketing copy and stay attributed to the Monad App Portal; they are not ' +
      'independent verification of any project capability. This artifact is not an evidence ' +
      'snapshot and carries no review status.',
    counts: {
      directoryApps: directory.length,
      featuredSections: sections.length,
      featuredApps: sections.reduce((sum, section) => sum + section.apps.length, 0),
      mostActiveApps: mostActive.length,
    },
    directory,
    featuredSections: sections.map((section) => ({
      section: section.section,
      apps: section.apps.map((app) => ({
        id: app.id,
        name: app.name,
        tagline: app.tagline,
        blurb: app.blurb,
        categories: Array.isArray(app.categories) ? app.categories : [],
        appLink: app.appLink ?? null,
        twitterLink: app.twitterLink ?? null,
        platforms: app.platforms ?? null,
        onlyOnMonad: app.onlyOnMonad ?? null,
        monadMomentum: app.monadMomentum ?? null,
        firstPublishedAt: app.firstPublishedAt ?? null,
      })),
    })),
    mostActiveApps: mostActive,
  };
  if (directoryRepeatNote) artifact.notes = [directoryRepeatNote];

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, canonicalJson(artifact));
  console.log(
    `Wrote app portal seed to ${outPath}: ${directory.length} directory apps, ` +
      `${artifact.counts.featuredSections} featured sections, ${mostActive.length} most-active apps`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
