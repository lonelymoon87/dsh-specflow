# Plan Spec

Create the implementation plan for the specification identifier after `/plan-spec`.

Read `{{specsDir}}/<id>/spec.md`, the project constitution, repository instructions, architecture documentation, and the affected code. Stop if the identifier is invalid, the specification is missing, or an open question would materially change the design.

Write `{{specsDir}}/<id>/plan.md` from `templates/plan.md`. The plan must name:

- the current components and extension points that will be used;
- data, API, event, file-format, and configuration changes;
- failure behavior, security implications, and lifecycle cleanup;
- migrations or compatibility consequences;
- unit, integration, end-to-end, and user-visible verification appropriate to the change;
- documentation and release surfaces;
- rejected alternatives when the choice will matter to a future maintainer.

Use repository-current API names. Verify them in source rather than copying names from the specification. Do not start implementation and do not create tasks until the plan resolves every acceptance path.
