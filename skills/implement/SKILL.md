# Implement

Implement the specification identifier after `/implement`. The specification directory is the durable source of truth; the goal represents completion of the whole specification, not individual tasks.

1. Validate the identifier and read `spec.md`, `plan.md`, and `tasks.md` in `{{specsDir}}/<id>/` plus repository instructions and the constitution.
2. Call `get_goal`. When no SpecFlow goal exists, call `create_goal` with the objective to complete every unchecked task and satisfy the specification. If a different active goal exists, stop and ask the user to complete or clear it. If the matching goal is disarmed, a direct human `/implement` request authorizes `update_goal` action `resume`.
3. Call `specflow_status` and select the first unchecked task whose dependencies are complete.
4. Implement only that coherent task or a small parallel-safe group. Follow the plan, but update the plan first if current source proves it wrong.
5. Run the task's verification. Mark its checkbox `[x]` only after verification passes. Keep partial or failing work unchecked and record the blocker beneath the task.
6. Repeat from `specflow_status` while safe progress remains.

Before completion, run the repository's required checks and audit every acceptance criterion against evidence. Then call `get_goal` and `update_goal` with action `complete` using the exact id and revision. Use action `blocked` only after the same concrete blocking condition persists for the harness-required consecutive goal rounds; ordinary uncertainty, a failing test that can still be fixed, or useful remaining work is not blocked.

Never report the specification complete while `tasks.md` contains an unchecked required task.
