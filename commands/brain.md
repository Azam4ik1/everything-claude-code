---
description: Operate ECC MAX Second Brain: inspect, search, add, relate, resolve, or export durable project knowledge.
argument-hint: "[status | search <query> | add ... | show <id> | relate ... | resolve ... | export]"
---

# /brain

Use the self-contained ECC MAX Second Brain CLI. It stores an append-only event log in `.claude/ecc-max/brain/`, supports typed memories and explicit graph relations, and rejects common secret/credential shapes.

CLI entry point:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/max-brain.js" <command>
```

Common operations:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/max-brain.js" status
node "${CLAUDE_PLUGIN_ROOT}/scripts/max-brain.js" search "authentication migration"
node "${CLAUDE_PLUGIN_ROOT}/scripts/max-brain.js" add --type decision --title "..." --body "..." --evidence "..." --tags "auth,api"
node "${CLAUDE_PLUGIN_ROOT}/scripts/max-brain.js" add --type risk --title "..." --body "..." --evidence "..."
node "${CLAUDE_PLUGIN_ROOT}/scripts/max-brain.js" relate <from-id> <to-id> --type depends_on --note "..."
node "${CLAUDE_PLUGIN_ROOT}/scripts/max-brain.js" resolve <risk-id> --note "verified resolution evidence"
node "${CLAUDE_PLUGIN_ROOT}/scripts/max-brain.js" export
```

Memory types: `fact`, `decision`, `learning`, `risk`, `design`, `procedure`, `handoff`.
Relations: `supports`, `depends_on`, `contradicts`, `supersedes`, `relates_to`.

Rules:
- verify recalled memories against current code/tests before relying on them;
- facts, decisions and learnings require evidence;
- never persist credentials, tokens, private keys, private personal data or raw transcripts;
- resolve or supersede stale memories rather than silently rewriting history.
