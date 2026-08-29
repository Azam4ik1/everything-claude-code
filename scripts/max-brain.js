#!/usr/bin/env node
'use strict';

const path = require('path');
const brain = require('./lib/max-brain-store');

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

function rootFrom(args) {
  return args.root ? path.resolve(String(args.root)) : brain.projectRoot(process.cwd());
}

function help() {
  process.stdout.write(`ECC MAX Second Brain\n\nCommands:\n  status [--json]\n  add --type <fact|decision|learning|risk|design|procedure|handoff> --title <text> --body <text> [--evidence <text>] [--tags a,b]\n  search <query> [--type <type>] [--limit 10] [--json]\n  show <memory-id> [--json]\n  relate <from-id> <to-id> [--type supports|depends_on|contradicts|supersedes|relates_to] [--note <text>]\n  resolve <memory-id> --note <text>\n  supersede <old-id> <new-id> [--note <text>]\n  export\n\nThe brain rejects common credential/secret shapes and stores an append-only event log under .claude/ecc-max/brain/.\n`);
}

function json(value) { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); }

function printSearch(results) {
  if (!results.length) {
    process.stdout.write('No matching memories.\n');
    return;
  }
  for (const { entry, score } of results) {
    process.stdout.write(`[${score.toFixed(2)}] ${entry.id} ${entry.type.toUpperCase()} ${entry.status} — ${entry.title}\n`);
    process.stdout.write(`  ${entry.body.replace(/\s+/g, ' ').slice(0, 180)}\n`);
    if (entry.evidence) process.stdout.write(`  evidence: ${entry.evidence.replace(/\s+/g, ' ').slice(0, 160)}\n`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] || 'help';
  const root = rootFrom(args);

  switch (command) {
    case 'help':
    case '--help':
    case '-h':
      help();
      return;
    case 'status': {
      const result = brain.status(root);
      if (args.json) json(result);
      else {
        process.stdout.write(`Second Brain: ${result.totalEntries} memories, ${result.activeEntries} active, ${result.unresolvedRisks} unresolved risks, ${result.relations} relations.\n`);
        process.stdout.write(`${Object.entries(result.byType).map(([k, v]) => `${k}=${v}`).join(' ')}\n`);
      }
      return;
    }
    case 'add': {
      const entry = brain.addEntry(root, {
        type: args.type,
        title: args.title,
        body: args.body,
        evidence: args.evidence,
        tags: args.tags,
        source: args.source || 'ecc-max'
      });
      json(entry);
      return;
    }
    case 'search': {
      const query = args._.slice(1).join(' ').trim();
      if (!query) throw new Error('search requires a query.');
      const results = brain.search(root, query, { type: args.type, limit: args.limit });
      if (args.json) json(results); else printSearch(results);
      return;
    }
    case 'show': {
      const id = args._[1];
      if (!id) throw new Error('show requires a memory id.');
      const result = brain.getEntry(root, id);
      if (args.json) json(result);
      else {
        const e = result.entry;
        process.stdout.write(`${e.id} ${e.type.toUpperCase()} ${e.status}\n${e.title}\n${e.body}\n`);
        if (e.evidence) process.stdout.write(`Evidence: ${e.evidence}\n`);
        if (result.relations.length) process.stdout.write(`Relations: ${result.relations.map(r => `${r.type}:${r.from}->${r.to}`).join(', ')}\n`);
      }
      return;
    }
    case 'relate': {
      const from = args._[1];
      const to = args._[2];
      if (!from || !to) throw new Error('relate requires <from-id> <to-id>.');
      json(brain.relate(root, from, to, args.type, args.note));
      return;
    }
    case 'resolve': {
      const id = args._[1];
      if (!id) throw new Error('resolve requires a memory id.');
      json(brain.resolveEntry(root, id, args.note));
      return;
    }
    case 'supersede': {
      const oldId = args._[1];
      const newId = args._[2];
      if (!oldId || !newId) throw new Error('supersede requires <old-id> <new-id>.');
      brain.supersedeEntry(root, oldId, newId, args.note);
      process.stdout.write(`Superseded ${oldId} with ${newId}.\n`);
      return;
    }
    case 'export': {
      process.stdout.write(`${brain.exportMarkdown(root)}\n`);
      return;
    }
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

try {
  main();
} catch (err) {
  process.stderr.write(`[ECC MAX Brain] ${err.message}\n`);
  process.exitCode = 1;
}
