'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');

const brain = require('../../scripts/lib/max-brain-store');

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-max-brain-'));
}

test('brain stores evidence-backed memories and searches them', () => {
  const root = tempRoot();
  const decision = brain.addEntry(root, {
    type: 'decision',
    title: 'Use strict ID validation',
    body: 'National IDs must be exact length before CSV export.',
    evidence: 'tests/test_validation.py covers invalid lengths',
    tags: 'ocr,validation'
  });
  const results = brain.search(root, 'ID validation');
  assert.ok(results.some(x => x.entry.id === decision.id));
  assert.equal(brain.status(root).byType.decision, 1);
});

test('brain rejects likely secrets', () => {
  const root = tempRoot();
  assert.throws(() => brain.addEntry(root, {
    type: 'risk',
    title: 'Credential exposure',
    body: 'password=super-secret-value',
    evidence: 'scan'
  }), /credential or secret/);
});

test('brain supports graph relations and risk resolution', () => {
  const root = tempRoot();
  const risk = brain.addEntry(root, {
    type: 'risk', title: 'Parser drift', body: 'OCR heading drift may break parsing.', evidence: 'REAL_003 regression'
  });
  const learning = brain.addEntry(root, {
    type: 'learning', title: 'Use title anchors', body: 'Anchor extraction to visual field titles.', evidence: 'REAL_001..003 comparison'
  });
  const rel = brain.relate(root, learning.id, risk.id, 'supports', 'mitigation evidence');
  assert.equal(rel.type, 'supports');
  assert.equal(brain.getEntry(root, risk.id).relations.length, 1);
  brain.resolveEntry(root, risk.id, 'Regression suite now covers heading drift.');
  assert.equal(brain.status(root).unresolvedRisks, 0);
  const exported = brain.exportMarkdown(root);
  assert.equal(fs.existsSync(exported), true);
});
