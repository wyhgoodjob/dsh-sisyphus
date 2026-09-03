/**
 * Regression spec: a preset must not re-mount the host-plane
 * `@deepseek-ai/dsh-tool-subagent-report` row.
 *
 * `tool-subagent-report` registers a CONTINUABLE SETUP on the host subagent
 * registry. Mounting it both in the host composition and inside a preset runs
 * the setup twice per child, so every continuable child fails with
 * `prompt section "tool:report" is already registered in this scope`.
 *
 * This spec reproduces that exact failure. It lives here because it imports
 * harness packages; to run it, copy it into a built deepseek-harness checkout
 * at packages/preset/agent-presets/tests/, point the preset under test at
 * `tests/presets` via PRESET_ROOT, and run:
 *
 *   pnpm exec vitest run packages/preset/agent-presets/tests/tool-report-collision.spec.ts
 *
 * The harness composition below mirrors the real web profile host services
 * that a preset's rows resolve against (with the host report row included),
 * plus a jsonl persistence backend so the continuable child path is live.
 */

import { pathToFileURL } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import Group from '@deepseek-ai/cordis-plugin-group'
import LlmRuntime from '@deepseek-ai/dsh-llm'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import AgentPresets from '@deepseek-ai/dsh-agent-presets'
import SubagentRuntime from '@deepseek-ai/dsh-subagent'
import * as SpawnInProcess from '@deepseek-ai/dsh-subagent-spawn-in-process'
import * as ForkInProcess from '@deepseek-ai/dsh-subagent-fork-in-process'
import JobsLocal from '@deepseek-ai/dsh-jobs-local'
import SkillRuntime from '@deepseek-ai/dsh-skill'
import * as ShellEnv from '@deepseek-ai/dsh-shell-env'
import BashLocal from '@deepseek-ai/dsh-bash-local'
import FsLocal from '@deepseek-ai/dsh-fs-local'
import SubprocessLocal from '@deepseek-ai/dsh-subprocess-local'
import WebRuntime from '@deepseek-ai/dsh-web'
import * as WebFetchHttp from '@deepseek-ai/dsh-web-fetch-http'
import UserQuestions from '@deepseek-ai/dsh-user-questions'
import * as SubagentReport from '@deepseek-ai/dsh-tool-subagent-report'
import JsonlSessionPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import { describe, expect, it } from 'vitest'

const HARNESS_ROOT = process.env.HARNESS_ROOT ?? '/home/clover/deepseek-harness'
const APP_BASE = pathToFileURL(`${HARNESS_ROOT}/apps/cli`).href + '/'
const PRESET_ROOT = process.env.PRESET_ROOT ?? '/tmp/opencode/dsh-home/.agent-presets'
const PERSIST_ROOT = process.env.PERSIST_ROOT ?? `/tmp/opencode/dsh-home/persist`

async function harness(): Promise<Context> {
  const ctx = new Context()
  ctx.baseUrl = APP_BASE
  await ctx.plugin(Loader)
  ctx.loader.builtins.include = Include
  ctx.loader.builtins.group = Group
  await ctx.plugin(LlmRuntime)
  await ctx.plugin(SessionStore)
  await ctx.plugin(SystemPrompt, { persona: '' })
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(SessionProjectionRegistry)
  await ctx.plugin(AgentLoop, { agents: [] })
  await ctx.plugin(SubagentRuntime)
  await ctx.plugin(SpawnInProcess)
  await ctx.plugin(ForkInProcess)
  await ctx.plugin(JobsLocal)
  await ctx.plugin(SkillRuntime)
  await ctx.plugin(ShellEnv)
  await ctx.plugin(BashLocal)
  await ctx.plugin(FsLocal)
  await ctx.plugin(SubprocessLocal)
  await ctx.plugin(WebRuntime)
  await ctx.plugin(WebFetchHttp)
  await ctx.plugin(UserQuestions)
  await ctx.plugin(SubagentReport)
  await ctx.plugin(JsonlSessionPersistence, { root: `${PERSIST_ROOT}` })
  await ctx.plugin(AgentPresets, {
    default: 'sisyphus',
    roots: [{ path: PRESET_ROOT, trust: 'user' as const }],
    includeShippedRoot: false,
    includeUserRoot: false,
  })
  return ctx
}

describe('sisyphus preset vs host-plane tool-subagent-report', () => {
  it('spawns a continuable child without double-registering the report section', async () => {
    const ctx = await harness()
    const handle = await ctx.agents.create({
      sessionId: SessionId('s-regression'),
      meta: { agentPreset: 'sisyphus', cwd: `${HARNESS_ROOT}` },
      setup: async (agentCtx: Context) => {
        await ctx.agentPresets.mount(agentCtx, 'sisyphus')
      },
    })
    const names = ctx.tools.schemas(handle.agent).map(schema => schema.name).sort()
    expect(names).toContain('explore')
    expect(names).toContain('subagent')
    const continuation = await ctx.subagents.startContinuable({
      provider: 'spawn',
      label: 'regression',
      request: {
        prompt: [{ type: 'text' as const, text: 'do not run anything real' }],
        parent: handle.agent,
      },
      signal: new AbortController().signal,
    })
    expect(continuation.childId.length).toBeGreaterThan(0)
    await handle.dispose()
  })
})