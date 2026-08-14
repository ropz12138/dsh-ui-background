/** ui-background apply wiring: settings scope binding, the settings-row slot
 * registration, and the enhancement stylesheet + DOM variable application. */
// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { TestRemote, usePinnedBrowserLanguages } from '@deepseek-ai/dsh-client-test-runtime'
import { SettingsScopeBinder } from '@deepseek-ai/dsh-client-ui-settings/client'
// Source subpath so coverage lands on src/client/index.ts (cross-package value
// imports would resolve the built client bundle instead).
import { apply, inject } from '../src/client/index.ts'
import { BackgroundSettingRow, type BackgroundSettingRowInjected } from '../src/client/BackgroundSettingRow.tsx'
import { BACKGROUND_SETTINGS_NAMESPACE, BackgroundSettingsSchema } from '../src/background-settings.ts'
import { STYLE_TAG_ID } from '../src/client/styles.ts'
import { en } from '../src/client/locales.ts'

usePinnedBrowserLanguages('zh-CN')

const ROW_SLOT = 'settings.general.item'

async function bench(imageDataUrl: string | undefined, opacity = 0.4) {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const locale = new LocaleRuntime(ctx)
  ctx.provide('locale', locale)
  let section = { imageDataUrl: imageDataUrl ?? '', opacity }
  const namespace = () => ({
    ns: BACKGROUND_SETTINGS_NAMESPACE,
    schema: BackgroundSettingsSchema.toJSON(),
    value: { ...section },
    applies: 'live' as const,
    secrets: [],
    revision: 0,
  })
  const describe = vi.fn(() => Promise.resolve({
    rpcId: 'bg-describe' as never, result: { ok: true as const, value: { writable: true, hasDocument: true, namespaces: [namespace()] } },
  }))
  const mutate = vi.fn((request: { ops: { op: string; path: string[]; value?: unknown }[] }) => {
    for (const op of request.ops) {
      if (op.op === 'set') section = { ...section, [op.path[0]!]: op.value } as never
      else delete section[op.path[0] as keyof typeof section]
    }
    return Promise.resolve({ rpcId: 'bg-mutate' as never, result: { ok: true as const, value: namespace() } })
  })
  ctx.provide('connection', { api: { settings: { describe, mutate } }, isLoopback: true } as never)
  new TestRemote(ctx)
  await ctx.plugin(SettingsScopeBinder).await()
  return { ctx, slots: ctx.get('slots') as SlotRegistry, locale, describe, mutate, setHost: (sectionNext: typeof section) => { section = sectionNext } }
}

function declareRowSlot(slots: SlotRegistry): void {
  slots.register(
    { name: 'root', children: { [ROW_SLOT]: { kind: 'list', scope: 'root' } } } as never,
    () => null,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
  document.getElementById(STYLE_TAG_ID)?.remove()
  document.documentElement.removeAttribute('style')
})

describe('ui-background apply', () => {
  it('declares the required services', () => {
    expect(inject).toEqual(['slots', 'locale', 'connection', 'remote', 'settingsScope'])
  })

  it('registers localized copy and the settings row', async () => {
    const b = await bench(undefined)
    declareRowSlot(b.slots)
    await b.ctx.plugin({ inject: [...inject], apply }).await()
    expect(b.locale.bind('settings.background')('title')).toBe('对话背景')
    b.locale.setLocale('en')
    expect(b.locale.bind('settings.background')('title')).toBe('Conversation background')
    expect(b.slots.entries(ROW_SLOT).some(e => e.component === BackgroundSettingRow)).toBe(true)
    expect(en.title).toBe('Conversation background')
  })

  it('installs the enhancement stylesheet once and writes the background variables', async () => {
    const b = await bench('data:image/png;base64,INIT', 0.3)
    declareRowSlot(b.slots)
    await b.ctx.plugin({ inject: [...inject], apply }).await()
    const tag = document.getElementById(STYLE_TAG_ID)
    expect(tag).not.toBeNull()
    expect(tag!.textContent).toContain('--dsh-bg-image')
    expect(document.documentElement.style.getPropertyValue('--dsh-bg-image')).toContain('data:image/png;base64,INIT')
    expect(document.documentElement.style.getPropertyValue('--dsh-bg-wash-opacity')).toBe('0.3')
  })

  it('the settings-row inject face routes verbs back to the runtime', async () => {
    const b = await bench('data:image/png;base64,a', 0.4)
    declareRowSlot(b.slots)
    await b.ctx.plugin({ inject: [...inject], apply }).await()
    const entry = b.slots.entries(ROW_SLOT).find(e => e.component === BackgroundSettingRow)!
    const face = entry.inject as unknown as () => BackgroundSettingRowInjected
    const rowFace = face()
    expect(rowFace.getSnapshot().imageDataUrl).toBe('data:image/png;base64,a')
    expect(rowFace.getSnapshot().opacity).toBe(0.4)
    rowFace.setOpacity(0.5)
    rowFace.clear()
    rowFace.subscribe(() => {})() // dispose a subscription
    // Cover the applyImage closure by stubbing the browser raster path.
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 10, height: 10, close: vi.fn() })))
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as never)
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => 'data:image/webp;base64,OUT')
    await rowFace.applyImage(new File([new Uint8Array([1])], 'bg.png', { type: 'image/png' }))
    // setOpacity + clear + applyImage = three writes.
    await vi.waitFor(() => { expect(b.mutate).toHaveBeenCalledTimes(3) })
  })

  it('installs the stylesheet idempotently across plugin mounts and disposes it', async () => {
    // First mount installs the style tag.
    const b = await bench(undefined)
    declareRowSlot(b.slots)
    const fiber = b.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(document.getElementById(STYLE_TAG_ID)).not.toBeNull()
    // A second plugin on a fresh context reuses the existing tag (no duplicate).
    const b2 = await bench(undefined)
    declareRowSlot(b2.slots)
    const fiber2 = b2.ctx.plugin({ inject: [...inject], apply })
    await fiber2.await()
    expect(document.querySelectorAll(`#${STYLE_TAG_ID}`).length).toBe(1)
    // Disposing the second mount (which skipped installation) must not remove
    // the tag the first mount owns.
    await fiber2.dispose()
    expect(document.getElementById(STYLE_TAG_ID)).not.toBeNull()
    // Disposing the owning mount removes the tag.
    await fiber.dispose()
    expect(document.getElementById(STYLE_TAG_ID)).toBeNull()
  })
})
