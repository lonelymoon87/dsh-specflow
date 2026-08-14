/** Specification-driven development workflow for DeepSeek Harness. */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { CommandInvocation } from '@deepseek-ai/dsh-commands'
import type {} from '@deepseek-ai/dsh-fs'
import type { GoalView } from '@deepseek-ai/dsh-goal'
import type { SkillRegistration } from '@deepseek-ai/dsh-skill'
import type {} from '@deepseek-ai/dsh-system-prompt'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'
import z from '@deepseek-ai/schemastery'

/** Loader-facing plugin name. */
export const name = 'specflow'

/** Services required by the complete SpecFlow capability. */
export const inject = ['agents', 'commands', 'fs', 'goals', 'skills', 'systemPrompt', 'tools']

const DEFAULT_SPECS_DIR = '.dsh/specs'
const SPEC_NAME = /^\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*$/u
const GOAL_PREFIX = '[SpecFlow:'
const PACKAGE_ROOT = fileURLToPath(new URL('../', import.meta.url))

/** Deployment configuration for artifact location and prompt context. */
export interface Config {
  /** Workspace-relative or absolute directory containing specification artifacts. */
  specsDir?: string
  /** Whether to publish active SpecFlow goal and task state as runtime context. */
  autoInjectContext?: boolean
}

/** Loader validation for SpecFlow configuration. */
export const Config: z<Config> = z.object({
  specsDir: z.string().default(DEFAULT_SPECS_DIR),
  autoInjectContext: z.boolean().default(true),
})

interface ResolvedConfig {
  readonly specsDir: string
  readonly autoInjectContext: boolean
}

/** Parsed progress from one specification's tasks.md. */
export interface SpecStatus {
  readonly spec: string
  readonly tasksPath: string
  readonly total: number
  readonly completed: number
  readonly pending: number
  readonly nextTask: string | null
}

/** One executable Markdown checkbox parsed from tasks.md. */
export interface TaskLine {
  readonly completed: boolean
  readonly text: string
}

const SKILLS = [
  ['constitution', 'Establish or revise project-wide engineering principles before writing a specification.'],
  ['specify', 'Turn a product idea into a testable specification and acceptance criteria.'],
  ['plan-spec', 'Design an implementation plan for an existing specification.'],
  ['tasks', 'Break an approved plan into ordered, dependency-aware implementation tasks.'],
  ['implement', 'Implement an approved specification task by task and maintain durable progress.'],
] as const

/** Parse Markdown task checkboxes without treating nested prose as work items. */
export function parseTasks(markdown: string): readonly TaskLine[] {
  const tasks: TaskLine[] = []
  for (const line of markdown.split(/\r?\n/u)) {
    const match = /^\s*[-*]\s+\[([ xX])\]\s+(.+?)\s*$/u.exec(line)
    if (match === null) continue
    tasks.push({ completed: match[1]?.toLowerCase() === 'x', text: match[2] ?? '' })
  }
  return tasks
}

/** Summarize one tasks.md body into the tool's canonical value. */
export function summarizeTasks(spec: string, tasksPath: string, markdown: string): SpecStatus {
  assertSpecName(spec)
  const tasks = parseTasks(markdown)
  const completed = tasks.filter(task => task.completed).length
  const nextTask = tasks.find(task => !task.completed)?.text ?? null
  return {
    spec,
    tasksPath,
    total: tasks.length,
    completed,
    pending: tasks.length - completed,
    nextTask,
  }
}

function resolveConfig(config: Config): ResolvedConfig {
  const requestedDir = (config.specsDir ?? DEFAULT_SPECS_DIR).trim()
  if (requestedDir.length === 0) throw new TypeError('specsDir must be a non-empty path')
  const specsDir = requestedDir.length === 1 ? requestedDir : requestedDir.replace(/\/+$/u, '')
  return { specsDir, autoInjectContext: config.autoInjectContext ?? true }
}

function assertSpecName(spec: string): void {
  if (!SPEC_NAME.test(spec)) {
    throw new Error(`spec must match NNN-lower-kebab-case, got ${JSON.stringify(spec)}`)
  }
}

function skillBody(skill: string, specsDir: string): string {
  const path = new URL(`../skills/${skill}/SKILL.md`, import.meta.url)
  return readFileSync(path, 'utf8').replaceAll('{{specsDir}}', specsDir)
}

function skillRegistration(skill: typeof SKILLS[number], specsDir: string): SkillRegistration {
  return {
    name: skill[0],
    description: skill[1],
    content: skillBody(skill[0], specsDir),
    source: 'bundled',
    resourceBase: { kind: 'directory', path: PACKAGE_ROOT },
  }
}

function invocationText(skill: string, rawInput: string): string {
  const input = rawInput.trim()
  return input.length === 0 ? `/${skill}` : `/${skill} ${input}`
}

function dispatchSkill(invocation: CommandInvocation, skill: string): void {
  invocation.signal.throwIfAborted()
  invocation.agent.followup(createUserMessage({
    content: [{ type: 'text', text: invocationText(skill, invocation.rawInput) }],
    source: { kind: 'user' },
  }))
}

function specFromGoal(goal: GoalView | undefined): string | undefined {
  if (goal === undefined || !goal.objective.startsWith(GOAL_PREFIX)) return undefined
  const close = goal.objective.indexOf(']')
  if (close === -1) return undefined
  const spec = goal.objective.slice(GOAL_PREFIX.length, close)
  return SPEC_NAME.test(spec) ? spec : undefined
}

function goalObjective(spec: string, specsDir: string): string {
  return `[SpecFlow:${spec}] Implement every unchecked task in ${specsDir}/${spec}/tasks.md and satisfy the specification.`
}

async function readStatus(
  ctx: Context,
  agent: Agent,
  spec: string,
  config: ResolvedConfig,
  signal?: AbortSignal,
): Promise<SpecStatus> {
  assertSpecName(spec)
  const tasksPath = `${config.specsDir}/${spec}/tasks.md`
  const cwd = agent.session.header.cwd
  const target = await ctx.fs.resolve(tasksPath, {
    ...cwd === undefined ? {} : { cwd },
    ...signal === undefined ? {} : { signal },
  })
  const markdown = await ctx.fs.readText(target, signal)
  return summarizeTasks(spec, tasksPath, markdown)
}

function agentFromScope(ctx: Context, scope: object | undefined): Agent | undefined {
  if (scope === undefined || !('id' in scope)) return undefined
  const candidate = scope as Agent
  return ctx.agents.get(candidate.id) === candidate ? candidate : undefined
}

function renderContext(goal: GoalView, status: SpecStatus | undefined, specsDir: string): string {
  const spec = specFromGoal(goal)
  if (spec === undefined) return ''
  const progress = status === undefined
    ? 'Task progress has not been read in this process. Read tasks.md or call specflow_status before changing code.'
    : `${status.completed}/${status.total} tasks complete; ${status.pending} pending.${status.nextTask === null ? '' : ` Next task: ${status.nextTask}`}`
  return [
    `Active SpecFlow specification: ${spec}`,
    `Artifacts: ${specsDir}/${spec}/`,
    `Goal: ${goal.phase} (${goal.activation})`,
    progress,
    'tasks.md is the authoritative per-task progress record. Update it immediately after verifying each task.',
  ].join('\n')
}

/** Register SpecFlow skills, commands, status tool, goal bridge, and runtime context. */
export function apply(ctx: Context, config: Config = {}): void {
  const resolved = resolveConfig(config)
  const observedStatus = new WeakMap<Agent, SpecStatus>()

  for (const skill of SKILLS) ctx.skills.register(skillRegistration(skill, resolved.specsDir))

  for (const command of [
    { name: 'specify', skill: 'specify', description: 'Create a testable specification from an idea', hint: '<idea>' },
    { name: 'plan-spec', skill: 'plan-spec', description: 'Plan an existing specification', hint: '<NNN-slug>' },
    { name: 'tasks', skill: 'tasks', description: 'Create implementation tasks for a planned specification', hint: '<NNN-slug>' },
  ] as const) {
    ctx.commands.register({
      name: command.name,
      description: command.description,
      input: { hint: command.hint },
      handler: (invocation) => {
        dispatchSkill(invocation, command.skill)
        return { kind: 'success', text: `queued /${command.skill}` }
      },
    })
  }

  ctx.commands.register({
    name: 'implement',
    description: 'Bind a specification to a durable goal and implement its unchecked tasks',
    input: { hint: '<NNN-slug>' },
    handler: async (invocation) => {
      const spec = invocation.rawInput.trim()
      assertSpecName(spec)
      const current = ctx.goals.get(invocation.agent)
      const currentSpec = specFromGoal(current)
      if (current !== undefined && current.phase !== 'complete' && currentSpec !== spec) {
        return { kind: 'error', text: `current goal belongs to ${currentSpec ?? 'another workflow'}; complete or clear it first` }
      }
      const status = await readStatus(ctx, invocation.agent, spec, resolved, invocation.signal)
      invocation.signal.throwIfAborted()
      observedStatus.set(invocation.agent, status)
      if (current === undefined || current.phase === 'complete') {
        ctx.goals.create(invocation.agent, { objective: goalObjective(spec, resolved.specsDir) })
      } else if (current.activation === 'disarmed') {
        ctx.goals.resume(invocation.agent, { id: current.id, revision: current.revision })
      }
      dispatchSkill(invocation, 'implement')
      return { kind: 'success', text: `queued /implement for ${spec}` }
    },
  })

  const statusTool = defineTool({
    name: 'specflow_status',
    description: 'Read the authoritative tasks.md progress for one SpecFlow specification.',
    parameters: {
      spec: {
        type: 'string',
        description: 'NNN-lower-kebab-case spec id. Defaults to the current SpecFlow goal.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          spec: { type: 'string', required: true },
          tasksPath: { type: 'string', required: true },
          total: { type: 'integer', required: true },
          completed: { type: 'integer', required: true },
          pending: { type: 'integer', required: true },
          nextTask: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args, exec) {
      const agent = exec.agent
      if (agent === undefined) throw new Error('specflow_status requires an agent session')
      const spec = args.spec ?? specFromGoal(ctx.goals.get(agent))
      if (spec === undefined) throw new Error('spec is required when no SpecFlow goal is active')
      const status = await readStatus(ctx, agent, spec, resolved, exec.signal)
      observedStatus.set(agent, status)
      return status
    },
    presentCall: args => ({ card: 'generic', title: 'Read SpecFlow progress', kind: 'read', rawInput: args.spec }),
  })
  ctx.tools.register(statusTool)

  if (resolved.autoInjectContext) {
    ctx.systemPrompt.context({
      name: 'specflow:active-spec',
      order: 60,
      text: ({ scope }) => {
        const agent = agentFromScope(ctx, scope)
        if (agent === undefined) return ''
        const goal = ctx.goals.get(agent)
        return goal === undefined ? '' : renderContext(goal, observedStatus.get(agent), resolved.specsDir)
      },
    })
  }
}
