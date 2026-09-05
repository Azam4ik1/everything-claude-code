'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const BRAIN_SCHEMA = 'ecc.max.brain.event.v1';
const ENTRY_TYPES = new Set(['fact', 'decision', 'learning', 'risk', 'design', 'procedure', 'handoff']);
const RELATION_TYPES = new Set(['supports', 'depends_on', 'contradicts', 'supersedes', 'relates_to']);

const SECRET_PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
  /\b(?:sk|rk|pk)-[A-Za-z0-9_-]{16,}\b/,
  /\bgh[oprsu]_[A-Za-z0-9]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|refresh[_-]?token)\s*[:=]\s*[^\s,;]{6,}/i
];

function nowIso() { return new Date().toISOString(); }
function projectRoot(cwd = process.cwd()) { return path.resolve(process.env.ECC_MAX_PROJECT_ROOT || cwd); }
function brainDir(root = projectRoot()) { return path.join(root, '.claude', 'ecc-max', 'brain'); }
function eventsPath(root = projectRoot()) { return path.join(brainDir(root), 'events.jsonl'); }
function indexPath(root = projectRoot()) { return path.join(brainDir(root), 'INDEX.md'); }
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }

function rejectSecrets(text) {
  const value = String(text || '');
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(value)) throw new Error('Refusing to persist content that looks like a credential or secret.');
  }
  return value;
}

function makeId(prefix = 'mem') {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
}

function appendEvent(root, event) {
  const file = eventsPath(root);
  ensureDir(path.dirname(file));
  const payload = { schema: BRAIN_SCHEMA, at: nowIso(), ...event };
  fs.appendFileSync(file, `${JSON.stringify(payload)}\n`, 'utf8');
  return payload;
}

function loadEvents(root = projectRoot()) {
  const file = eventsPath(root);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line, idx) => {
      try { return JSON.parse(line); } catch { return { schema: BRAIN_SCHEMA, type: 'corrupt', line: idx + 1 }; }
    });
}

function reduce(root = projectRoot()) {
  const entries = new Map();
  const relations = [];
  const events = loadEvents(root);
  for (const event of events) {
    if (event.type === 'entry.created' && event.entry?.id) {
      entries.set(event.entry.id, { ...event.entry });
    } else if (event.type === 'entry.resolved' && entries.has(event.id)) {
      const entry = entries.get(event.id);
      entry.status = 'resolved';
      entry.resolution = event.note || '';
      entry.resolvedAt = event.at;
    } else if (event.type === 'entry.superseded' && entries.has(event.id)) {
      const entry = entries.get(event.id);
      entry.status = 'superseded';
      entry.supersededBy = event.by || '';
      entry.resolvedAt = event.at;
    } else if (event.type === 'relation.created' && event.relation) {
      relations.push({ ...event.relation, at: event.at });
    }
  }
  return { entries, relations, events };
}

function splitTags(raw) {
  if (Array.isArray(raw)) return raw.map(String).map(x => x.trim()).filter(Boolean);
  return String(raw || '').split(',').map(x => x.trim()).filter(Boolean);
}

function validateEvidence(type, evidence) {
  const value = rejectSecrets(String(evidence || '').trim());
  if (['fact', 'decision', 'learning'].includes(type) && value.length < 3) {
    throw new Error(`${type} entries require evidence or a source reference.`);
  }
  return value;
}

function addEntry(rootArg, input) {
  const root = projectRoot(rootArg || process.cwd());
  const type = String(input.type || '').trim().toLowerCase();
  if (!ENTRY_TYPES.has(type)) throw new Error(`Invalid memory type: ${type}. Allowed: ${[...ENTRY_TYPES].join(', ')}`);
  const title = rejectSecrets(String(input.title || '').trim());
  const body = rejectSecrets(String(input.body || '').trim());
  if (title.length < 3) throw new Error('Memory title is too short.');
  if (body.length < 3) throw new Error('Memory body is too short.');
  const evidence = validateEvidence(type, input.evidence);
  const tags = splitTags(input.tags).map(rejectSecrets);
  const entry = {
    id: makeId('mem'),
    type,
    title,
    body,
    evidence,
    tags,
    status: 'active',
    createdAt: nowIso(),
    source: String(input.source || 'ecc-max')
  };
  appendEvent(root, { type: 'entry.created', entry });
  return entry;
}

function resolveEntry(rootArg, id, note) {
  const root = projectRoot(rootArg || process.cwd());
  const state = reduce(root);
  const entry = state.entries.get(id);
  if (!entry) throw new Error(`Unknown memory id: ${id}`);
  if (entry.status !== 'active') throw new Error(`${id} is already ${entry.status}.`);
  const cleanNote = rejectSecrets(String(note || '').trim());
  if (cleanNote.length < 3) throw new Error('Resolution note is required.');
  appendEvent(root, { type: 'entry.resolved', id, note: cleanNote });
  return { ...entry, status: 'resolved', resolution: cleanNote };
}

function supersedeEntry(rootArg, id, by, note) {
  const root = projectRoot(rootArg || process.cwd());
  const state = reduce(root);
  if (!state.entries.has(id)) throw new Error(`Unknown memory id: ${id}`);
  if (!state.entries.has(by)) throw new Error(`Unknown replacement memory id: ${by}`);
  appendEvent(root, { type: 'entry.superseded', id, by, note: rejectSecrets(String(note || '').trim()) });
}

function relate(rootArg, from, to, type = 'relates_to', note = '') {
  const root = projectRoot(rootArg || process.cwd());
  const relationType = String(type || 'relates_to').trim().toLowerCase();
  if (!RELATION_TYPES.has(relationType)) throw new Error(`Invalid relation type: ${relationType}`);
  const state = reduce(root);
  if (!state.entries.has(from)) throw new Error(`Unknown source memory id: ${from}`);
  if (!state.entries.has(to)) throw new Error(`Unknown target memory id: ${to}`);
  if (from === to) throw new Error('A memory cannot relate to itself.');
  const relation = { id: makeId('rel'), from, to, type: relationType, note: rejectSecrets(String(note || '').trim()) };
  appendEvent(root, { type: 'relation.created', relation });
  return relation;
}

function tokens(text) {
  return new Set((String(text || '').toLowerCase().match(/[\p{L}\p{N}_-]+/gu) || []).filter(x => x.length > 1));
}

function scoreEntry(entry, queryTokens) {
  let score = 0;
  const title = tokens(entry.title);
  const body = tokens(entry.body);
  const tags = tokens((entry.tags || []).join(' '));
  const evidence = tokens(entry.evidence || '');
  for (const token of queryTokens) {
    if (title.has(token)) score += 5;
    if (tags.has(token)) score += 4;
    if (body.has(token)) score += 2;
    if (evidence.has(token)) score += 1;
  }
  if (entry.status === 'active') score += 0.25;
  return score;
}

function search(rootArg, query, options = {}) {
  const root = projectRoot(rootArg || process.cwd());
  const state = reduce(root);
  const q = tokens(query);
  if (q.size === 0) return [];
  const type = options.type ? String(options.type).toLowerCase() : null;
  const limit = Number(options.limit || 10);
  const direct = [];
  for (const entry of state.entries.values()) {
    if (type && entry.type !== type) continue;
    const score = scoreEntry(entry, q);
    if (score > 0) direct.push({ entry, score });
  }
  direct.sort((a, b) => b.score - a.score || b.entry.createdAt.localeCompare(a.entry.createdAt));

  // One-hop graph boost: if a top direct hit links to another memory, include
  // that neighbor with a small score so related decisions/risks are visible.
  const scores = new Map(direct.map(x => [x.entry.id, x.score]));
  const seedIds = new Set(direct.slice(0, Math.min(5, direct.length)).map(x => x.entry.id));
  for (const rel of state.relations) {
    let neighbor = null;
    if (seedIds.has(rel.from)) neighbor = rel.to;
    else if (seedIds.has(rel.to)) neighbor = rel.from;
    if (!neighbor || !state.entries.has(neighbor)) continue;
    scores.set(neighbor, Math.max(scores.get(neighbor) || 0, 0.75));
  }
  return [...scores.entries()]
    .map(([id, score]) => ({ entry: state.entries.get(id), score }))
    .filter(x => !type || x.entry.type === type)
    .sort((a, b) => b.score - a.score || b.entry.createdAt.localeCompare(a.entry.createdAt))
    .slice(0, Number.isFinite(limit) && limit > 0 ? limit : 10);
}

function getEntry(rootArg, id) {
  const state = reduce(projectRoot(rootArg || process.cwd()));
  const entry = state.entries.get(id);
  if (!entry) throw new Error(`Unknown memory id: ${id}`);
  const relations = state.relations.filter(rel => rel.from === id || rel.to === id);
  return { entry, relations };
}

function status(rootArg) {
  const root = projectRoot(rootArg || process.cwd());
  const state = reduce(root);
  const entries = [...state.entries.values()];
  const byType = {};
  for (const type of ENTRY_TYPES) byType[type] = entries.filter(x => x.type === type && x.status === 'active').length;
  return {
    root,
    totalEntries: entries.length,
    activeEntries: entries.filter(x => x.status === 'active').length,
    unresolvedRisks: entries.filter(x => x.type === 'risk' && x.status === 'active').length,
    relations: state.relations.length,
    byType
  };
}

function exportMarkdown(rootArg) {
  const root = projectRoot(rootArg || process.cwd());
  const state = reduce(root);
  const entries = [...state.entries.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const lines = ['# ECC MAX Second Brain', '', `Generated: ${nowIso()}`, ''];
  const riskEntries = entries.filter(x => x.type === 'risk' && x.status === 'active');
  lines.push(`Active memories: ${entries.filter(x => x.status === 'active').length}`, `Unresolved risks: ${riskEntries.length}`, `Relations: ${state.relations.length}`, '');
  for (const type of ENTRY_TYPES) {
    const group = entries.filter(x => x.type === type);
    if (!group.length) continue;
    lines.push(`## ${type[0].toUpperCase()}${type.slice(1)}`, '');
    for (const entry of group) {
      lines.push(`### ${entry.title}`, '', `- ID: \`${entry.id}\``, `- Status: ${entry.status}`, `- Created: ${entry.createdAt}`);
      if (entry.tags?.length) lines.push(`- Tags: ${entry.tags.join(', ')}`);
      if (entry.evidence) lines.push(`- Evidence: ${entry.evidence}`);
      lines.push('', entry.body, '');
      if (entry.resolution) lines.push(`Resolution: ${entry.resolution}`, '');
    }
  }
  const file = indexPath(root);
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${lines.join('\n')}\n`, 'utf8');
  return file;
}

module.exports = {
  BRAIN_SCHEMA,
  ENTRY_TYPES,
  RELATION_TYPES,
  projectRoot,
  brainDir,
  eventsPath,
  indexPath,
  rejectSecrets,
  loadEvents,
  reduce,
  addEntry,
  resolveEntry,
  supersedeEntry,
  relate,
  search,
  getEntry,
  status,
  exportMarkdown
};
