'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const RUN_SCHEMA = 'ecc.max.run.v1';
const DEFAULT_GLOBAL_FAILURE_BUDGET = 8;
const DEFAULT_NODE_RETRY_BUDGET = 3;

const GRAPH = [
  { id: 'intake', label: 'Task intake and scope', deps: [], allowNA: false, category: 'control' },
  { id: 'memory', label: 'Second Brain recall', deps: ['intake'], allowNA: false, category: 'context' },
  { id: 'discovery', label: 'Repository and documentation discovery', deps: ['intake'], allowNA: false, category: 'context' },
  { id: 'requirements', label: 'Requirements and acceptance criteria', deps: ['memory', 'discovery'], allowNA: false, category: 'control' },
  { id: 'architecture', label: 'Architecture review', deps: ['requirements'], allowNA: true, category: 'engineering' },
  { id: 'plan', label: 'Implementation or audit plan', deps: ['requirements'], allowNA: false, category: 'engineering' },
  { id: 'implementation', label: 'Implementation / concrete changes', deps: ['architecture', 'plan'], allowNA: true, category: 'engineering' },
  { id: 'tests', label: 'Automated tests', deps: ['implementation'], allowNA: true, category: 'verification' },
  { id: 'code_review', label: 'Code review', deps: ['implementation'], allowNA: true, category: 'verification' },
  { id: 'failure_review', label: 'Silent failure and error-path review', deps: ['implementation'], allowNA: true, category: 'verification' },
  { id: 'security', label: 'Security review', deps: ['implementation'], allowNA: true, category: 'security' },
  { id: 'dependency_security', label: 'Dependency / supply-chain review', deps: ['implementation'], allowNA: true, category: 'security' },
  { id: 'data_integrity', label: 'Data model / migration / integrity review', deps: ['implementation'], allowNA: true, category: 'data' },
  { id: 'privacy', label: 'Privacy / sensitive-data review', deps: ['implementation'], allowNA: true, category: 'security' },
  { id: 'design', label: 'Product / visual design review', deps: ['implementation'], allowNA: true, category: 'design' },
  { id: 'accessibility', label: 'Accessibility review', deps: ['design'], allowNA: true, category: 'design' },
  { id: 'performance', label: 'Measured performance review', deps: ['implementation'], allowNA: true, category: 'performance' },
  { id: 'documentation', label: 'Documentation / operator handoff review', deps: ['implementation'], allowNA: true, category: 'documentation' },
  { id: 'operations', label: 'Deployment / rollback / observability review', deps: ['implementation'], allowNA: true, category: 'operations' },
  { id: 'e2e', label: 'End-to-end user-flow verification', deps: ['implementation', 'design'], allowNA: true, category: 'verification' },
  { id: 'production_readiness', label: 'Production readiness / release audit', deps: ['tests', 'security', 'dependency_security', 'data_integrity', 'privacy', 'e2e', 'operations'], allowNA: true, category: 'operations' },
  {
    id: 'verification',
    label: 'Final verification gate',
    deps: ['tests', 'code_review', 'failure_review', 'security', 'dependency_security', 'data_integrity', 'privacy', 'design', 'accessibility', 'performance', 'documentation', 'operations', 'e2e', 'production_readiness'],
    allowNA: false,
    category: 'verification'
  },
  { id: 'self_eval', label: 'Agent self-evaluation', deps: ['verification'], allowNA: false, category: 'quality' },
  { id: 'learning', label: 'Evidence-backed learning capture', deps: ['self_eval'], allowNA: false, category: 'memory' },
  { id: 'final', label: 'Final completion gate', deps: ['learning'], allowNA: false, category: 'control' }
];

const NODE_MAP = new Map(GRAPH.map(node => [node.id, node]));
const RESOLVED_STATUSES = new Set(['passed', 'not_applicable']);
const VALID_MARK_STATUSES = new Set(['passed', 'failed', 'not_applicable']);

function nowIso() {
  return new Date().toISOString();
}

function getProjectRoot(cwd = process.cwd()) {
  return path.resolve(process.env.ECC_MAX_PROJECT_ROOT || cwd);
}

function getMaxDir(root = getProjectRoot()) {
  return path.join(root, '.claude', 'ecc-max');
}

function getRuntimeDir(root = getProjectRoot()) {
  return path.join(getMaxDir(root), 'runtime');
}

function getRunsDir(root = getProjectRoot()) {
  return path.join(getRuntimeDir(root), 'runs');
}

function getActivePath(root = getProjectRoot()) {
  return path.join(getRuntimeDir(root), 'active.json');
}

function getLastPath(root = getProjectRoot()) {
  return path.join(getRuntimeDir(root), 'last.json');
}

function runDir(root, runId) {
  return path.join(getRunsDir(root), runId);
}

function statePath(root, runId) {
  return path.join(runDir(root, runId), 'state.json');
}

function eventsPath(root, runId) {
  return path.join(runDir(root, runId), 'events.jsonl');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function ensureRuntimeGitignore(root) {
  const ignorePath = path.join(getMaxDir(root), '.gitignore');
  ensureDir(path.dirname(ignorePath));
  const required = 'runtime/';
  if (!fs.existsSync(ignorePath)) {
    fs.writeFileSync(ignorePath, `${required}\n`, 'utf8');
    return;
  }
  const current = fs.readFileSync(ignorePath, 'utf8');
  const lines = current.split(/\r?\n/).map(line => line.trim());
  if (!lines.includes(required)) {
    fs.appendFileSync(ignorePath, `${current.endsWith('\n') || current.length === 0 ? '' : '\n'}${required}\n`, 'utf8');
  }
}

function atomicWriteJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, filePath);
}

function appendEvent(root, runId, event) {
  const filePath = eventsPath(root, runId);
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, `${JSON.stringify({ at: nowIso(), ...event })}\n`, 'utf8');
}

function makeRunId() {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `${stamp}-${crypto.randomBytes(3).toString('hex')}`;
}

function createNodeState(node) {
  return {
    id: node.id,
    label: node.label,
    category: node.category,
    status: 'pending',
    failures: 0,
    lastEvidence: '',
    lastUpdatedAt: null
  };
}

function loadStateFile(filePath) {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (parsed.schema !== RUN_SCHEMA) {
    throw new Error(`Unsupported ECC MAX run schema: ${parsed.schema || 'missing'}`);
  }
  return parsed;
}

function loadRun(root, runId) {
  return loadStateFile(statePath(root, runId));
}

function loadActiveRun(root = getProjectRoot()) {
  const activePath = getActivePath(root);
  if (!fs.existsSync(activePath)) return null;
  let pointer;
  try {
    pointer = JSON.parse(fs.readFileSync(activePath, 'utf8'));
  } catch {
    return null;
  }
  if (!pointer || !pointer.runId) return null;
  const filePath = statePath(root, pointer.runId);
  if (!fs.existsSync(filePath)) return null;
  return loadStateFile(filePath);
}

function loadLatestRun(root = getProjectRoot()) {
  const active = loadActiveRun(root);
  if (active) return active;
  const lastPath = getLastPath(root);
  if (!fs.existsSync(lastPath)) return null;
  try {
    const pointer = JSON.parse(fs.readFileSync(lastPath, 'utf8'));
    if (!pointer?.runId) return null;
    const filePath = statePath(root, pointer.runId);
    if (!fs.existsSync(filePath)) return null;
    return loadStateFile(filePath);
  } catch {
    return null;
  }
}

function listRuns(root = getProjectRoot()) {
  const dir = getRunsDir(root);
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const name of fs.readdirSync(dir)) {
    const file = statePath(root, name);
    if (!fs.existsSync(file)) continue;
    try {
      const state = loadStateFile(file);
      results.push({
        runId: state.runId, task: state.task, status: state.status,
        createdAt: state.createdAt, updatedAt: state.updatedAt,
        completedAt: state.completedAt, abortedAt: state.abortedAt,
        totalFailures: state.totalFailures
      });
    } catch { /* skip malformed historical run */ }
  }
  return results.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function persistLastPointer(root, state) {
  atomicWriteJson(getLastPath(root), {
    schema: 'ecc.max.last.v1',
    runId: state.runId,
    task: state.task,
    status: state.status,
    updatedAt: state.updatedAt
  });
}

function persistState(root, state) {
  state.updatedAt = nowIso();
  atomicWriteJson(statePath(root, state.runId), state);
}

function clearActivePointer(root, runId) {
  const activePath = getActivePath(root);
  if (!fs.existsSync(activePath)) return;
  try {
    const pointer = JSON.parse(fs.readFileSync(activePath, 'utf8'));
    if (!runId || pointer.runId === runId) fs.unlinkSync(activePath);
  } catch {
    try { fs.unlinkSync(activePath); } catch { /* best effort */ }
  }
}

function initRun(task, options = {}) {
  const root = getProjectRoot(options.root || process.cwd());
  const normalizedTask = String(task || '').trim();
  if (!normalizedTask) throw new Error('A non-empty task is required.');

  const current = loadActiveRun(root);
  if (current && !['completed', 'aborted'].includes(current.status) && !options.force) {
    throw new Error(`Active ECC MAX run ${current.runId} already exists. Finish or abort it, or use --force.`);
  }

  if (current && !['completed', 'aborted'].includes(current.status) && options.force) {
    current.status = 'aborted';
    current.abortedAt = nowIso();
    current.abortReason = 'Superseded by a forced new run';
    persistState(root, current);
    appendEvent(root, current.runId, { type: 'run.aborted', reason: current.abortReason });
  }

  const runId = makeRunId();
  const state = {
    schema: RUN_SCHEMA,
    runId,
    task: normalizedTask,
    root,
    status: 'active',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    completedAt: null,
    abortedAt: null,
    abortReason: null,
    failureBudget: Number.isInteger(options.failureBudget) ? options.failureBudget : DEFAULT_GLOBAL_FAILURE_BUDGET,
    retryBudgetPerNode: Number.isInteger(options.retryBudgetPerNode) ? options.retryBudgetPerNode : DEFAULT_NODE_RETRY_BUDGET,
    totalFailures: 0,
    nodes: Object.fromEntries(GRAPH.map(node => [node.id, createNodeState(node)]))
  };

  ensureRuntimeGitignore(root);
  ensureDir(runDir(root, runId));
  persistState(root, state);
  atomicWriteJson(getActivePath(root), { schema: 'ecc.max.active.v1', runId, task: normalizedTask, createdAt: state.createdAt });
  appendEvent(root, runId, { type: 'run.started', task: normalizedTask });
  return state;
}

function nodeDef(nodeId) {
  const node = NODE_MAP.get(nodeId);
  if (!node) throw new Error(`Unknown ECC MAX node: ${nodeId}`);
  return node;
}

function isResolved(nodeState) {
  return Boolean(nodeState && RESOLVED_STATUSES.has(nodeState.status));
}

function dependenciesResolved(state, nodeId) {
  const node = nodeDef(nodeId);
  return node.deps.every(dep => isResolved(state.nodes[dep]));
}

function readyNodes(state) {
  if (!state || state.status !== 'active') return [];
  if (Object.values(state.nodes).some(node => node.status === 'failed')) return [];
  return GRAPH
    .filter(node => state.nodes[node.id].status === 'pending' && dependenciesResolved(state, node.id))
    .map(node => node.id);
}

function failedNodes(state) {
  return GRAPH.filter(node => state.nodes[node.id].status === 'failed').map(node => node.id);
}

function unresolvedNodes(state) {
  return GRAPH.filter(node => !RESOLVED_STATUSES.has(state.nodes[node.id].status)).map(node => node.id);
}

function validateEvidence(text, label = 'evidence') {
  const value = String(text || '').trim();
  if (value.length < 3) throw new Error(`${label} must contain concrete evidence or a specific reason.`);
  return value;
}

function ensureMarkable(state, nodeId, status) {
  if (state.status !== 'active') throw new Error(`Run ${state.runId} is ${state.status}; it cannot be changed.`);
  const def = nodeDef(nodeId);
  const node = state.nodes[nodeId];
  if (!VALID_MARK_STATUSES.has(status)) throw new Error(`Invalid status: ${status}`);
  if (node.status === 'failed') throw new Error(`${nodeId} is failed. Use retry before evaluating it again.`);
  if (node.status !== 'pending') throw new Error(`${nodeId} is already ${node.status}.`);
  if (!dependenciesResolved(state, nodeId)) {
    const waiting = def.deps.filter(dep => !isResolved(state.nodes[dep]));
    throw new Error(`${nodeId} is not ready. Waiting on: ${waiting.join(', ')}`);
  }
  if (status === 'not_applicable' && !def.allowNA) throw new Error(`${nodeId} is mandatory and cannot be N/A.`);
}

function markNode(rootArg, nodeId, status, evidence) {
  const root = getProjectRoot(rootArg || process.cwd());
  const state = loadActiveRun(root);
  if (!state) throw new Error('No active ECC MAX run. Start one with `max-graph init`.');
  const normalized = String(status).toLowerCase().replace(/^pass$/, 'passed').replace(/^fail$/, 'failed').replace(/^(na|n\/a)$/, 'not_applicable');
  ensureMarkable(state, nodeId, normalized);
  const proof = validateEvidence(evidence, normalized === 'not_applicable' ? 'reason' : 'evidence');
  const node = state.nodes[nodeId];
  node.status = normalized;
  node.lastEvidence = proof;
  node.lastUpdatedAt = nowIso();

  if (normalized === 'failed') {
    node.failures += 1;
    state.totalFailures += 1;
    if (node.failures >= state.retryBudgetPerNode || state.totalFailures >= state.failureBudget) {
      state.status = 'blocked';
    }
  }

  if (nodeId === 'final' && normalized === 'passed') {
    const unresolved = GRAPH.filter(def => def.id !== 'final' && !isResolved(state.nodes[def.id]));
    if (unresolved.length > 0) {
      node.status = 'pending';
      throw new Error(`Cannot complete: unresolved nodes remain: ${unresolved.map(x => x.id).join(', ')}`);
    }
    state.status = 'completed';
    state.completedAt = nowIso();
  }

  persistState(root, state);
  appendEvent(root, state.runId, { type: 'node.marked', nodeId, status: normalized, evidence: proof });
  if (state.status === 'completed') {
    appendEvent(root, state.runId, { type: 'run.completed' });
    persistLastPointer(root, state);
    clearActivePointer(root, state.runId);
  }
  return state;
}

function retryNode(rootArg, nodeId, evidence) {
  const root = getProjectRoot(rootArg || process.cwd());
  const state = loadActiveRun(root);
  if (!state) throw new Error('No active ECC MAX run.');
  const node = state.nodes[nodeId];
  nodeDef(nodeId);
  if (!node || node.status !== 'failed') throw new Error(`${nodeId} is not failed.`);
  const proof = validateEvidence(evidence, 'repair evidence');
  if (node.failures >= state.retryBudgetPerNode) {
    throw new Error(`${nodeId} exhausted its retry budget (${state.retryBudgetPerNode}).`);
  }
  if (state.totalFailures >= state.failureBudget) {
    throw new Error(`Run exhausted its global failure budget (${state.failureBudget}).`);
  }
  node.status = 'pending';
  node.lastEvidence = `REPAIR: ${proof}`;
  node.lastUpdatedAt = nowIso();
  if (state.status === 'blocked') state.status = 'active';
  persistState(root, state);
  appendEvent(root, state.runId, { type: 'node.retried', nodeId, evidence: proof });
  return state;
}

function abortRun(rootArg, reason) {
  const root = getProjectRoot(rootArg || process.cwd());
  const state = loadActiveRun(root);
  if (!state) return null;
  if (['completed', 'aborted'].includes(state.status)) return state;
  state.status = 'aborted';
  state.abortedAt = nowIso();
  state.abortReason = validateEvidence(reason, 'abort reason');
  persistState(root, state);
  appendEvent(root, state.runId, { type: 'run.aborted', reason: state.abortReason });
  persistLastPointer(root, state);
  clearActivePointer(root, state.runId);
  return state;
}

function getNextAction(state) {
  if (!state) return { kind: 'none', message: 'No active ECC MAX run.' };
  if (state.status === 'completed') return { kind: 'done', message: 'ECC MAX run is completed.' };
  if (state.status === 'aborted') return { kind: 'done', message: 'ECC MAX run was aborted.' };
  const failures = failedNodes(state);
  if (state.status === 'blocked') {
    return {
      kind: 'budget_exhausted',
      nodes: failures,
      message: `Repair budget exhausted. Failed nodes: ${failures.join(', ') || 'none'}. User/operator intervention or abort is required.`
    };
  }
  if (failures.length > 0) {
    return {
      kind: 'repair',
      nodes: failures,
      message: `Repair required before graph can advance: ${failures.join(', ')}`
    };
  }
  const ready = readyNodes(state);
  if (ready.length > 0) return { kind: 'ready', nodes: ready, message: `Ready nodes: ${ready.join(', ')}` };
  const unresolved = unresolvedNodes(state);
  return { kind: 'blocked', nodes: unresolved, message: `No runnable node. Unresolved: ${unresolved.join(', ')}` };
}

function checkStopGate(rootArg) {
  const root = getProjectRoot(rootArg || process.cwd());
  const state = loadActiveRun(root);
  if (!state) return { allowed: true, reason: 'no-active-run' };
  if (['completed', 'aborted'].includes(state.status)) return { allowed: true, reason: state.status };
  const action = getNextAction(state);
  return {
    allowed: false,
    reason: state.status,
    runId: state.runId,
    task: state.task,
    action,
    message: `[ECC MAX] Completion blocked for run ${state.runId}. ${action.message}. Use /max to continue, or explicitly abort the run.`
  };
}

function renderStatus(state) {
  if (!state) return 'No active ECC MAX run.\n';
  const lines = [
    `ECC MAX run: ${state.runId}`,
    `Task: ${state.task}`,
    `Status: ${state.status}`,
    `Failures: ${state.totalFailures}/${state.failureBudget}`,
    '',
    'Node                 Status           Failures  Evidence',
    '-------------------  ---------------  --------  --------'
  ];
  for (const def of GRAPH) {
    const node = state.nodes[def.id];
    const ev = (node.lastEvidence || '').replace(/\s+/g, ' ').slice(0, 72);
    lines.push(`${def.id.padEnd(19)}  ${node.status.padEnd(15)}  ${String(node.failures).padEnd(8)}  ${ev}`);
  }
  lines.push('', getNextAction(state).message);
  return `${lines.join('\n')}\n`;
}

function renderReport(state) {
  if (!state) return '# ECC MAX Report\n\nNo run found.\n';
  const lines = [
    '# ECC MAX Report',
    '',
    `- Run: \`${state.runId}\``,
    `- Task: ${state.task}`,
    `- Status: **${state.status.toUpperCase()}**`,
    `- Created: ${state.createdAt}`,
    `- Updated: ${state.updatedAt}`,
    `- Failures used: ${state.totalFailures}/${state.failureBudget}`,
    '',
    '| Domain | Result | Evidence |',
    '|---|---|---|'
  ];
  for (const def of GRAPH) {
    const node = state.nodes[def.id];
    const evidence = (node.lastEvidence || '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
    lines.push(`| ${def.label} | ${node.status.toUpperCase()} | ${evidence || '—'} |`);
  }
  const failures = failedNodes(state);
  lines.push('', `Mandatory blocker count: ${failures.length}`);
  if (failures.length) lines.push(`Blocked nodes: ${failures.join(', ')}`);
  return `${lines.join('\n')}\n`;
}

module.exports = {
  GRAPH,
  RUN_SCHEMA,
  getProjectRoot,
  getMaxDir,
  getRuntimeDir,
  getRunsDir,
  getActivePath,
  getLastPath,
  initRun,
  loadRun,
  loadActiveRun,
  loadLatestRun,
  listRuns,
  readyNodes,
  failedNodes,
  unresolvedNodes,
  markNode,
  retryNode,
  abortRun,
  getNextAction,
  checkStopGate,
  renderStatus,
  renderReport
};
