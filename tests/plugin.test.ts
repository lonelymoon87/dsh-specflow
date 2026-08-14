import { describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import type { CommandDefinition } from '@deepseek-ai/dsh-commands'
import type { GoalView } from '@deepseek-ai/dsh-goal'
import type { SkillRegistration } from '@deepseek-ai/dsh-skill'
import { apply, parseTasks, summarizeTasks, type SpecStatus } from '../src/index.ts'

interface CapturedTool {
  readonly name: string
  readonly output: { render(args: { spec?: string }, value: SpecStatus): unknown }
  execute(args: { spec?: string }, exec: { agent?: object; signal: AbortSignal }): Promise<SpecStatus>
  presentCall(args: { spec?: string }): unknown
}

describe('task progress', () => {
  it('counts only Markdown checkboxes and selects the first pending task', () => {
    const markdown = [
      '# Tasks',
      '- [x] T001 complete',
      'ordinary prose [ ] is not a task',
      '  - [ ] T002 next',
      '* [X] T003 also complete',
    ].join('\n')

    expect(parseTasks(markdown)).toEqual([
      { completed: true, text: 'T001 complete' },
      { completed: false, text: 'T002 next' },
      { completed: true, text: 'T003 also complete' },
    ])
    expect(summarizeTasks('001-resume-cli', '.dsh/specs/001-resume-cli/tasks.md', markdown)).toEqual({
      spec: '001-resume-cli',
      tasksPath: '.dsh/specs/001-resume-cli/tasks.md',
      total: 3,
      completed: 2,
      pending: 1,
      nextTask: 'T002 next',
    })
  })

  it('rejects a path-shaped spec identifier', () => {
    expect(() => summarizeTasks('../escape', 'tasks.md', '- [ ] unsafe')).toThrow(/NNN-lower-kebab-case/u)
  })
})

describe('plugin composition', () => {
  it('registers the native surfaces and binds implement to one durable goal', async () => {
    const skills: SkillRegistration[] = []
    const commands: CommandDefinition[] = []
    const tools: Array<Record<string, unknown>> = []
    const contexts: Array<{ name: string; text: (input: { scope?: object }) => string }> = []
    const followup = vi.fn()
    const agent = {
      id: 'agent-1',
      session: { header: { cwd: '/workspace' } },
      followup,
    }
    let goal: GoalView | undefined
    const create = vi.fn((_agent, request: { objective: string }) => {
      goal = {
        id: 'goal-1',
        revision: 1,
        objective: request.objective,
        phase: 'active',
        maxGoalRounds: 256,
        roundsStarted: 0,
        createdAt: 1,
        updatedAt: 1,
        activation: 'armed',
      } as GoalView
      return goal
    })
    const resume = vi.fn((_agent, ref: { id: string; revision: number }) => {
      goal = { ...goal as GoalView, revision: ref.revision + 1, activation: 'armed' }
      return goal
    })
    const fs = {
      resolve: vi.fn(async (path: string) => ({ targetKey: path })),
      readText: vi.fn(async () => '- [x] T001 foundation\n- [ ] T002 behavior\n'),
    }
    const ctx = {
      skills: { register: (skill: SkillRegistration) => { skills.push(skill); return () => {} } },
      commands: { register: (command: CommandDefinition) => { commands.push(command); return () => {} } },
      tools: { register: (tool: Record<string, unknown>) => { tools.push(tool); return () => {} } },
      systemPrompt: {
        context: (context: { name: string; text: (input: { scope?: object }) => string }) => {
          contexts.push(context)
          return () => {}
        },
      },
      agents: { get: (id: string) => id === agent.id ? agent : undefined },
      goals: { get: () => goal, create, resume },
      fs,
    } as unknown as Context

    apply(ctx)

    expect(skills.map(skill => skill.name)).toEqual(['constitution', 'specify', 'plan-spec', 'tasks', 'implement'])
    expect(skills.every(skill => !skill.content.includes('{{specsDir}}'))).toBe(true)
    expect(commands.map(command => command.name)).toEqual(['specify', 'plan-spec', 'tasks', 'implement'])
    expect(tools.map(tool => tool['name'])).toEqual(['specflow_status'])
    expect(contexts.map(context => context.name)).toEqual(['specflow:active-spec'])
    expect(contexts[0]?.text({})).toBe('')

    const specify = commands.find(command => command.name === 'specify')
    expect(specify?.handler({
      commandId: 'command-0',
      agent,
      rawInput: ' add resume support ',
      signal: new AbortController().signal,
    } as never)).toEqual({ kind: 'success', text: 'queued /specify' })
    expect(followup.mock.calls[0]?.[0]).toMatchObject({
      content: [{ type: 'text', text: '/specify add resume support' }],
    })
    followup.mockClear()

    const statusTool = tools[0] as unknown as CapturedTool
    const status = await statusTool.execute(
      { spec: '001-resume-cli' },
      { agent, signal: new AbortController().signal },
    )
    expect(status).toMatchObject({ total: 2, completed: 1, pending: 1, nextTask: 'T002 behavior' })
    expect(statusTool.output.render({ spec: '001-resume-cli' }, status)).toEqual([
      { type: 'text', text: JSON.stringify(status) },
    ])
    expect(statusTool.presentCall({ spec: '001-resume-cli' })).toEqual({
      card: 'generic',
      title: 'Read SpecFlow progress',
      kind: 'read',
      rawInput: '001-resume-cli',
    })
    await expect(statusTool.execute({}, { signal: new AbortController().signal }))
      .rejects.toThrow('requires an agent session')
    await expect(statusTool.execute({}, { agent, signal: new AbortController().signal }))
      .rejects.toThrow('spec is required')

    const implement = commands.find(command => command.name === 'implement')
    expect(implement).toBeDefined()
    const result = await implement?.handler({
      commandId: 'command-1',
      agent,
      rawInput: ' 001-resume-cli ',
      signal: new AbortController().signal,
    } as never)

    expect(result).toEqual({ kind: 'success', text: 'queued /implement for 001-resume-cli' })
    expect(create).toHaveBeenCalledWith(agent, {
      objective: '[SpecFlow:001-resume-cli] Implement every unchecked task in .dsh/specs/001-resume-cli/tasks.md and satisfy the specification.',
    })
    expect(followup).toHaveBeenCalledTimes(1)
    expect(followup.mock.calls[0]?.[0]).toMatchObject({
      content: [{ type: 'text', text: '/implement 001-resume-cli' }],
      source: { kind: 'user' },
    })

    const rendered = contexts[0]?.text({ scope: agent })
    expect(rendered).toContain('Active SpecFlow specification: 001-resume-cli')
    expect(rendered).toContain('1/2 tasks complete; 1 pending. Next task: T002 behavior')

    goal = { ...goal as GoalView, revision: 2, activation: 'disarmed' }
    await implement?.handler({
      commandId: 'command-2',
      agent,
      rawInput: '001-resume-cli',
      signal: new AbortController().signal,
    } as never)
    expect(create).toHaveBeenCalledTimes(1)
    expect(resume).toHaveBeenCalledWith(agent, { id: 'goal-1', revision: 2 })
    expect(followup).toHaveBeenCalledTimes(2)
  })

  it('refuses to replace an unrelated active goal', async () => {
    const commands: CommandDefinition[] = []
    const followup = vi.fn()
    const agent = { id: 'agent-1', session: { header: { cwd: '/workspace' } }, followup }
    const activeGoal = {
      id: 'goal-1',
      revision: 1,
      objective: 'Finish an unrelated migration',
      phase: 'active',
      maxGoalRounds: 10,
      roundsStarted: 0,
      createdAt: 1,
      updatedAt: 1,
      activation: 'armed',
    } as GoalView
    const ctx = {
      skills: { register: () => () => {} },
      commands: { register: (command: CommandDefinition) => { commands.push(command); return () => {} } },
      tools: { register: () => () => {} },
      systemPrompt: { context: () => () => {} },
      agents: { get: () => agent },
      goals: { get: () => activeGoal, create: vi.fn(), resume: vi.fn() },
      fs: { resolve: vi.fn(), readText: vi.fn() },
    } as unknown as Context

    apply(ctx)
    const result = await commands.find(command => command.name === 'implement')?.handler({
      commandId: 'command-1',
      agent,
      rawInput: '001-resume-cli',
      signal: new AbortController().signal,
    } as never)

    expect(result).toEqual({ kind: 'error', text: 'current goal belongs to another workflow; complete or clear it first' })
    expect(followup).not.toHaveBeenCalled()
  })

  it('validates configuration and can disable runtime context', () => {
    const contexts = vi.fn()
    const ctx = {
      skills: { register: () => () => {} },
      commands: { register: () => () => {} },
      tools: { register: () => () => {} },
      systemPrompt: { context: contexts },
    } as unknown as Context

    apply(ctx, { specsDir: 'custom/specs/', autoInjectContext: false })
    expect(contexts).not.toHaveBeenCalled()
    expect(() => apply(ctx, { specsDir: '   ' })).toThrow('specsDir must be a non-empty path')
  })
})
