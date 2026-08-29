'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');

const graph = require('../../scripts/lib/max-graph-engine');

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-max-graph-'));
}

function pass(root, id, evidence = `verified ${id}`) {
  return graph.markNode(root, id, 'passed', evidence);
}

test('graph enforces dependencies and exposes parallel ready nodes', () => {
  const root = tempRoot();
  const state = graph.initRun('Build a feature', { root });
  assert.deepEqual(graph.readyNodes(state), ['intake']);
  assert.throws(() => pass(root, 'requirements'), /not ready/);
  pass(root, 'intake');
  const active = graph.loadActiveRun(root);
  assert.deepEqual(graph.readyNodes(active).sort(), ['discovery', 'memory']);
});

test('mandatory nodes cannot be N/A', () => {
  const root = tempRoot();
  graph.initRun('Audit', { root });
  assert.throws(() => graph.markNode(root, 'intake', 'not_applicable', 'not needed'), /mandatory/);
});

test('failed node blocks graph until retry and consumes budgets', () => {
  const root = tempRoot();
  graph.initRun('Build a feature', { root, retryBudgetPerNode: 3, failureBudget: 5 });
  pass(root, 'intake');
  graph.markNode(root, 'memory', 'failed', 'memory conflict found');
  let state = graph.loadActiveRun(root);
  assert.equal(state.nodes.memory.failures, 1);
  assert.equal(graph.getNextAction(state).kind, 'repair');
  assert.equal(graph.checkStopGate(root).allowed, false);
  graph.retryNode(root, 'memory', 'reconciled memory against repository');
  state = graph.loadActiveRun(root);
  assert.equal(state.nodes.memory.status, 'pending');
  pass(root, 'memory');
  assert.equal(graph.loadActiveRun(root).nodes.memory.status, 'passed');
});

test('complete run clears active pointer only after final gate', () => {
  const root = tempRoot();
  graph.initRun('Full MAX audit', { root });

  while (true) {
    const state = graph.loadActiveRun(root);
    if (!state) break;
    const ready = graph.readyNodes(state);
    assert.ok(ready.length > 0, `expected ready nodes, state=${state.status}`);
    for (const id of ready) {
      const def = graph.GRAPH.find(node => node.id === id);
      if (def.allowNA) {
        graph.markNode(root, id, 'not_applicable', `${id} not relevant to this audit fixture`);
      } else {
        pass(root, id);
      }
    }
  }

  assert.equal(graph.loadActiveRun(root), null);
  assert.equal(fs.existsSync(graph.getActivePath(root)), false);
});
