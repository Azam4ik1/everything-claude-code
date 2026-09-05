---
name: design-excellence
description: High-quality product design workflow for user-facing web/app interfaces. Use when creating or substantially redesigning UI. Establishes a deliberate visual direction, responsive system, states and polish before declaring the interface complete.
metadata:
  origin: ECC-MAX
---

# Design Excellence

## Before implementation
Define a concise design intent:
- primary user/job
- visual character and level of expressiveness
- hierarchy and key action
- typography strategy
- spacing/density strategy
- color/state semantics
- responsive behavior

## Quality rules
- Avoid generic dashboard/card-grid output unless the product genuinely requires it.
- Use a coherent spacing and type scale rather than one-off values.
- Design loading, empty, error, disabled, success and destructive states.
- Make the primary task obvious without decorative noise.
- Prefer restrained motion that communicates state or hierarchy.
- Preserve platform conventions when breaking them adds no user value.
- Reuse tokens/components; do not create visually identical one-offs.
- Check small screens first-class, not as a shrink-down afterthought.

## Review gates
1. UX flow makes sense without explanation.
2. Visual hierarchy is deliberate.
3. Responsive layout has no accidental overflow/crowding.
4. Accessibility review is delegated to accessibility/a11y-architect.
5. Critical flows are rendered and verified, not judged from source code alone.
6. Final pass removes placeholder-looking or AI-template artifacts.
