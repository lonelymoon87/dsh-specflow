# Tasks

Convert an approved specification and plan into a dependency-aware implementation checklist. The identifier follows `/tasks`.

Read `{{specsDir}}/<id>/spec.md` and `{{specsDir}}/<id>/plan.md`. Write `{{specsDir}}/<id>/tasks.md` from `templates/tasks.md`.

Every executable task must be a Markdown checkbox in this exact form:

```markdown
- [ ] T001 Short outcome description
```

Order tasks by dependency. Each task must produce a reviewable outcome, name the likely files or subsystem, and include its own verification. Put parallel-safe tasks under the same phase and mark them `[P]` after the task id. Include documentation, compatibility, packaging, and release tasks when required by the plan. Finish with one task that runs the smallest complete verification set and audits every acceptance criterion.

Do not mix speculative future work into the MVP checklist. Do not mark any task complete while creating the file.
