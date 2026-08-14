/** Durable conversation-background preferences stored in the Host user-settings document. */

import z from '@deepseek-ai/schemastery'

/** Settings namespace owned by the background plugin. */
export const BACKGROUND_SETTINGS_NAMESPACE = 'chat-background'

/** Field carrying the background image as an inline data URL (compressed). */
export const IMAGE_DATA_URL_FIELD = 'imageDataUrl'

/** Field carrying the readable wash opacity layered over the image. */
export const OPACITY_FIELD = 'opacity'

/** Default wash opacity: a mild translucent base keeps text readable over the wallpaper. */
export const DEFAULT_BACKGROUND_OPACITY = 0.4

/** Default-resolved background section ('' means no image configured). */
export interface BackgroundSettings {
  /** Inline background image (data:image/...) or '' when none is configured. */
  imageDataUrl: string
  /** Wash opacity layered over the image; 0 renders the image raw. */
  opacity: number
}

/** Durable section schema shared by the Host registration and the browser scope. */
export const BackgroundSettingsSchema: z<BackgroundSettings> = z.object({
  [IMAGE_DATA_URL_FIELD]: z.string().default(''),
  [OPACITY_FIELD]: z.number().min(0).max(1).default(DEFAULT_BACKGROUND_OPACITY),
})
