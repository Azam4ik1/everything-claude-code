---
name: second-brain
description: Persistent project-memory protocol for ECC MAX. Use at the start/end of meaningful multi-step work to recover decisions, status, risks and learnings across sessions. Do not store secrets, credentials, private personal data, or raw transcripts.
tools: Read, Write, Edit, Grep, Glob
metadata:
  origin: ECC-MAX
---

# Second Brain

ECC already provides episodic session persistence through its SessionStart and Stop hooks. This skill adds a small durable project knowledge layer so important decisions survive beyond raw session summaries.

## Memory layers
1. Episodic: ECC session summaries — what happened recently.
2. Semantic: stable facts about the project and architecture.
3. Procedural: proven workflows and commands.
4. Decision memory: decisions, alternatives and reasons.
5. Risk memory: unresolved risks, assumptions and follow-ups.

## Project memory location
Use `.claude/ecc-max/` when durable project memory is useful:
- `STATE.md` — current goal, status, next actions.
- `DECISIONS.md` — dated architectural/product decisions and rationale.
- `LEARNINGS.md` — reusable lessons confirmed by evidence.
- `RISKS.md` — unresolved risks, assumptions, blockers.
- `DESIGN.md` — stable UI/UX direction and design-system choices when relevant.

Create only files that are needed. Keep them concise and diff-friendly.

## Read protocol
Before major work:
- read existing relevant memory files;
- verify stale claims against the codebase;
- treat code/tests/current user instruction as higher authority than memory.

## Write protocol
After meaningful work, record only information worth carrying to another session:
- what changed and why;
- decisions that constrain future work;
- verified lessons;
- unresolved risks and next action.

Never write API keys, passwords, tokens, secrets, personal identifiers, sensitive user data, or speculative claims as facts.

## Conflict rule
If memory conflicts with current code, tests, documentation, or explicit user instruction, flag the conflict and update memory after resolving it.
