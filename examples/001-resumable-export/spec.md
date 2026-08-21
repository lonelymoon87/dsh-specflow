# Specification: Resumable CLI export

**Spec ID:** 001-resumable-export
**Status:** Approved
**Created:** 2026-08-21

## Problem

Large CLI exports can be interrupted by network failures or process restarts. Today the user must restart from the first item, which wastes time and may duplicate output already written by the failed run.

## User stories

- As an operator, I want an interrupted export to resume from a durable checkpoint so that completed work is not repeated.
- As a maintainer, I want invalid or incompatible checkpoints to fail before output changes so that recovery never corrupts an export.

## Functional requirements

- FR-001: The CLI MUST accept `--resume <checkpoint-path>` for an existing export.
- FR-002: The exporter MUST atomically record the last committed item after each completed batch.
- FR-003: A resumed run MUST continue after the recorded item and MUST NOT emit an item that was already committed.
- FR-004: The CLI MUST reject malformed checkpoints and checkpoints created for a different export destination before writing output.

## Non-goals

- Resuming work across different export destinations.
- Coordinating multiple exporter processes against one checkpoint.
- Migrating checkpoints created by unreleased development builds.

## Edge cases and failure behavior

- A missing checkpoint fails with a path-specific error and leaves the destination unchanged.
- A checkpoint whose last item no longer exists fails before export work begins.
- Interruption between output commit and checkpoint replacement may repeat the current batch, so each item write must remain idempotent.

## Acceptance criteria

- AC-001: Given an export interrupted after item 200, when it resumes from the saved checkpoint, then item 201 is the first processed item.
- AC-002: Given a malformed checkpoint, when the user passes `--resume`, then the command exits non-zero without modifying output.
- AC-003: Given a checkpoint for another destination, when the user passes `--resume`, then the command names the destination mismatch and exits non-zero.
- AC-004: Given a successful resumed run, when the final item is committed, then the checkpoint records completion and a second resume exits successfully without new output.

## Assumptions

- The exporter already commits output in deterministic batches.
- Item identifiers remain stable within one export destination.

## Open questions

- None.
