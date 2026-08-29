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
- Normal requests: smallest sufficient specialist set.
- `/max`: exhaustive coverage of every relevant domain, with explicit N/A/skipped reporting.
- `/brain`: inspect or synchronize durable project memory.

## Safety
MAX is not 'run everything'. The orchestrator must explain why each specialist is included or skipped. Security findings marked HIGH and failed mandatory verification gates block a completion claim.

## Memory
ECC's existing SessionStart/Stop hooks provide episodic continuity. `second-brain` adds concise project-level state, decisions, learnings, risks and design direction under `.claude/ecc-max/` when needed.

## Install branch
Use the `ecc-max` branch and the `ecc-max` plugin entry once the branch validation is complete.
