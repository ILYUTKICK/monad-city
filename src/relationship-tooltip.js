import { RELATIONSHIP_STATES, RELATIONSHIP_TYPES } from './data.js';

const cleanText = (value) => String(value ?? '')
  .replace(/`([^`]+)`/g, '$1')
  .replace(/\s+/g, ' ')
  .trim();

const sourceName = (relationship) => cleanText(
  relationship.source?.title || relationship.source?.publisher || relationship.provenance?.actor,
);

const sourceNameWithoutRevision = (relationship) => sourceName(relationship)
  .replace(/\s+at\s+[0-9a-f]{7,}$/i, '')
  .trim();

const isSourced = (relationship) => relationship.dataMode === 'sourced-limited'
  && relationship.reviewStatus === 'approved';

const claimState = (relationship) => {
  if (isSourced(relationship)) return cleanText(relationship.claimStatus || relationship.status || 'Source-backed');
  const demoStates = {
    'onchain-observed': 'Demo, Observed pattern',
    'owner-claimed': 'Demo, Claimed pattern',
    'third-party-attested': 'Demo, Attested pattern',
    'AI-inferred': 'AI-inferred',
    illustrative: 'Illustrative',
  };
  if (demoStates[relationship.evidenceState]) return demoStates[relationship.evidenceState];
  return RELATIONSHIP_STATES[relationship.evidenceState]?.shortLabel
    || RELATIONSHIP_STATES[relationship.evidenceState]?.label
    || cleanText(relationship.evidenceState || 'Illustrative');
};

function membershipCopy(relationship, fromName, toName) {
  const subject = relationship.from === 'monad' ? toName : relationship.to === 'monad' ? fromName : toName;
  const source = sourceNameWithoutRevision(relationship);
  const description = source
    ? `${subject} appears in the ${source}.`
    : `${subject} appears in the cited ecosystem directory.`;
  const detail = relationship.source?.referenceType === 'pinned-snapshot'
    ? 'This supports only the saved registry entry and the details stored with it.'
    : 'The evidence covers the directory listing as it appeared when retrieved.';
  return { description, detail };
}

function illustrativeCopy(relationship) {
  if (relationship.evidenceState === 'AI-inferred') {
    return {
      description: 'This connection was suggested for discovery.',
      detail: 'It is AI-inferred and does not provide factual support.',
    };
  }
  if (relationship.evidenceState === 'illustrative') {
    return {
      description: 'This is an illustrative city connection.',
      detail: 'No source supports a factual relationship.',
    };
  }
  return {
    description: cleanText(relationship.scope) || 'This is a demonstration of a relationship evidence pattern.',
    detail: 'No supporting source is connected.',
  };
}

export function formatRelationshipTooltip(relationship, fromName, toName) {
  const title = `${cleanText(fromName || relationship.from)} and ${cleanText(toName || relationship.to)}`;
  if (!isSourced(relationship)) {
    const copy = illustrativeCopy(relationship);
    return {
      title,
      ...copy,
      status: claimState(relationship),
      source: null,
    };
  }

  const copy = relationship.type === 'ecosystem_membership'
    ? membershipCopy(relationship, cleanText(fromName || relationship.from), cleanText(toName || relationship.to))
    : {
      description: cleanText(relationship.scope)
        || `The cited source describes a ${cleanText(RELATIONSHIP_TYPES[relationship.type]?.label || relationship.type).toLowerCase()}.`,
      detail: relationship.limitations?.[0] ? cleanText(relationship.limitations[0]) : null,
    };

  return {
    title,
    ...copy,
    status: claimState(relationship),
    source: sourceNameWithoutRevision(relationship) || null,
  };
}

export function formatRelationshipGroupTooltip(records, fromName, toName) {
  if (records.length === 1) return formatRelationshipTooltip(records[0], fromName, toName);
  const statuses = [...new Set(records.map(claimState).filter(Boolean))];
  const sources = [...new Set(records.filter(isSourced).map(sourceName).filter(Boolean))];
  const types = [...new Set(records.map((record) => cleanText(
    RELATIONSHIP_TYPES[record.type]?.label || record.type,
  )).filter(Boolean))];
  return {
    title: `${cleanText(fromName)} and ${cleanText(toName)}`,
    description: `${records.length} records describe ${types.map((type) => type.toLowerCase()).join(' and ')} between these projects.`,
    status: statuses.join(', '),
    source: sources.length ? `${sources.length} cited source${sources.length === 1 ? '' : 's'}` : null,
    detail: 'Open the Passport to read each source, scope, and limitation.',
  };
}

export function formatDistrictRouteTooltip(link) {
  const total = Number(link.total) || 0;
  const withRecords = Number(link.withRecords) || 0;
  return {
    title: `Monad and ${cleanText(link.district)}`,
    description: `${withRecords} of ${total} ${cleanText(link.district)} projects have approved records about Monad mainnet.`,
    status: 'District summary',
    source: null,
    detail: `${cleanText(link.district)} is a navigation category, so this route is not a project relationship.`,
  };
}

export function relationshipTooltipText(content) {
  return [
    content.title,
    content.description,
    content.status ? `Status: ${content.status}` : null,
    content.source ? `Source: ${content.source}` : null,
    content.detail,
  ].filter(Boolean).join('\n');
}
