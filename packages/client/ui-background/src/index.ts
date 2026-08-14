/** Host registration for the conversation-background preferences. */

import type { Context } from '@deepseek-ai/cordis'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import { BACKGROUND_SETTINGS_NAMESPACE, BackgroundSettingsSchema } from './background-settings.ts'

export {
  BACKGROUND_SETTINGS_NAMESPACE, DEFAULT_BACKGROUND_OPACITY, IMAGE_DATA_URL_FIELD, OPACITY_FIELD,
  type BackgroundSettings,
} from './background-settings.ts'

/**
 * Register the durable background section when a settings provider exists.
 * @param ctx - Host context whose optional settings service owns the section.
 */
export function apply(ctx: Context): void {
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(
      settingsNamespace(BACKGROUND_SETTINGS_NAMESPACE),
      BackgroundSettingsSchema,
    )
  })
}
