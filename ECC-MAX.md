# ECC MAX

ECC MAX is the deep-work profile built on top of `ecc-lite`. It combines a bounded executable agent graph, persistent project memory, security, design, data/privacy, production-readiness and verification layers without restoring the full collision-heavy ECC catalog.

## What makes MAX different

`ecc-lite` is a focused daily engineering profile. `ecc-max` is for work where omission is expensive: major features, releases, audits, sensitive workflows, agent/OCR pipelines and explicit "check everything relevant" requests.

MAX does **not** mean "run every agent". It means every graph domain is explicitly resolved as PASS or N/A with evidence, and FAIL blocks forward progress until repaired within a finite retry budget.

## Executable graph

```text
                         intake
                    ┌──────┴──────┐
                  memory       discovery
                    └──────┬──────┘
                       requirements
                    ┌──────┴──────┐
              architecture       plan
                    └──────┬──────┘
                     implementation
   ┌───────────┬──────────┬──────────┬─────────────┬──────────────┐
 tests     code review  failure    security     data/privacy    design
                       review      + supply       + migrations     ├─ accessibility
                                  chain                         └─ e2e
   ├──────── documentation ───── operations ───── performance ─────┤
   └──────────────────── production readiness ─────────────────────┘
                               ↓
                          verification
                               ↓
                           self_eval
                               ↓
                            learning
                               ↓
                              final
```

The graph runner is `scripts/max-graph.js`. Independent ready nodes can be handled in parallel. Dependencies, N/A eligibility, failures and retry budgets are deterministic state, not remembered only in chat.

## Commands

Inside Claude Code:

```text
/max <major task>
/brain status
```

Direct runtime inspection:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/max-graph.js" status
node "${CLAUDE_PLUGIN_ROOT}/scripts/max-graph.js" next
node "${CLAUDE_PLUGIN_ROOT}/scripts/max-graph.js" report
node "${CLAUDE_PLUGIN_ROOT}/scripts/max-brain.js" status
node "${CLAUDE_PLUGIN_ROOT}/scripts/max-brain.js" search "query"
```

## Mechanical Stop gate

The existing Stop formatter/typecheck hook is extended in this branch with an ECC MAX gate. If an active MAX run still has ready or failed nodes, Stop returns exit code 2. Claude receives the remaining work instead of being allowed to declare completion.

A deliberate user/operator cancellation remains possible:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/max-graph.js" abort --reason "reason"
```

Runtime state lives under `.claude/ecc-max/runtime/` and is automatically git-ignored.

## Second Brain

Second Brain is self-contained and offline-capable. Its canonical store is an append-only event log under `.claude/ecc-max/brain/`.

It supports:
- typed memories: fact, decision, learning, risk, design, procedure, handoff;
- evidence requirements for facts/decisions/learnings;
- lexical retrieval;
- explicit graph relations (`supports`, `depends_on`, `contradicts`, `supersedes`, `relates_to`);
- one-hop related-memory recall;
- risk resolution and supersession history;
- a generated human-readable `INDEX.md`;
- rejection of common credential/secret shapes.

Existing ECC SessionStart/Stop persistence remains the episodic memory layer; Second Brain is the durable project-knowledge layer.

## Specialist team

Core engineering:
- orchestrator
- code-explorer
- planner
- architect
- tdd-guide
- python-reviewer
- code-reviewer
- build-error-resolver
- refactor-cleaner

Independent gates:
- silent-failure-hunter
- security-reviewer
- database-reviewer
- performance-optimizer
- design-reviewer
- a11y-architect
- e2e-runner
- doc-updater

Agent-system work:
- harness-optimizer
- agent-evaluator
- loop-operator

The orchestrator routes only specialists needed by currently ready graph nodes.

## Quality layers

MAX exposes focused skills for Python/testing, verification/evals, security/AgentShield, continuous agent loops, continuous learning, cost-aware LLM routing, design direction/polish/design systems, accessibility/E2E, production audit, agent self-evaluation, team orchestration and bounded recursive decision ledgers.

## Safety properties

- HIGH security findings remain blockers.
- Mandatory control gates cannot be N/A.
- FAIL cannot be converted directly to PASS; a retry requires repair evidence.
- Per-node and global failure budgets stop endless self-repair loops.
- Performance PASS requires measured evidence.
- N/A always requires a specific reason.
- The final node cannot pass until every upstream domain is resolved.
- Durable memory rejects likely credentials and does not treat recalled text as higher authority than current code/tests/user instruction.

## Tests

The branch contains Node built-in tests for graph dependencies, parallel readiness, mandatory gates, failure/retry budgets, Stop gating, final completion, memory search, secret rejection, graph relations and risk resolution.

Run focused tests:

```bash
node --test tests/lib/max-graph-engine.test.js tests/lib/max-brain-store.test.js
```

## Install

```text
/plugin marketplace add Azam4ik1/everything-claude-code@ecc-max
/plugin install ecc-max@ecc-max
```

`main` remains the full upstream-style fork. `ecc-lite` remains the small profile. `ecc-max` is isolated in its own branch.
