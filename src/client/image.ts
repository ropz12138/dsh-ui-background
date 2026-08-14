/**
 * Background image admission: downsample an uploaded raster to a bounded
 * inline data URL before it reaches the durable settings document, so the
 * user-settings file and the rendered column stay small.
 */

/** Longest image edge after downsampling. */
export const MAX_BACKGROUND_EDGE = 2560

/** Raster formats rendered lossily to JPEG/WebP by the browser canvas. */
export type BackgroundImageFormat = 'image/webp' | 'image/jpeg'

/** Canvas can always export JPEG; WebP is preferred when supported. */
function resolveOutputFormat(): BackgroundImageFormat {
  /* v8 ignore next -- the guard's true arm runs only when this module is
     evaluated outside a browser (node e2e), where it is never exercised. */
  if (typeof document === 'undefined' || typeof HTMLCanvasElement === 'undefined') return 'image/jpeg'
  try {
    return document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg'
  } catch {
    // Browsers without a working canvas export path (no shim) degrade to JPEG.
    return 'image/jpeg'
  }
}

class BackgroundImageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackgroundImageError'
  }
}

/**
 * Read a picked file, downsample it to at most {@link MAX_BACKGROUND_EDGE} on
 * its longest side (preserving aspect ratio), and return a data URL.
 * @param file - the browser file the user picked.
 * @returns the compressed data URL, or rejects with a {@link BackgroundImageError}.
 */
export async function fileToBackgroundDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new BackgroundImageError('unsupported image type')
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, MAX_BACKGROUND_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (ctx === null) throw new BackgroundImageError('canvas unavailable')
    ctx.drawImage(bitmap, 0, 0, width, height)
    return canvas.toDataURL(resolveOutputFormat(), 0.85)
  } finally {
    bitmap.close()
  }
}
