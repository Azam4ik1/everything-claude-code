#!/usr/bin/env node
'use strict';

const { checkStopGate } = require('../lib/max-graph-engine');

const MAX_STDIN = 1024 * 1024;

function run(rawInput) {
  if (String(process.env.ECC_MAX_STOP_GATE || '').trim() === '0') return rawInput;
  const gate = checkStopGate(process.cwd());
  if (gate.allowed) return rawInput;
  return {
    stdout: '',
    stderr: `${gate.message}\n`,
    exitCode: 2
  };
}

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => {
    if (raw.length < MAX_STDIN) raw += chunk.slice(0, MAX_STDIN - raw.length);
  });
  process.stdin.on('end', () => {
    try {
      const result = run(raw);
      if (typeof result === 'string') {
        process.stdout.write(result, () => process.exit(0));
      } else {
        if (result.stderr) process.stderr.write(result.stderr);
        if (result.stdout) process.stdout.write(result.stdout);
        process.exit(result.exitCode || 0);
      }
    } catch (err) {
      // A malformed optional runtime state should never brick Claude Code.
      process.stderr.write(`[ECC MAX] stop gate warning: ${err.message}\n`);
      process.stdout.write(raw, () => process.exit(0));
    }
  });
}

module.exports = { run };
