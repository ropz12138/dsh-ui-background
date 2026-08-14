/** BackgroundSettingRow: upload, opacity slider, and clear over runtime verbs. */
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, act } from '@testing-library/react'
import { createSnapshotStore, type SessionListState, type WorkspaceListState } from '@deepseek-ai/dsh-client-runtime/client'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-web-react'
import { BackgroundSettingRow, type BackgroundSettingRowInjected } from '../src/client/BackgroundSettingRow.tsx'
import type { BackgroundSnapshot } from '../src/client/background-runtime.ts'
import { en } from '../src/client/locales.ts'

const t = (key: string): string => (en as Record<string, string>)[key] ?? key

function emptySessions() {
  const s = createSnapshotStore<SessionListState>({ ids: [], byId: {}, current: undefined, phase: 'ready', subagentsByParent: {}, jobsBySession: {}, currentAddress: undefined })
  return bindSnapshotSelector(s)
}
function emptyWorkspaces() {
  const s = createSnapshotStore<WorkspaceListState>({ items: [], archivedSessionIds: [], state: 'idle', phase: 'ready', error: null, baselinesReady: true, recentWorkspaceId: undefined })
  return bindSnapshotSelector(s)
}

/** Controllable injected face with an imperatively-held snapshot. */
function makeFace(initial: BackgroundSnapshot) {
  let snapshot = initial
  const listeners = new Set<() => void>()
  const applyImage = vi.fn(() => Promise.resolve())
  const face: BackgroundSettingRowInjected = {
    getSnapshot: () => snapshot,
    subscribe: (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
    applyImage,
    setOpacity: vi.fn(),
    clear: vi.fn(),
  }
  return {
    face,
    applyImage,
    setOpacity: face.setOpacity as ReturnType<typeof vi.fn>,
    clear: face.clear as ReturnType<typeof vi.fn>,
    update: (next: BackgroundSnapshot) => { snapshot = next; for (const l of listeners) l() },
  }
}

afterEach(cleanup)

function mount(snapshot: BackgroundSnapshot) {
  const b = makeFace(snapshot)
  const view = render(<BackgroundSettingRow useSessions={emptySessions()} useWorkspaces={emptyWorkspaces()} t={t} {...b.face} />)
  return { ...b, view }
}

describe('BackgroundSettingRow', () => {
  it('shows upload and no clear/slider when no image is set', () => {
    mount({ imageDataUrl: undefined, opacity: 0.4 })
    expect(document.body.textContent).toContain('Upload image')
    expect(document.body.textContent).not.toContain('Clear background')
  })

  it('picking a file drives applyImage', () => {
    const b = mount({ imageDataUrl: undefined, opacity: 0.4 })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File([new Uint8Array([1])], 'bg.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(b.applyImage).toHaveBeenCalledWith(file)
    expect(input.value).toBe('')
  })

  it('a cancel with no files does not call applyImage', () => {
    const b = mount({ imageDataUrl: undefined, opacity: 0.4 })
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [] } })
    expect(b.applyImage).not.toHaveBeenCalled()
  })

  it('shows replace, clear, and the opacity slider when an image is set', () => {
    mount({ imageDataUrl: 'data:image/png;base64,a', opacity: 0.5 })
    expect(document.body.textContent).toContain('Replace image')
    expect(document.body.textContent).toContain('Clear background')
    expect(document.querySelector('input[type="range"]')).not.toBeNull()
  })

  it('clear button drives clear()', () => {
    const b = mount({ imageDataUrl: 'data:image/png;base64,a', opacity: 0.4 })
    const clearBtn = Array.from(document.querySelectorAll('button')).find(x => x.textContent?.includes('Clear background'))!
    fireEvent.click(clearBtn)
    expect(b.clear).toHaveBeenCalled()
  })

  it('opacity slider drives setOpacity as a fraction', () => {
    const b = mount({ imageDataUrl: 'data:image/png;base64,a', opacity: 0.4 })
    fireEvent.change(document.querySelector('input[type="range"]')!, { target: { value: '80' } })
    expect(b.setOpacity).toHaveBeenCalledWith(0.8)
  })

  it('re-renders when the runtime snapshot changes', () => {
    const b = mount({ imageDataUrl: undefined, opacity: 0.4 })
    expect(document.body.textContent).not.toContain('Clear background')
    act(() => { b.update({ imageDataUrl: 'data:image/png;base64,z', opacity: 0.7 }) })
    expect(document.body.textContent).toContain('Clear background')
    expect(document.body.textContent).toContain('70%')
  })
})
