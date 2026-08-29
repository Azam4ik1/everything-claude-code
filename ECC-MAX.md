# ECC MAX

ECC MAX is the deep-work profile built on top of `ecc-lite`. It adds coordinated specialist routing, persistent project memory, security, design, performance, E2E and continuous-learning layers without restoring the full 286-skill collision surface.

## Architecture

```text
                    SECOND BRAIN
           sessions + durable project memory
                         ^  |
                         |  v
                    ORCHESTRATOR
                         |
       +-----------------+------------------+
       |                 |                  |
   DISCOVERY          BUILD/REVIEW        GUARDIANS
 code-explorer        planner             security-reviewer
 docs-lookup          architect           silent-failure-hunter
                      tdd-guide            verification-loop
                      python-reviewer      eval-harness
                      code-reviewer
                         |
               +---------+---------+
               |                   |
             DESIGN             OPERATIONS
        design-reviewer      performance-optimizer
        a11y-architect       build-error-resolver
        e2e-runner           loop-operator
```

## Modes
- Normal request: the orchestrator selects the smallest sufficient team.
- `/max`: exhaustive coverage of every relevant domain, with explicit PASS / FAIL / NOT APPLICABLE / NOT VERIFIED reporting.
- `/brain`: inspect or synchronize durable project memory.

## Safety
MAX is not "run everything". The orchestrator must explain why each specialist is included or skipped. HIGH security findings and failed mandatory verification gates block a completion claim.

## Memory
ECC's existing SessionStart/Stop hooks provide episodic continuity. `second-brain` adds concise project-level state, decisions, learnings, risks and design direction under `.claude/ecc-max/` when needed. Memory must never contain credentials, tokens, secrets or private personal data.

## Included layers
- Engineering: exploration, planning, architecture, TDD, Python and general review.
- Security: app security review plus AgentShield configuration scanning.
- Design: design direction, UI/UX review, accessibility and E2E validation.
- Reliability: silent-failure hunting, build repair, performance, verification and evals.
- Autonomy: bounded continuous-agent loops with explicit stop conditions.
- Learning: session persistence, Second Brain and continuous-learning-v2.

## Install in Claude Code CLI / Remote Control host
Run each command separately:

```text
/plugin marketplace add Azam4ik1/everything-claude-code@ecc-max
/plugin install ecc-max@ecc-max
```

Then use `/max <task>` for a full audit/workflow or `/brain status` for project memory.

Claude Code cloud sessions that do not expose `/plugin` cannot install this directly; install it on the local Claude Code host and control that session remotely from mobile when needed.
