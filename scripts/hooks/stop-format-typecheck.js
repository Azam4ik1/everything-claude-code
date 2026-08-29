#!/usr/bin/env node
/**
 * Stop Hook: Batch format and typecheck all JS/TS files edited this response
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Reads the accumulator written by post-edit-accumulator.js and processes all
 * edited files in one pass: groups files by project root for a single formatter
 * invocation per root, and groups .ts/.tsx files by tsconfig dir for a single
 * tsc --noEmit per tsconfig. The accumulator is cleared on read so repeated
 * Stop calls do not double-process files.
 *
 * Per-batch timeout is proportional to the number of batches so the total
 * never exceeds the Stop hook budget (90 s reserved for overhead).
 *
 * ECC MAX extension: after formatting/typechecking, an active MAX graph is
 * mechanically checked. An unresolved run blocks Stop with exit code 2.
 */

'use strict';

const crypto = require('crypto');
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { findProjectRoot, detectFormatter, resolveFormatterBin } = require('../lib/resolve-formatter');

const MAX_STDIN = 1024 * 1024;
const TOTAL_BUDGET_MS = 270_000;
const UNSAFE_PATH_CHARS = /[&|<>^%!\s()]/;

function parseAccumulator(raw) {
  return [...new Set(raw.split('\n').map(l => l.trim()).filter(Boolean))];
}

function isPluginClonePath(filePath, cwd = process.cwd(), homeDir = os.homedir()) {
  const resolved = path.resolve(filePath);
  const roots = [path.join(cwd, '.claude', 'plugins')];
  if (homeDir) roots.push(path.join(homeDir, '.claude', 'plugins'));

  return roots.some(root => {
    const rel = path.relative(root, resolved);
    return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
  });
}

function getAccumFile() {
  const raw =
    process.env.CLAUDE_SESSION_ID ||
    crypto.createHash('sha1').update(process.cwd()).digest('hex').slice(0, 12);
  const sessionId = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  return path.join(os.tmpdir(), `ecc-edited-${sessionId}.txt`);
}

function formatBatch(projectRoot, files, timeoutMs) {
  const formatter = detectFormatter(projectRoot);
  if (!formatter) return;

  const resolved = resolveFormatterBin(projectRoot, formatter);
  if (!resolved) return;

  const existingFiles = files.filter(f => fs.existsSync(f));
  if (existingFiles.length === 0) return;

  const fileArgs =
    formatter === 'biome'
      ? [...resolved.prefix, 'check', '--write', ...existingFiles]
      : [...resolved.prefix, '--write', ...existingFiles];

  try {
    if (process.platform === 'win32' && resolved.bin.endsWith('.cmd')) {
      if (existingFiles.some(f => UNSAFE_PATH_CHARS.test(f))) {
        process.stderr.write('[Hook] stop-format-typecheck: skipping batch — unsafe path chars\n');
        return;
      }
      const result = spawnSync(resolved.bin, fileArgs, { cwd: projectRoot, shell: true, stdio: 'pipe', timeout: timeoutMs });
      if (result.error) throw result.error;
    } else {
      execFileSync(resolved.bin, fileArgs, { cwd: projectRoot, stdio: ['pipe', 'pipe', 'pipe'], timeout: timeoutMs });
    }
  } catch {
    // Formatter not installed or failed — non-blocking
  }
}

function findTsConfigDir(filePath) {
  let dir = path.dirname(filePath);
  const fsRoot = path.parse(dir).root;
  let depth = 0;
  while (dir !== fsRoot && depth < 20) {
    if (fs.existsSync(path.join(dir, 'tsconfig.json'))) return dir;
    dir = path.dirname(dir);
    depth++;
  }
  return null;
}

function typecheckBatch(tsConfigDir, editedFiles, timeoutMs) {
  const isWin = process.platform === 'win32';
  const npxBin = isWin ? 'npx.cmd' : 'npx';
  const args = ['tsc', '--noEmit', '--pretty', 'false'];
  const opts = { cwd: tsConfigDir, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: timeoutMs };

  let stdout = '';
  let stderr = '';
  let failed = false;

  try {
    if (isWin) {
      const result = spawnSync(npxBin, args, { ...opts, shell: true });
      if (result.error) return;
      if (result.status !== 0) {
        stdout = result.stdout || '';
        stderr = result.stderr || '';
        failed = true;
      }
    } else {
      execFileSync(npxBin, args, opts);
    }
  } catch (err) {
    stdout = err.stdout || '';
    stderr = err.stderr || '';
    failed = true;
  }

  if (!failed) return;

  const lines = (stdout + stderr).split('\n');
  for (const filePath of editedFiles) {
    const relPath = path.relative(tsConfigDir, filePath);
    const candidates = new Set([filePath, relPath]);
    const relevantLines = lines
      .filter(line => { for (const c of candidates) { if (line.includes(c)) return true; } return false; })
      .slice(0, 10);
    if (relevantLines.length > 0) {
      process.stderr.write(`[Hook] TypeScript errors in ${path.basename(filePath)}:\n`);
      relevantLines.forEach(line => process.stderr.write(line + '\n'));
    }
  }
}

function main() {
  const accumFile = getAccumFile();

  let raw;
  try {
    raw = fs.readFileSync(accumFile, 'utf8');
  } catch {
    return;
  }

  try { fs.unlinkSync(accumFile); } catch { /* best-effort */ }

  const files = parseAccumulator(raw);
  if (files.length === 0) return;

  const byProjectRoot = new Map();
  for (const filePath of files) {
    if (!/\.(ts|tsx|js|jsx)$/.test(filePath)) continue;
    if (isPluginClonePath(filePath)) continue;
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) continue;
    const root = findProjectRoot(path.dirname(resolved));
    if (!byProjectRoot.has(root)) byProjectRoot.set(root, []);
    byProjectRoot.get(root).push(resolved);
  }

  const byTsConfigDir = new Map();
  for (const filePath of files) {
    if (!/\.(ts|tsx)$/.test(filePath)) continue;
    if (isPluginClonePath(filePath)) continue;
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) continue;
    const tsDir = findTsConfigDir(resolved);
    if (!tsDir) continue;
    if (!byTsConfigDir.has(tsDir)) byTsConfigDir.set(tsDir, []);
    byTsConfigDir.get(tsDir).push(resolved);
  }

  const totalBatches = byProjectRoot.size + byTsConfigDir.size;
  const perBatchMs = totalBatches > 0 ? Math.floor(TOTAL_BUDGET_MS / totalBatches) : 60_000;

  for (const [root, batch] of byProjectRoot) formatBatch(root, batch, perBatchMs);
  for (const [tsDir, batch] of byTsConfigDir) typecheckBatch(tsDir, batch, perBatchMs);
}

function run(rawInput) {
  try {
    main();
  } catch (err) {
    process.stderr.write(`[Hook] stop-format-typecheck error: ${err.message}\n`);
  }

  // ECC MAX: make an unresolved executable graph a real Stop blocker.
  // This hook is already registered in standard/strict profiles, so MAX gains
  // enforcement without adding a duplicate Stop entry to hooks.json.
  try {
    const maxGate = require('./max-stop-gate');
    const gateResult = maxGate.run(rawInput);
    if (gateResult && typeof gateResult === 'object' && Number.isInteger(gateResult.exitCode) && gateResult.exitCode !== 0) {
      return gateResult;
    }
  } catch (err) {
    process.stderr.write(`[ECC MAX] stop gate warning: ${err.message}\n`);
  }

  return rawInput;
}

if (require.main === module) {
  let stdinData = '';
  let truncated = false;
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => {
    if (stdinData.length < MAX_STDIN) {
      const remaining = MAX_STDIN - stdinData.length;
      stdinData += chunk.substring(0, remaining);
      if (chunk.length > remaining) truncated = true;
    } else {
      truncated = true;
    }
  });
  process.stdin.on('end', () => {
    const output = run(stdinData);
    if (truncated) {
      process.stderr.write('[Hook] stop-format-typecheck: stdin exceeded 1MB; suppressing pass-through (fail-open)\n');
      process.exit(0);
    }
    if (output && typeof output === 'object') {
      if (output.stderr) process.stderr.write(output.stderr);
      if (output.stdout) process.stdout.write(output.stdout);
      process.exit(output.exitCode || 0);
      return;
    }
    if (!output) {
      process.exit(0);
    }
    process.stdout.write(output, () => process.exit(0));
  });
}

module.exports = { run, parseAccumulator, isPluginClonePath };
