---
name: max-orchestration
description: Exhaustive-but-bounded ECC MAX workflow for major features, releases, high-risk changes, or explicit requests to inspect every relevant angle. Do not trigger for trivial edits or narrow questions.
metadata:
  origin: ECC-MAX
---

# MAX Orchestration

MAX means comprehensive coverage of relevant domains, not blindly invoking every tool.

## Trigger
Use when the user explicitly asks for MAX/full/deep coverage, before an important release, or when a change is high-risk or cross-domain.

## Pipeline
1. FACTS — code-explorer; docs-lookup only if external API/library behavior matters.
2. MEMORY — recover relevant Second Brain state; verify it.
3. PLAN — planner; architect when boundaries/data flow/interfaces change.
4. BUILD — implementation with tests; tdd-guide for new behavior/bug fixes.
5. LANGUAGE REVIEW — python-reviewer when Python changed.
6. GENERAL REVIEW — code-reviewer.
7. FAILURE REVIEW — silent-failure-hunter for error paths/background automation.
8. SECURITY — security-reviewer + security-review for sensitive surfaces; security-scan when Claude/MCP/hooks/config changed.
9. DESIGN — design-reviewer for user-facing UI; a11y-architect/accessibility for accessibility; e2e-runner for critical browser flows.
10. PERFORMANCE — performance-optimizer only when performance matters and can be measured.
11. CLEANUP — refactor-cleaner after tests pass, never before behavior is understood.
12. VERIFY — verification-loop; formal eval-harness for agent/OCR/nondeterministic pipelines.
13. LEARN — update Second Brain and continuous-learning-v2 only with evidence-backed lessons.

## Exit criteria
Do not claim done while a mandatory test fails, a HIGH security issue is unresolved, critical user flow is unverified, or a known blocker is hidden.

Report skipped stages explicitly so coverage is auditable.
