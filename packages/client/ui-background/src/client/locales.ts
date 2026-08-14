/** `settings.background` namespace dictionaries (the background row's copy). */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  title: '对话背景',
  upload: '上传图片',
  replace: '更换图片',
  clear: '清除背景',
  opacity: '可读性遮罩',
  previewAlt: '对话背景预览',
} satisfies Record<string, string>

/** The settings.background namespace key union. */
export type BackgroundKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  title: 'Conversation background',
  upload: 'Upload image',
  replace: 'Replace image',
  clear: 'Clear background',
  opacity: 'Readable wash',
  previewAlt: 'Conversation background preview',
} satisfies Record<BackgroundKey, string>
