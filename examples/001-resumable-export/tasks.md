# Tasks: Resumable CLI export

**Spec:** 001-resumable-export
**Progress:** 2/4

## Phase 1: Foundation

- [x] T001 Define and validate the version 1 checkpoint record; cover malformed fields and unsupported versions with unit tests.
- [x] T002 Add `--resume` parsing and resolve the checkpoint before exporter construction; verify missing and mismatched destinations fail without writes.

## Phase 2: Behavior

- [ ] T003 Resume from the last committed item without duplicating output; verify with an interrupted integration run.

## Phase 3: Integration and release

- [ ] T004 Cover completed-checkpoint behavior, update CLI documentation, and audit AC-001 through AC-004 with the smallest complete check set.

## Blockers and decisions

- None.
