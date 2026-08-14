# Specify

Turn the user's text after `/specify` into a testable product specification. Describe required behavior without choosing implementation details prematurely.

1. Read the repository instructions and constitution if present.
2. Inspect only enough existing code and documentation to identify affected users, current behavior, terminology, and constraints.
3. List `{{specsDir}}/` and allocate the next three-digit sequence. Derive a short lower-kebab-case slug. The final identifier must match `NNN-lower-kebab-case`.
4. Create `{{specsDir}}/<id>/spec.md` from `templates/spec.md`.
5. Replace every placeholder. Do not leave ambiguous acceptance criteria.

The specification must include user stories, functional requirements, non-goals, edge cases, measurable acceptance criteria, assumptions, and open questions. Mark every factual uncertainty as an open question instead of silently deciding it. Do not create `plan.md` or `tasks.md` during this phase.

Finish by reporting the new spec identifier, file path, and the open questions that require human decisions.
