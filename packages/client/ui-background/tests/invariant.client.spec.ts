/** Invariant companion + host-half apply registering the settings namespace. */
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { SettingsProvider, settingsNamespace, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import { apply } from '../src/index.ts'
import { BACKGROUND_SETTINGS_NAMESPACE, DEFAULT_BACKGROUND_OPACITY } from '../src/background-settings.ts'
import * as BackgroundInvariant from '@deepseek-ai/dsh-client-ui-background/invariant'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'

class MemorySettings extends SettingsProvider {
  readonly writable = true
  protected load(): Promise<Record<string, unknown>> { return Promise.resolve({}) }
  protected persist(_ns: SettingsNamespace, _section: Record<string, unknown>): Promise<void> {
    return Promise.resolve()
  }
}

describe('ui-background host', () => {
  it('registers, resolves, and disposes the durable background section', async () => {
    const ctx = new Context()
    await ctx.plugin(MemorySettings).await()
    const fiber = ctx.plugin({ apply })
    await fiber.await()
    const ns = settingsNamespace(BACKGROUND_SETTINGS_NAMESPACE)
    expect(ctx.settings.get(ns)).toEqual({ imageDataUrl: '', opacity: DEFAULT_BACKGROUND_OPACITY })
    await ctx.settings.update(ns, { opacity: 0.7 })
    expect(ctx.settings.get(ns)).toMatchObject({ opacity: 0.7, imageDataUrl: '' })
    await expect(ctx.settings.update(ns, { opacity: 1.5 })).rejects.toThrow()
    await fiber.dispose()
    expect(ctx.settings.describe().map(row => row.ns)).not.toContain(ns)
  })
})

describe('ui-background invariant companion', () => {
  it('registers under the package name with an empty installer', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    await expect(ctx.plugin(BackgroundInvariant).await()).resolves.toBeDefined()
  })
})
