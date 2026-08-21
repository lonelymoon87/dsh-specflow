# Resumable workflow example

[`001-resumable-export`](./001-resumable-export/) is a complete SpecFlow artifact set paused halfway through implementation. It demonstrates the state a new DSH session can resume without reconstructing the work from chat history.

Copy the directory into a test repository:

```sh
mkdir -p .dsh/specs
cp -R node_modules/dsh-specflow/examples/001-resumable-export .dsh/specs/
```

Then ask SpecFlow for the durable state:

```text
/specflow 001-resumable-export
```

Expected result:

```text
SpecFlow 001-resumable-export: 2/4 complete; 2 pending.
Tasks: .dsh/specs/001-resumable-export/tasks.md
Next task: T003 Resume from the last committed item without duplicating output; verify with an interrupted integration run.
Continue: /implement 001-resumable-export
```

Run `/implement 001-resumable-export` to bind the artifacts to a durable DSH goal and continue from T003. The example describes a hypothetical CLI so it can be copied into any repository without adding source files or dependencies.
