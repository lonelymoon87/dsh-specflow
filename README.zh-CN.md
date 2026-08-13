# dsh-specflow

面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的规格驱动开发套件，直接使用 DSH 原生的 skill、command、goal、tool 和 runtime context。

> 目前处于早期开发阶段。公开仓库已经建立，npm 包尚未发布。

[English](./README.md)

## 它解决什么问题

SpecFlow 把需求、技术方案和任务进度写入可审查的工作区文件，不依赖某一次对话的记忆。一个持久 goal 对应整份规格，单项任务进度始终以 `tasks.md` 为准。

MVP 包含：

- 5 个可移植技能：`constitution`、`specify`、`plan-spec`、`tasks`、`implement`；
- 4 个可在 UI 发现的命令：`/specify`、`/plan-spec`、`/tasks`、`/implement`；
- 从 `tasks.md` 读取复选框进度的 `specflow_status` 工具；
- `/implement` 阶段的 goal 创建和显式恢复；
- 注入 DSH runtime context 的当前目标与任务进度；
- `spec.md`、`plan.md`、`tasks.md` 模板。

## 文件协议

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

规格目录是持久状态的唯一事实源。插件不会再维护一套隐藏的任务数据库，也不会为了保存任务状态增加必需的自定义会话事件。

## 开发安装

当前代码面向 DSH `0.1.0-rc.6` 插件 API，要求 Node.js `^22.19 || >=24`。

```sh
pnpm install
pnpm run check
npm pack
dsh plugin --profile default add ./dsh-specflow-0.1.0.tgz
```

安装后，用同一 profile 启动 DSH，并依次执行：

```text
/constitution 每一项行为改动都必须有聚焦测试
/specify 给 CLI 增加可恢复的导出任务
/plan-spec 001-resumable-exports
/tasks 001-resumable-exports
/implement 001-resumable-exports
```

## 配置

```yaml
- id: specflow
  name: dsh-specflow
  config:
    specsDir: .dsh/specs
    autoInjectContext: true
```

`specsDir` 可以是工作区相对路径或绝对路径。`autoInjectContext` 只控制模型可见的进度快照，不改变 goal 和文件工件的行为。

## 许可证

[MIT](./LICENSE)
