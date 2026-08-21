# Implementation plan: Resumable CLI export

**Spec:** 001-resumable-export
**Status:** Approved

## Current system

The CLI parses export arguments, streams deterministic item batches to one destination, and reports a non-zero exit when a batch fails. It has no checkpoint file or resume argument.

## Proposed design

Add a checkpoint module that validates, reads, and atomically replaces a versioned JSON record. Resolve the checkpoint and destination before constructing the exporter. After each batch output commit, replace the checkpoint with the destination identity and last committed item. A completed checkpoint is a successful no-op when resumed.

## Data, API, events, and configuration

- CLI: add `--resume <checkpoint-path>`.
- File format: `{ "version": 1, "destination": string, "lastItem": string | null, "complete": boolean }`.
- API: pass the resolved starting item into the existing exporter.
- Events and configuration: none.

## Lifecycle and failure behavior

Argument and checkpoint validation completes before destination writes begin. Each batch commits output before the checkpoint is replaced. Cancellation waits for the current output commit, records no uncommitted item, and exits non-zero. Temporary checkpoint files are removed after a successful replacement and on handled failure.

## Security and privacy

Treat checkpoint content as untrusted file input. Reject extra fields, unsupported versions, non-string identities, and paths outside the process's normal filesystem policy. Store no credentials or exported content in the checkpoint.

## Compatibility and migration

Runs without `--resume` retain current behavior. Version 1 is the first checkpoint format, so unsupported versions fail with an upgrade-specific error rather than being interpreted.

## Verification

- Unit: checkpoint schema, destination comparison, completed state, and atomic replacement failure.
- Integration: interruption after a committed batch followed by a resumed run with no duplicate items.
- End-to-end: CLI success, malformed checkpoint, mismatched destination, and completed checkpoint.
- Manual: inspect help text and one resumed run's progress output.

## Documentation and release

Update CLI help, the export guide, release notes, and one copy-paste resume example.

## Rejected alternatives

- Infer progress from destination output. Destinations do not share one reliable enumeration or commit model.
- Rewrite the checkpoint before output. A process failure could then skip output that was never committed.
