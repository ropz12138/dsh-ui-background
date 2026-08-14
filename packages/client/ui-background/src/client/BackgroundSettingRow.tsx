/**
 * Conversation-background settings row, registered into the General section
 * item slot. It reads the runtime snapshot reactively (via an injected
 * subscribe) and offers: upload a wallpaper, adjust the readable wash opacity,
 * and clear back to the plain column tint.
 */
import { useEffect, useState } from 'react'
import { IconPaperclipOutline16, IconTrashOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { BackgroundSnapshot } from './background-runtime.ts'
import css from './BackgroundSettingRow.module.css'

/** Injected business face over the background runtime. */
export interface BackgroundSettingRowInjected {
  /** Current durable background snapshot. */
  getSnapshot: () => BackgroundSnapshot
  /** Observe snapshot replacements. */
  subscribe: (cb: () => void) => () => void
  /** Apply a user-picked image file as the wallpaper. */
  applyImage: (file: File) => Promise<void>
  /** Set the readable wash opacity in [0, 1]. */
  setOpacity: (opacity: number) => void
  /** Remove the wallpaper. */
  clear: () => void
}

/** Full component props: runtime & locale shares + injected face. */
export type BackgroundSettingRowComponentProps =
  PropsRuntime<'settings.general.item'>
  & PropsLocale<'settings.background'>
  & BackgroundSettingRowInjected

/** Pick a file through the hidden input and route it to applyImage. */
function onPick(event: React.ChangeEvent<HTMLInputElement>, applyImage: BackgroundSettingRowInjected['applyImage']): void {
  const file = event.target.files?.[0]
  if (file !== undefined) void applyImage(file)
  event.target.value = ''
}

/**
 * Render the background settings row.
 * @param props - composed slot props.
 * @returns the row element tree.
 */
export function BackgroundSettingRow({ t, getSnapshot, subscribe, applyImage, setOpacity, clear }: BackgroundSettingRowComponentProps) {
  const [snapshot, setSnapshot] = useState<BackgroundSnapshot>(getSnapshot)
  useEffect(() => subscribe(() => setSnapshot(getSnapshot())), [getSnapshot, subscribe])

  const imageDataUrl = snapshot.imageDataUrl
  const opacity = snapshot.opacity
  const hasImage = imageDataUrl !== undefined

  return (
    <div className={css.group}>
      <div className={css.title}>{t('title')}</div>
      <div className={css.previewRow}>
        {hasImage && <img className={css.preview} src={imageDataUrl} alt={t('previewAlt')} />}
        <div className={css.controls}>
          <div className={css.buttons}>
            <label className={css.uploadButton}>
              <IconPaperclipOutline16 />
              {t(hasImage ? 'replace' : 'upload')}
              <input
                type="file"
                className={css.fileInput}
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(event) => { onPick(event, applyImage) }}
              />
            </label>
            {hasImage && (
              <button type="button" className={css.clearButton} onClick={clear}>
                <IconTrashOutline16 />
                {t('clear')}
              </button>
            )}
          </div>
          {hasImage && (
            <label className={css.opacityRow}>
              <span>{t('opacity')}</span>
              <input
                type="range"
                className={css.opacitySlider}
                min={0}
                max={100}
                step={5}
                value={Math.round(opacity * 100)}
                onChange={(event) => { setOpacity(Number(event.target.value) / 100) }}
              />
              <span className={css.opacityValue}>{Math.round(opacity * 100)}%</span>
            </label>
          )}
        </div>
      </div>
    </div>
  )
}
