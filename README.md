# dsh-specflow

[![CI](https://github.com/lonelymoon87/dsh-specflow/actions/workflows/ci.yml/badge.svg)](https://github.com/lonelymoon87/dsh-specflow/actions/workflows/ci.yml)
[![Latest DSH compatibility](https://github.com/lonelymoon87/dsh-specflow/actions/workflows/dsh-compatibility.yml/badge.svg)](https://github.com/lonelymoon87/dsh-specflow/actions/workflows/dsh-compatibility.yml)
[![Release](https://img.shields.io/github/v/release/lonelymoon87/dsh-specflow)](https://github.com/lonelymoon87/dsh-specflow/releases/latest)
[![License](https://img.shields.io/github/license/lonelymoon87/dsh-specflow)](./LICENSE)

Specification-driven development for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), built from native skills, commands, goals, tools, and runtime context.

The installable v0.1.1 release targets DSH 0.1.0-rc.6. npm publication is an optional future distribution channel.

[简体中文](./README.zh-CN.md)

## Why SpecFlow

SpecFlow keeps requirements, design decisions, and task progress in reviewable workspace files instead of relying on one chat's memory. A durable DSH goal represents the whole specification, while `tasks.md` remains the authoritative record for individual work items.

The MVP provides:

- five portable skills: `constitution`, `specify`, `plan-spec`, `tasks`, and `implement`;
- four discoverable UI commands: `/specify`, `/plan-spec`, `/tasks`, and `/implement`;
- a `specflow_status` tool that reads checkbox progress from `tasks.md`;
- goal creation and explicit resume for `/implement`;
- active goal and task progress in DSH runtime context;
- templates for `spec.md`, `plan.md`, and `tasks.md`.

## Artifact protocol

```text
.dsh/
├── memory/
│   └── constitution.md
└── specs/
    └── 001-example-feature/
        ├── spec.md
        ├── plan.md
        └── tasks.md
```

The spec directory is the durable source of truth. SpecFlow does not add a required custom session event or maintain a second hidden task database.

## Install

The package currently targets the DSH `0.1.0-rc.6` plugin APIs and Node.js `^22.19 || >=24`.

```sh
dsh plugin --profile web add https://github.com/lonelymoon87/dsh-specflow/releases/download/v0.1.1/dsh-specflow-0.1.1.tgz
```

The release tarball is prebuilt and needs no build allowance. A pinned source install is also supported:

```sh
dsh plugin --profile web add github:lonelymoon87/dsh-specflow#v0.1.1
```

The source install runs this package's `prepare` build. pnpm 10 and later reject it until the profile allowlists the exact package key printed by the failed command; apply that instruction and rerun the same `dsh plugin add` command. Replace `web` with `headless` to install into the one-shot agent profile.

To upgrade, rerun `dsh plugin add` with the newer release URL. To uninstall:

```sh
dsh plugin --profile web remove dsh-specflow
```

After installation, start DSH with the same profile and use:

```text
/constitution Require focused tests for every behavior change
/specify Add resumable exports to the CLI
/plan-spec 001-resumable-exports
/tasks 001-resumable-exports
/implement 001-resumable-exports
```

## Configuration

The bundle inserts the plugin with defaults. A profile may configure the plugin entry directly:

```yaml
- id: specflow
  name: dsh-specflow
  config:
    specsDir: .dsh/specs
    autoInjectContext: true
```

`specsDir` may be workspace-relative or absolute. `autoInjectContext` controls only the model-facing progress snapshot; it does not change goal or artifact behavior.

## Design constraints

- Exports are named only; no default export is mixed into the Loader module.
- All registry contributions use the owning DSH service's effect-backed `register()` method.
- Commands enqueue an explicit user skill invocation so the skill loader remains the single owner of method instructions.
- `/implement` refuses to replace an unrelated active goal.
- Task completion is counted only from Markdown checkbox lines.

## Release evidence

- The v0.1.1 tarball installs directly from its HTTPS release URL into a clean DSH profile.
- The packed bundle and pinned GitHub source install both appear in `dsh --dump-config`.
- CI covers Node 22.19 and Node 24; a scheduled workflow repeats the real install against `@deepseek-ai/dsh@latest`.
- Bugs and compatibility reports are tracked in [GitHub Issues](https://github.com/lonelymoon87/dsh-specflow/issues).

## License

[MIT](./LICENSE)
