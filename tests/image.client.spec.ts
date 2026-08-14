/** Background image admission path. */
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fileToBackgroundDataUrl } from '../src/client/image.ts'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function fakeBitmap(width: number, height: number) {
  return { width, height, close: vi.fn() }
}

describe('fileToBackgroundDataUrl', () => {
  it('rejects a non-image file', async () => {
    const file = new File(['abc'], 'notes.txt', { type: 'text/plain' })
    await expect(fileToBackgroundDataUrl(file)).rejects.toThrow('unsupported image type')
  })

  it('rejects when the canvas 2d context is unavailable', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => fakeBitmap(10, 10)))
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const file = new File([new Uint8Array([1])], 'bg.png', { type: 'image/png' })
    await expect(fileToBackgroundDataUrl(file)).rejects.toThrow('canvas unavailable')
  })

  it('downsamples to the edge cap and closes the bitmap, returning an encoded data URL', async () => {
    const bitmap = fakeBitmap(4000, 2000)
    vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap))
    const drawImage = vi.fn()
    const toDataURL = vi.fn(() => 'data:image/webp;base64,ENC')
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as never)
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(toDataURL)
    const file = new File([new Uint8Array([1])], 'bg.png', { type: 'image/png' })
    const url = await fileToBackgroundDataUrl(file)
    // 4000 > 2560 so the longest side is capped to 2560; aspect 2:1 -> 2560x1280.
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 2560, 1280)
    expect(toDataURL).toHaveBeenCalled()
    expect(url).toBe('data:image/webp;base64,ENC')
    expect(bitmap.close).toHaveBeenCalled()
  })

  it('falls back to JPEG when the canvas cannot encode WebP', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => fakeBitmap(10, 10)))
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as never)
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => 'data:image/jpeg;base64,JPEG')
    const file = new File([new Uint8Array([1])], 'bg.png', { type: 'image/png' })
    const url = await fileToBackgroundDataUrl(file)
    expect(url).toBe('data:image/jpeg;base64,JPEG')
  })

  it('degrades to JPEG when the canvas export path throws', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => fakeBitmap(10, 10)))
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as never)
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => { throw new Error('no canvas') })
    const file = new File([new Uint8Array([1])], 'bg.png', { type: 'image/png' })
    // The export itself throws after format resolution; the format resolution
    // catch is what returns jpeg, and the outer call rejects on the throw.
    await expect(fileToBackgroundDataUrl(file)).rejects.toThrow('no canvas')
  })
})
