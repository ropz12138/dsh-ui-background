/** Background runtime: section adoption, DOM variables, and the three verbs. */
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'
import { IMAGE_DATA_URL_FIELD, OPACITY_FIELD, type BackgroundSettings } from '../src/background-settings.ts'
import { BackgroundRuntime, BG_IMAGE_VAR, BG_WASH_VAR } from '../src/client/background-runtime.ts'

/** Minimal controllable settings host. */
function makeHost(section?: Partial<BackgroundSettings>): {
  host: SettingsScope<BackgroundSettings>
  setSpy: ReturnType<typeof vi.fn>
  unsetSpy: ReturnType<typeof vi.fn>
} {
  const listeners = new Set<() => void>()
  let value: BackgroundSettings | undefined = section === undefined
    ? undefined
    : { imageDataUrl: section.imageDataUrl ?? '', ...(section.opacity !== undefined ? { opacity: section.opacity } : {}) } as BackgroundSettings
  const setSpy = vi.fn((field: string, v: unknown) => {
    value = { ...(value ?? { imageDataUrl: '', opacity: 0 }), [field]: v as never }
    listeners.forEach(l => l())
    return Promise.resolve()
  })
  const unsetSpy = vi.fn((field: string) => {
    if (value) { const next: Record<string, unknown> = { ...value }; delete next[field]; value = next as unknown as BackgroundSettings }
    listeners.forEach(l => l())
    return Promise.resolve()
  })
  const host: SettingsScope<BackgroundSettings> = {
    getSnapshot: () => ({ status: 'ready', value, base: undefined, user: undefined, revision: 1, writable: true, mode: 'host' }),
    subscribe: (l) => { listeners.add(l); return () => listeners.delete(l) },
    set: setSpy,
    unset: unsetSpy,
  }
  return { host, setSpy, unsetSpy }
}

afterEach(() => {
  vi.restoreAllMocks()
  document.documentElement.style.removeProperty(BG_IMAGE_VAR)
  document.documentElement.style.removeProperty(BG_WASH_VAR)
})

describe('BackgroundRuntime', () => {
  it('getSnapshot returns an undefined image and the default opacity when absent', () => {
    const ctx = new Context()
    const { host } = makeHost({})
    expect(new BackgroundRuntime(ctx, host).getSnapshot()).toEqual({ imageDataUrl: undefined, opacity: 0.4 })
  })

  it('normalizes an empty image to undefined and preserves a configured opacity', () => {
    const ctx = new Context()
    const { host } = makeHost({ imageDataUrl: '', opacity: 0.3 })
    const runtime = new BackgroundRuntime(ctx, host)
    expect(runtime.getSnapshot()).toEqual({ imageDataUrl: undefined, opacity: 0.3 })
  })

  it('holds a set image', () => {
    const ctx = new Context()
    const { host } = makeHost({ imageDataUrl: 'data:image/png;base64,a' })
    expect(new BackgroundRuntime(ctx, host).getSnapshot().imageDataUrl).toBe('data:image/png;base64,a')
  })

  it('subscribe observes commits and writeToDom publishes variables', () => {
    const ctx = new Context()
    const { host } = makeHost({ imageDataUrl: 'data:image/png;base64,a', opacity: 0.6 })
    const runtime = new BackgroundRuntime(ctx, host)
    const seen: number[] = []
    const dispose = runtime.subscribe(() => seen.push(1))
    runtime.writeToDom()
    expect(document.documentElement.style.getPropertyValue(BG_IMAGE_VAR)).toContain('data:image/png;base64,a')
    expect(document.documentElement.style.getPropertyValue(BG_WASH_VAR)).toBe('0.6')
    void host.set(OPACITY_FIELD, 0.8)
    expect(seen).toEqual([1])
    dispose()
    void host.set(OPACITY_FIELD, 0.5)
    expect(seen).toEqual([1])
  })

  it('writeToDom uses none for a cleared image', () => {
    const ctx = new Context()
    const { host } = makeHost({})
    new BackgroundRuntime(ctx, host).writeToDom()
    expect(document.documentElement.style.getPropertyValue(BG_IMAGE_VAR)).toBe('none')
  })

  it('applyImage encodes the file then writes the durable field', async () => {
    const ctx = new Context()
    const { host, setSpy } = makeHost({})
    const runtime = new BackgroundRuntime(ctx, host)
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 10, height: 10, close: vi.fn() })))
    const toDataURL = vi.fn(() => 'data:image/webp;base64,ENC')
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as never)
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(toDataURL)
    const file = new File([new Uint8Array([1, 2, 3])], 'bg.png', { type: 'image/png' })
    await runtime.applyImage(file)
    expect(toDataURL).toHaveBeenCalled()
    expect(setSpy).toHaveBeenCalledWith(IMAGE_DATA_URL_FIELD, 'data:image/webp;base64,ENC')
  })

  it('setOpacity writes the opacity field and clear unsets the image field', () => {
    const ctx = new Context()
    const { host, setSpy, unsetSpy } = makeHost({ imageDataUrl: 'x' })
    const runtime = new BackgroundRuntime(ctx, host)
    runtime.setOpacity(0.25)
    expect(setSpy).toHaveBeenCalledWith(OPACITY_FIELD, 0.25)
    runtime.clear()
    expect(unsetSpy).toHaveBeenCalledWith(IMAGE_DATA_URL_FIELD)
  })

  it('clears the DOM variables when the owning context disposes', async () => {
    const ctx = new Context()
    const { host } = makeHost({ imageDataUrl: 'data:image/png;base64,a', opacity: 0.6 })
    const apply = (c: Context): void => {
      const runtime = new BackgroundRuntime(c, host)
      runtime.writeToDom()
    }
    const fiber = ctx.plugin({ inject: [], apply })
    await fiber.await()
    expect(document.documentElement.style.getPropertyValue(BG_IMAGE_VAR)).toContain('data:image/png;base64,a')
    await fiber.dispose()
    expect(document.documentElement.style.getPropertyValue(BG_IMAGE_VAR)).toBe('')
    expect(document.documentElement.style.getPropertyValue(BG_WASH_VAR)).toBe('')
  })
})
