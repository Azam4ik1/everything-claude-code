---
description: Run ECC MAX exhaustive-but-bounded orchestration for a major task, release, or full audit.
argument-hint: "[task, feature, release, or audit target]"
---

# /max

Run the MAX workflow for `$ARGUMENTS`.

1. Consult the `orchestrator` agent first and obtain scope, risk, specialist routing, ordering and mandatory gates.
2. Recover relevant `second-brain` context and verify stale facts against the repository.
3. Execute the routed specialist work. Do not invoke irrelevant agents merely because they exist.
4. For code changes, require tests and code review.
5. For sensitive surfaces, require security review. For Claude/MCP/hook configuration changes, also use `security-scan`.
6. For user-facing UI, require `design-reviewer`; use accessibility/a11y review and E2E for critical flows.
7. Use performance analysis only with a measurable performance question.
8. Finish with `verification-loop`; use `eval-harness` for nondeterministic/agent/OCR pipelines.
9. Report every relevant domain as PASS, FAIL, NOT APPLICABLE, or NOT VERIFIED.
10. Update Second Brain with decisions, verified learnings and unresolved risks.

Do not claim completion if any mandatory gate is FAIL or NOT VERIFIED.
