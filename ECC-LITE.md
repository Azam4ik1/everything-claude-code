# ECC Lite

A focused profile derived from ECC for Python, document-processing, automation, and agent-harness work.

## What this branch changes

`main` remains the upstream-style ECC fork. The `ecc-lite` branch intentionally reduces automatic routing surfaces.

### Agents (7)

- `planner` — implementation planning
- `architect` — system architecture and technical decisions
- `code-explorer` — trace and understand an existing codebase
- `tdd-guide` — test-first implementation
- `python-reviewer` — Python-specific review
- `code-reviewer` — general quality/security/maintainability review
- `harness-optimizer` — agent-harness reliability and eval-driven optimization

### Skills (9)

- `python-patterns`
- `python-testing`
- `coding-standards`
- `regex-vs-llm-structured-text`
- `content-hash-cache-pattern`
- `verification-loop`
- `eval-harness`
- `iterative-retrieval`
- `strategic-compact`

### Commands (7)

- `/plan`
- `/build-fix`
- `/python-review`
- `/code-review`
- `/quality-gate`
- `/test-coverage`
- `/checkpoint`

### Hooks

Hooks remain available, but the plugin manifest defaults `hook_profile` to `minimal` to reduce overhead. The standard and strict profiles are still available when needed.

## Install this branch in Claude Code

Inside Claude Code:

```text
/plugin marketplace add Azam4ik1/everything-claude-code@ecc-lite
/plugin install ecc-lite@ecc-lite
```

Then reload plugins if Claude Code asks you to.

## Design goal

Keep the high-value engineering loop small and predictable:

```text
explore -> plan -> implement/test -> Python review -> general review -> verify
```

The profile deliberately excludes unrelated language/framework agents and broad overlapping skills so the model has fewer ambiguous routing choices.

## Upstream

This is a focused fork/profile of the MIT-licensed ECC project by Affaan Mustafa:
https://github.com/affaan-m/ECC
