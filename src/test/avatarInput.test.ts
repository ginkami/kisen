vi.mock('@jsquash/jpeg', () => ({
  encode: vi.fn(async () => new Uint8Array([1, 2, 3]).buffer),
}))

import { encode } from '@jsquash/jpeg'
import { inspectAvatarFile, renderAvatarCrop } from '../components/player/avatarInput.ts'

function stubBitmap(width: number, height: number) {
  const close = vi.fn()
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ width, height, close })),
  )
  return close
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('inspectAvatarFile', () => {
  it('rejects unsupported file types', async () => {
    const file = new File([new Uint8Array(4)], 'x.gif', { type: 'image/gif' })
    expect(await inspectAvatarFile(file)).toEqual({ ok: false, reason: 'unsupported' })
  })

  it('rejects undecodable images', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => { throw new Error('bad image') }))
    const file = new File([new Uint8Array(4)], 'x.png', { type: 'image/png' })
    expect(await inspectAvatarFile(file)).toEqual({ ok: false, reason: 'loadFailed' })
  })

  it('rejects images below 700px on the shortest side and reports dimensions', async () => {
    stubBitmap(699, 1000)
    const file = new File([new Uint8Array(4)], 'x.png', { type: 'image/png' })
    expect(await inspectAvatarFile(file)).toEqual({
      ok: false,
      reason: 'tooSmall',
      width: 699,
      height: 1000,
    })
  })

  it('accepts an image with a 700px shortest side', async () => {
    stubBitmap(700, 900)
    const file = new File([new Uint8Array(4)], 'x.jpg', { type: 'image/jpeg' })
    expect(await inspectAvatarFile(file)).toEqual({ ok: true, width: 700, height: 900 })
  })
})

describe('renderAvatarCrop', () => {
  it('draws the selection into a 700×700 canvas and encodes JPEG quality 77', async () => {
    const imageData = {
      width: 700,
      height: 700,
      data: new Uint8ClampedArray(4),
    } as unknown as ImageData
    const ctx = { drawImage: vi.fn(), getImageData: vi.fn(() => imageData) }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    )

    const source = {} as CanvasImageSource
    const bytes = await renderAvatarCrop(source, { offsetX: 10, offsetY: 20, cropSize: 800 })

    expect(ctx.drawImage).toHaveBeenCalledWith(source, 10, 20, 800, 800, 0, 0, 700, 700)
    expect(ctx.getImageData).toHaveBeenCalledWith(0, 0, 700, 700)
    expect(vi.mocked(encode)).toHaveBeenCalledWith(imageData, { quality: 77 })
    expect(Array.from(bytes)).toEqual([1, 2, 3])
  })
})