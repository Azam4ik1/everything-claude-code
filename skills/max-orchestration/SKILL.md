---
name: max-orchestration
description: Executable exhaustive-but-bounded ECC MAX graph for major features, releases, high-risk changes, or explicit maximum-coverage requests. Do not trigger for trivial edits or narrow questions.
metadata:
  origin: ECC-MAX
---

# MAX Orchestration

MAX is a deterministic state machine with bounded retries and mechanical completion gating. It is not "ask every agent" and it is not a prose checklist.

## Runtime

The graph engine is:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/max-graph.js" <command>
```

Runtime state is project-local under `.claude/ecc-max/runtime/`. It is separate from durable Second Brain knowledge.

## Graph topology

```text
intake
  ├─ memory ─┐
  └─ discovery ─┤
              requirements
              ├─ architecture ─┐
              └─ plan ─────────┤
                            implementation
          ┌──────────┬──────────┬──────────┬──────────┬─────────────┐
        tests   code_review failure_review security dependency_security
          │          │          │         │      data_integrity / privacy
          │          │          │         │      design ─ accessibility
          │          │          │         │      performance / docs / ops
          │          │          │         └───── e2e ─ production_readiness
          └──────────┴──────────┴───────────────────────────────────────┘
                              verification
                                   ↓
                               self_eval
                                   ↓
                                learning
                                   ↓
                                  final
```

Independent ready nodes may run in parallel. Dependencies are enforced by the engine.

## State contract

A node is one of:
- `pending`
- `passed`
- `failed`
- `not_applicable`

Only PASS and N/A resolve dependencies. N/A is permitted only for explicitly optional domains and always requires a concrete reason. Mandatory control gates cannot be N/A.

FAIL freezes forward progress. Repair the issue, then use `retry <node>`; retry and total-failure budgets prevent infinite self-repair loops.

## Operating loop

1. `init --task ...` or resume the active run.
2. `next` to discover runnable nodes.
3. Route each ready node to the narrowest specialist.
4. Perform actual work; gather tests/logs/diffs/screenshots/findings as evidence.
5. Mark PASS / FAIL / N/A through the CLI.
6. Repair failed nodes within budget.
7. Run `verification`, `self_eval`, `learning`, then `final`.
8. Persist only durable lessons/decisions/risks to Second Brain.

## Completion gate

In ECC MAX, the existing Stop hook is extended with the MAX stop gate. While an active graph is unresolved, a Stop event returns exit code 2 and tells the agent which nodes are ready or failed. This prevents "looks done" from replacing evidence.

The user can deliberately cancel with `abort --reason ...`. Never fake completion by deleting runtime state.
