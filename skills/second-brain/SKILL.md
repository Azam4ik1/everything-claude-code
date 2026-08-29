---
name: second-brain
description: Persistent, searchable project-memory and lightweight knowledge-graph protocol for ECC MAX. Use at the start/end of meaningful work to recall decisions, risks and learnings across sessions. Never store secrets, credentials, private personal data, or raw transcripts.
tools: Read, Write, Edit, Grep, Glob, Bash
metadata:
  origin: ECC-MAX
---

# Second Brain

ECC MAX has two complementary memory layers:

1. **Episodic continuity** — existing ECC SessionStart/Stop session summaries.
2. **Durable project knowledge** — the self-contained Second Brain event store in `.claude/ecc-max/brain/`.

The durable layer is not a vector database. It is an inspectable append-only event log with deterministic lexical retrieval and explicit one-hop graph relations. That makes its claims auditable and usable offline; semantic/vector retrieval can be added later without changing the memory contract.

## CLI

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/max-brain.js" <command>
```

## Memory model

Types:
- `fact` — stable verified project fact;
- `decision` — choice + rationale/constraint;
- `learning` — reusable evidence-backed lesson;
- `risk` — unresolved assumption, blocker or hazard;
- `design` — durable UX/design-system direction;
- `procedure` — proven operational workflow;
- `handoff` — concise continuation context.

Relations:
- `supports`
- `depends_on`
- `contradicts`
- `supersedes`
- `relates_to`

## Read protocol

Before major work:
1. run `status`;
2. search with the user's task terms;
3. inspect directly related memories;
4. verify important claims against current code, tests or authoritative documentation;
5. treat current user instruction and repository evidence as higher authority than memory.

Search includes a small one-hop graph boost, so a matching decision can surface a linked risk or learning.

## Write protocol

Store only information that should survive another session. Facts, decisions and learnings require an evidence/source field. Risks remain active until explicitly resolved. Superseded knowledge is marked rather than silently overwritten.

The store rejects common private-key, API-token and password patterns. This is a backstop, not permission to store sensitive information.

## Human-readable export

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/max-brain.js" export
```

This materializes `.claude/ecc-max/brain/INDEX.md` for inspection. The JSONL event log remains canonical.
