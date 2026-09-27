#!/usr/bin/env node
// Batch 4 seed research (build-time only, run once per research pass).
//
// The 50 pending groups that resolved to `no-candidate` in the deployment-resolution pass
// have no Monad deployment record in the seed registries. This pass asks one bounded
// question per group: does a SEED-GROUNDED page (the official Monad App Portal blurb, or the
// project's own appLink when the group is featured on the portal) carry Monad deployment
// evidence — contract addresses that verify live on chainid 143?
//
// Sources are seed URLs only: portal blurbs are already captured in the checked-in artifact;
// appLinks are the portal's own published links. No guessed URLs, no crawling. The Etherscan
// V2 API key is read from outside the repo and never logged or stored.
//
// Output: data/research/batch-4-seed-research-<UTC-date>.json (exclusive creation, research
// artifact only). A found claim still needs drafted evidence records + human review before
// any snapshot — nothing here is approved.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const V2 = 'https://api.etherscan.io/v2/api?chainid=143';
const ADDR_RE = /0x[0-9a-fA-F]{40}/g;
const UA = 'monad-city-research/1.0 (build-time seed research; no runtime fetching)';
const MAX_ADDRESSES_PER_GROUP = 5;

const norm = (value) => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function latestArtifact(prefix) {
  const files = fs
    .readdirSync('data/research')
    .filter((file) => file.startsWith(`${prefix}-`) && file.endsWith('.json'))
    .sort();
  if (files.length === 0) throw new Error(`no artifact ${prefix}-<date>.json`);
  return path.join('data', 'research', files[files.length - 1]);
}

async function v2Call(key, params) {
  const url = `${V2}&${params}&apikey=${key}`;
  return (await fetch(url, { signal: AbortSignal.timeout(20000) })).json();
}

// module=proxy answers in the JSON-RPC envelope ({result: "0x…"}); only a hex string longer
// than "0x" is deployed bytecode — prose (rate-limit text) and EOAs must not pass.
async function verifyAddress(key, address) {
  const code = await v2Call(key, `module=proxy&action=eth_getCode&address=${address}&tag=latest`);
  const bytecode = typeof code.result === 'string' && /^0x[0-9a-fA-F]*$/.test(code.result) ? code.result : null;
  if (bytecode === null) return { hasCode: false, error: String(code.error?.message ?? code.result ?? 'error').slice(0, 120) };
  if (bytecode.length <= 2) return { hasCode: false };
  const source = await v2Call(key, `module=contract&action=getsourcecode&address=${address}`);
  if (source.status === '1' && Array.isArray(source.result) && source.result[0]) {
    return { hasCode: true, contractName: source.result[0].ContractName || null, isProxy: source.result[0].Proxy === '1' };
  }
  return { hasCode: true, contractName: null };
}

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: { accept: 'text/html', 'user-agent': UA },
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    return { status: res.status, text };
  } catch (error) {
    return { status: null, text: '', error: String(error.cause?.code ?? error.message).slice(0, 120) };
  }
}

async function main() {
  const key = (fs.readFileSync(path.join(os.homedir(), '.config', 'monad-city', 'etherscan-key'), 'utf8') || '').trim();
  if (!key) throw new Error('no etherscan key');

  const report = JSON.parse(fs.readFileSync(latestArtifact('intake-report'), 'utf8'));
  const resolution = JSON.parse(fs.readFileSync(latestArtifact('pending-deployments'), 'utf8'));
  const portal = JSON.parse(fs.readFileSync(latestArtifact('monad-app-portal'), 'utf8'));

  const resolvedIds = new Set(
    resolution.projects.filter((p) => p.verdict.startsWith('resolved-explorer')).map((p) => p.proposedId),
  );
  const remaining = report.groups.filter((g) => g.outcome === 'pending' && !resolvedIds.has(g.proposedId));

  const directoryBySlug = new Map(portal.directory.map((entry) => [entry.slug, entry]));
  const directoryByName = new Map(portal.directory.map((entry) => [norm(entry.name), entry]));
  const featuredByName = new Map(
    portal.featuredSections
      .flatMap((section) => (section.apps ?? []).map((app) => ({ ...app, section: section.section })))
      .filter((app) => app.appLink)
      .map((app) => [norm(app.name), app]),
  );

  const rows = [];
  const summary = { groups: remaining.length, deploymentClaimFound: 0, addressesFoundNotVerified: 0, monadMentionsNoAddresses: 0, noDeploymentClaim: 0, pageUnreachable: 0, noSeedUrl: 0 };

  for (const group of remaining) {
    const portalEntry =
      (group.portalSlugs ?? []).map((slug) => directoryBySlug.get(slug)).find(Boolean) ??
      (group.names ?? []).map((name) => directoryByName.get(norm(name))).find(Boolean) ??
      null;
    const blurbAddresses = [...new Set((portalEntry?.blurb ?? '').match(ADDR_RE) ?? [])];
    const featured = portalEntry ? featuredByName.get(norm(portalEntry.name)) : null;

    const row = {
      proposedId: group.proposedId,
      canonicalName: group.canonicalName,
      portalEntryFound: Boolean(portalEntry),
      portalBlurb: (portalEntry?.blurb ?? '').slice(0, 240),
      blurbAddresses: blurbAddresses.slice(0, 3),
      seedUrl: featured?.appLink ?? null,
      seedUrlSection: featured?.section ?? null,
      pageFetch: null,
      monadMentions: 0,
      addressesOnPage: [],
      explorerChecks: [],
      verdict: 'no-seed-url',
      sourceUrls: [],
    };

    if (row.seedUrl) {
      row.sourceUrls.push(row.seedUrl);
      const page = await fetchPage(row.seedUrl);
      if (page.error || page.status !== 200) {
        row.verdict = 'page-unreachable';
        row.pageFetch = { status: page.status, error: page.error ?? null };
      } else {
        row.pageFetch = { status: page.status };
        row.monadMentions = (page.text.match(/Monad/g) ?? []).length;
        row.addressesOnPage = [...new Set(page.text.match(ADDR_RE) ?? [])].slice(0, MAX_ADDRESSES_PER_GROUP);
        for (const address of row.addressesOnPage) {
          row.explorerChecks.push({ address, ...(await verifyAddress(key, address)) });
          await sleep(420);
        }
        const live = row.explorerChecks.filter((check) => check.hasCode);
        if (live.length > 0 && row.monadMentions > 0) row.verdict = 'deployment-claim-found';
        else if (live.length > 0) row.verdict = 'contracts-live-on-monad-no-page-claim';
        else if (row.addressesOnPage.length > 0) row.verdict = 'addresses-found-not-verified-on-monad';
        else if (row.monadMentions > 0) row.verdict = 'monad-mentions-no-addresses';
        else row.verdict = 'no-deployment-claim';
      }
    } else if (blurbAddresses.length > 0) {
      row.verdict = 'deployment-claim-found';
      row.sourceUrls.push('https://app.monad.xyz/ (portal blurb)');
    }

    summary[row.verdict] = (summary[row.verdict] ?? 0) + 1;
    rows.push(row);
    process.stdout.write(`${row.verdict.padEnd(36)} ${row.canonicalName}\n`);
  }

  const generatedAtUtc = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const dateStamp = generatedAtUtc.slice(0, 10);
  const outPath = path.resolve(`data/research/batch-4-seed-research-${dateStamp}.json`);
  if (fs.existsSync(outPath)) throw new Error(`refusing to overwrite ${outPath}`);

  const artifact = {
    kind: 'monad-city-research-batch-4-seed-research',
    schemaVersion: '1',
    generatedAtUtc,
    network: { name: 'Monad mainnet', chainId: 143 },
    question: 'Do the 50 no-candidate pending groups have Monad deployment evidence on seed-grounded pages (portal blurbs, portal-published appLinks)?',
    method: 'Static fetch of seed URLs only (portal appLinks; blurbs from the checked-in capture). Address extraction is 0x{40hex}; found addresses verified via Etherscan V2 (owner key from outside the repo; never stored). No guessed URLs, no crawling, no invented facts.',
    summary,
    rows,
    note: 'Research artifact for the intake pipeline. A deployment-claim-found verdict is a publisher statement + explorer observation, not verification, endorsement, activity, or safety. Evidence records drafted from it require the full review gate before any snapshot. Groups marked no-seed-url need manually supplied project URLs (intake runbook: manual research notes).',
  };

  fs.writeFileSync(outPath, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(`\nArtifact written: ${outPath}`);
  console.log(JSON.stringify(summary, null, 1));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
