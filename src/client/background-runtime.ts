/**
 * Background runtime: owns the durable conversation-background section and
 * applies it to the page as CSS variables that the plugin's enhancement
 * stylesheet consumes (a wallpaper layer behind the column content plus a
 * readable wash). It binds the settings scope, publishes a reactive snapshot
 * to subscribers, and exposes the three user verbs (apply an image, adjust
 * wash opacity, clear). It never renders React: the browser surface is a pure
 * CSS override driven by the variables it writes.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'
import {
  DEFAULT_BACKGROUND_OPACITY, IMAGE_DATA_URL_FIELD, OPACITY_FIELD,
  type BackgroundSettings,
} from '../background-settings.ts'
import { fileToBackgroundDataUrl } from './image.ts'

/** CSS custom-property names the enhancement stylesheet reads. */
export const BG_IMAGE_VAR = '--dsh-bg-image'
export const BG_WASH_VAR = '--dsh-bg-wash-opacity'

/** The reactive snapshot subscribers observe and the settings row renders. */
export interface BackgroundSnapshot {
  /** Inline image data URL when configured; undefined when cleared. */
  imageDataUrl: string | undefined
  /** Wash opacity in [0, 1]; the enhancement stylesheet tints by it. */
  opacity: number
}

/**
 * Own the background section and the user verbs over it.
 */
export class BackgroundRuntime {
  private readonly host: SettingsScope<BackgroundSettings>
  private readonly listeners = new Set<() => void>()

  constructor(ctx: Context, host: SettingsScope<BackgroundSettings>) {
    this.host = host
    ctx.effect(() => host.subscribe(() => { this.emit() }), 'ui-background: settings scope adoption')
    ctx.effect(() => () => { this.clearDom() }, 'ui-background: DOM cleanup')
  }

  /** @returns the current durable snapshot. */
  getSnapshot(): BackgroundSnapshot {
    const value = this.host.getSnapshot().value
    const imageDataUrl = value?.[IMAGE_DATA_URL_FIELD]
    return {
      imageDataUrl: imageDataUrl === undefined || imageDataUrl === '' ? undefined : imageDataUrl,
      opacity: value?.[OPACITY_FIELD] ?? DEFAULT_BACKGROUND_OPACITY,
    }
  }

  /**
   * Observe snapshot replacements.
   * @param listener - invoked after each committed change.
   * @returns the disposer removing this observer.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Replace the background image from a picked file (downsampled and encoded
   * by the image admission path).
   * @param file - the user-picked raster file.
   * @returns completion after the durable write lands.
   */
  async applyImage(file: File): Promise<void> {
    const dataUrl = await fileToBackgroundDataUrl(file)
    await this.host.set(IMAGE_DATA_URL_FIELD, dataUrl)
  }

  /**
   * Set the readable wash opacity over the image.
   * @param opacity - wash opacity in [0, 1]; 0 renders the image raw.
   */
  setOpacity(opacity: number): void {
    void this.host.set(OPACITY_FIELD, opacity)
  }

  /** Remove the background image; restores the plain column tint. */
  clear(): void {
    void this.host.unset(IMAGE_DATA_URL_FIELD)
  }

  /** Write the current snapshot into CSS variables on the document root. */
  writeToDom(): void {
    /* v8 ignore next -- the no-document arm runs only outside a browser (node e2e). */
    if (typeof document === 'undefined') return
    const snap = this.getSnapshot()
    const root = document.documentElement
    root.style.setProperty(BG_IMAGE_VAR, snap.imageDataUrl === undefined ? 'none' : `url("${snap.imageDataUrl}")`)
    root.style.setProperty(BG_WASH_VAR, String(snap.opacity))
  }

  /** Remove the plugin's CSS variables from the document root. */
  clearDom(): void {
    /* v8 ignore next -- the no-document arm runs only outside a browser (node e2e). */
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.style.removeProperty(BG_IMAGE_VAR)
    root.style.removeProperty(BG_WASH_VAR)
  }

  private emit(): void {
    this.writeToDom()
    for (const listener of this.listeners) listener()
  }
}
