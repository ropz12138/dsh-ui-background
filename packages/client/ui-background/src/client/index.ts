/**
 * Client plugin body: bind the background section, drill the snapshot into the
 * page as CSS variables, install the enhancement stylesheet (wallpaper layer +
 * floating composer overrides), and register the settings row. There is no
 * React background component: the browser surface is a pure CSS override driven
 * by variables on the document root, so the plugin never needs a shell slot.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only Context merges: the settingsScope transport and the locale seat.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { en, zh, type BackgroundKey } from './locales.ts'
import { BackgroundSettingRow, type BackgroundSettingRowInjected } from './BackgroundSettingRow.tsx'
import { BackgroundRuntime } from './background-runtime.ts'
import { ENHANCEMENT_CSS, STYLE_TAG_ID } from './styles.ts'
import { BACKGROUND_SETTINGS_NAMESPACE, type BackgroundSettings } from '../background-settings.ts'

export type { BackgroundSettingRowComponentProps, BackgroundSettingRowInjected } from './BackgroundSettingRow.tsx'
export type { BackgroundSnapshot } from './background-runtime.ts'
export type { BackgroundKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The background settings row's copy. */
    'settings.background': BackgroundKey
  }
}

/** Namespace owning this feature's settings-row copy. */
const SETTINGS_NS = 'settings.background'

/** Required services: settings transport plus slots, locale, and remote. */
export const inject = ['slots', 'locale', 'connection', 'remote', 'settingsScope']

/** Install the enhancement stylesheet once (idempotent, plugin-owned tag). */
function installStyle(): () => void {
  /* v8 ignore next -- the no-document arm runs only outside a browser (node e2e). */
  if (typeof document === 'undefined') return () => {}
  const existing = document.getElementById(STYLE_TAG_ID)
  if (existing !== null) return () => {}
  const tag = document.createElement('style')
  tag.id = STYLE_TAG_ID
  tag.dataset.plugin = '@deepseek-ai/dsh-client-ui-background'
  tag.textContent = ENHANCEMENT_CSS
  document.head.appendChild(tag)
  return () => {
    tag.remove()
  }
}

/**
 * Fire the background verbs from the settings row.
 * @param runtime - the owned background runtime.
 * @returns the inject face for the settings row.
 */
function rowInjected(runtime: BackgroundRuntime): BackgroundSettingRowInjected {
  return {
    getSnapshot: () => runtime.getSnapshot(),
    subscribe: (cb) => runtime.subscribe(cb),
    applyImage: (file) => runtime.applyImage(file),
    setOpacity: (opacity) => runtime.setOpacity(opacity),
    clear: () => runtime.clear(),
  }
}

/**
 * Client plugin body: bind the background section, apply the CSS override, and
 * register the settings row.
 * @param ctx - client cordis context.
 */
export function apply(ctx: ClientContext): void {
  const host = ctx.settingsScope.bind<BackgroundSettings>({ namespace: BACKGROUND_SETTINGS_NAMESPACE })
  const runtime = new BackgroundRuntime(ctx, host)

  ctx.effect(() => ctx.locale.register(SETTINGS_NS, { zh, en }), 'ui-background: settings row dictionaries')

  // The wallpaper + floating-composer override rides injected CSS; the runtime
  // already writes the snapshot variables on scope adoption, so apply only
  // needs the stylesheet.
  ctx.effect(installStyle, 'ui-background: enhancement stylesheet')

  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'background',
    order: 30,
    locale: SETTINGS_NS,
    inject: () => rowInjected(runtime),
  }, BackgroundSettingRow))
}
