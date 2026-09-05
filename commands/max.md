---
description: Run the executable ECC MAX graph for a major task, release, full audit, or explicit maximum-coverage request.
argument-hint: "[task, feature, release, or audit target]"
---

# /max

Run ECC MAX for `$ARGUMENTS` as an explicit state machine, not as a loose checklist.

## Start or resume

1. Check for an active run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/max-graph.js" status
```

If there is no active run, initialize one:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/max-graph.js" init --task "$ARGUMENTS"
```

If an unrelated stale run exists, do not silently replace it. Ask the user or explicitly abort it with a reason.

2. Ask the `orchestrator` to route the ready graph nodes to the smallest sufficient specialist set.
3. Before important decisions, search Second Brain with the local CLI and verify recalled claims against current code/tests.

## Execute the graph

At every step run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/max-graph.js" next
```

For every ready node, do the actual work and then record one of:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/max-graph.js" pass <node> --evidence "<concrete evidence>"
node "${CLAUDE_PLUGIN_ROOT}/scripts/max-graph.js" na <node> --reason "<why this domain is genuinely not applicable>"
node "${CLAUDE_PLUGIN_ROOT}/scripts/max-graph.js" fail <node> --evidence "<failing test, finding, screenshot, log, or exact gap>"
```

A failed node freezes graph progress. Repair the problem, then reopen only that node:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/max-graph.js" retry <node> --evidence "<what was repaired>"
```

Retry budgets are finite. Do not loop forever or convert FAIL into N/A.

## Coverage contract

Every domain must finish as PASS or N/A with evidence/reason. The graph includes discovery, requirements, architecture, planning, implementation, tests, code review, silent-failure review, security, dependency/supply-chain risk, data integrity/migrations, privacy, design, accessibility, performance, documentation, deployment/rollback/observability, E2E, production readiness, final verification, self-evaluation, learning and final completion.

- Code changes require real tests/review unless the graph records a defensible N/A.
- Sensitive surfaces require security review; Claude/MCP/hook changes also use `security-scan`.
- User-facing UI requires design review; accessibility/E2E are explicitly resolved rather than silently skipped.
- Performance is PASS only with measurement evidence; otherwise N/A with a concrete reason.
- Agent/OCR/nondeterministic pipelines use `eval-harness` during verification.

## Memory and exit

Record durable, evidence-backed decisions/learnings/risks with:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/max-brain.js" ...
```

Then export the human-readable brain index:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/max-brain.js" export
```

Do not claim completion until the `final` node passes. ECC MAX's Stop gate blocks session completion while an active run remains unresolved.

Emergency/user-directed cancellation is explicit:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/max-graph.js" abort --reason "<reason>"
```
