/** Background settings schema: defaults and bounds shared by Host and browser. */
import { describe, expect, it } from 'vitest'
import {
  BACKGROUND_SETTINGS_NAMESPACE, DEFAULT_BACKGROUND_OPACITY, IMAGE_DATA_URL_FIELD, OPACITY_FIELD,
  BackgroundSettingsSchema,
} from '../src/background-settings.ts'

describe('BackgroundSettingsSchema', () => {
  it('exports the chat-background namespace and field constants', () => {
    expect(BACKGROUND_SETTINGS_NAMESPACE).toBe('chat-background')
    expect(IMAGE_DATA_URL_FIELD).toBe('imageDataUrl')
    expect(OPACITY_FIELD).toBe('opacity')
    expect(DEFAULT_BACKGROUND_OPACITY).toBe(0.4)
  })

  it('defaults an absent section to empty image and default opacity', () => {
    const resolved = BackgroundSettingsSchema(undefined)
    expect(resolved[IMAGE_DATA_URL_FIELD]).toBe('')
    expect(resolved[OPACITY_FIELD]).toBe(DEFAULT_BACKGROUND_OPACITY)
  })

  it('holds a supplied image and clamps opacity into [0,1]', () => {
    const resolved = BackgroundSettingsSchema({ [IMAGE_DATA_URL_FIELD]: 'data:image/png;base64,abc', [OPACITY_FIELD]: 0.8 })
    expect(resolved[IMAGE_DATA_URL_FIELD]).toBe('data:image/png;base64,abc')
    expect(resolved[OPACITY_FIELD]).toBe(0.8)
  })

  it('rejects an opacity above the upper bound', () => {
    expect(() => BackgroundSettingsSchema({ [IMAGE_DATA_URL_FIELD]: 'x', [OPACITY_FIELD]: 1.5 })).toThrow()
  })
})
