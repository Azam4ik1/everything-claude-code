#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const engine = require('./lib/max-graph-engine');

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      out._.push(arg);
      continue;
    }
    const eq = arg.indexOf('=');
    if (eq !== -1) {
      out[arg.slice(2, eq)] = arg.slice(eq + 1);
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function printHelp() {
  process.stdout.write(`ECC MAX graph runner\n\nCommands:\n  init --task <text> [--force] [--failure-budget 8] [--retry-budget 3]\n  status [--json]\n  next [--json]\n  pass <node> --evidence <text>\n  fail <node> --evidence <text>\n  na <node> --reason <text>\n  retry <node> --evidence <repair evidence>\n  report [--output <file>]\n  gate\n  abort --reason <text>\n  graph [--json]\n\nRuntime state lives under .claude/ecc-max/runtime/ and is not project knowledge.\n`);
}

function rootFrom(args) {
  return args.root ? path.resolve(String(args.root)) : process.cwd();
}

function activeOrThrow(root) {
  const state = engine.loadActiveRun(root);
  if (!state) throw new Error('No active ECC MAX run. Start one with `max-graph init`.');
  return state;
}

function jsonOut(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] || 'help';
  const root = rootFrom(args);

  switch (command) {
    case 'help':
    case '--help':
    case '-h':
      printHelp();
      return;
    case 'init': {
      const state = engine.initRun(args.task, {
        root,
        force: Boolean(args.force),
        failureBudget: args['failure-budget'] ? Number(args['failure-budget']) : undefined,
        retryBudgetPerNode: args['retry-budget'] ? Number(args['retry-budget']) : undefined
      });
      process.stdout.write(engine.renderStatus(state));
      return;
    }
    case 'status': {
      const state = activeOrThrow(root);
      if (args.json) jsonOut(state); else process.stdout.write(engine.renderStatus(state));
      return;
    }
    case 'next': {
      const state = activeOrThrow(root);
      const action = engine.getNextAction(state);
      if (args.json) jsonOut(action); else process.stdout.write(`${action.message}\n`);
      return;
    }
    case 'pass':
    case 'fail':
    case 'na': {
      const node = args._[1];
      if (!node) throw new Error(`${command} requires a node id.`);
      const evidence = command === 'na' ? args.reason : args.evidence;
      const status = command === 'pass' ? 'passed' : command === 'fail' ? 'failed' : 'not_applicable';
      const state = engine.markNode(root, node, status, evidence);
      process.stdout.write(engine.renderStatus(state));
      return;
    }
    case 'retry': {
      const node = args._[1];
      if (!node) throw new Error('retry requires a node id.');
      const state = engine.retryNode(root, node, args.evidence);
      process.stdout.write(engine.renderStatus(state));
      return;
    }
    case 'report': {
      const state = activeOrThrow(root);
      const report = engine.renderReport(state);
      if (args.output) {
        const output = path.resolve(root, String(args.output));
        fs.mkdirSync(path.dirname(output), { recursive: true });
        fs.writeFileSync(output, report, 'utf8');
        process.stdout.write(`${output}\n`);
      } else {
        process.stdout.write(report);
      }
      return;
    }
    case 'gate': {
      const result = engine.checkStopGate(root);
      if (args.json) jsonOut(result); else process.stdout.write(`${result.allowed ? 'PASS' : 'BLOCK'}: ${result.message || result.reason}\n`);
      process.exitCode = result.allowed ? 0 : 2;
      return;
    }
    case 'abort': {
      const state = engine.abortRun(root, args.reason);
      process.stdout.write(state ? `Aborted ${state.runId}: ${state.abortReason}\n` : 'No active run.\n');
      return;
    }
    case 'graph': {
      if (args.json) jsonOut(engine.GRAPH); else {
        for (const node of engine.GRAPH) {
          process.stdout.write(`${node.id}: deps=[${node.deps.join(', ')}] allowNA=${node.allowNA}\n`);
        }
      }
      return;
    }
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

try {
  main();
} catch (err) {
  process.stderr.write(`[ECC MAX] ${err.message}\n`);
  process.exitCode = 1;
}
