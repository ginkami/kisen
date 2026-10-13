import {
  AVATAR_OUTPUT,
  displayScale,
  initialCrop,
  panBy,
  zoomIn,
  zoomOut,
} from '../components/player/avatarCrop.ts'

describe('initialCrop', () => {
  it('selects the whole shortest side, centered', () => {
    expect(initialCrop(1000, 800)).toEqual({ cropSize: 800, offsetX: 100, offsetY: 0 })
    expect(initialCrop(700, 900)).toEqual({ cropSize: 700, offsetX: 0, offsetY: 100 })
  })
})

describe('zoom limits', () => {
  it('zoomIn stops at the 700px real-photo area and stays inside the image', () => {
    let state = initialCrop(1000, 800) // cropSize 800
    state = zoomIn(state, 1000, 800) // 800 / 1.25 = 640 → clamped to 700
    expect(state.cropSize).toBe(AVATAR_OUTPUT)
    for (let i = 0; i < 10; i++) state = zoomIn(state, 1000, 800)
    expect(state.cropSize).toBe(AVATAR_OUTPUT)
    expect(state.offsetX).toBeGreaterThanOrEqual(0)
    expect(state.offsetX + state.cropSize).toBeLessThanOrEqual(1000)
    expect(state.offsetY).toBeGreaterThanOrEqual(0)
    expect(state.offsetY + state.cropSize).toBeLessThanOrEqual(800)
  })

  it('zoomOut stops at the min side and re-centers the original crop', () => {
    let state = initialCrop(1000, 800)
    state = zoomIn(state, 1000, 800)
    for (let i = 0; i < 20; i++) state = zoomOut(state, 1000, 800)
    expect(state).toEqual({ cropSize: 800, offsetX: 100, offsetY: 0 })
  })

  it('zoom keeps the selection centered on its previous center', () => {
    const state = zoomIn({ cropSize: 800, offsetX: 100, offsetY: 0 }, 1000, 800)
    // center was (500, 400); new size 700 → offset (150, 50)
    expect(state).toEqual({ cropSize: 700, offsetX: 150, offsetY: 50 })
  })
})

describe('panBy clamping', () => {
  const base = initialCrop(1000, 800) // cropSize 800, offset (100, 0)

  it('clamps at the right and left borders', () => {
    // dragging far left moves the selection to the right border and vice versa
    expect(panBy(base, -10000, 0, 1, 1000, 800).offsetX).toBe(200) // width - cropSize
    expect(panBy(base, 10000, 0, 1, 1000, 800).offsetX).toBe(0)
  })

  it('clamps at the top and bottom borders', () => {
    expect(panBy(base, 0, 10000, 1, 1000, 800).offsetY).toBe(0) // height == cropSize
    expect(panBy(base, 0, -10000, 1, 1000, 800).offsetY).toBe(0)
  })

  it('converts display pixels to source pixels via the scale factor', () => {
    expect(panBy(base, 50, 0, 1, 1000, 800).offsetX).toBe(50) // 100 - 50/1
    const state = { cropSize: 1400, offsetX: 0, offsetY: 0 }
    // scale 0.5: dragging 100 display px = 200 source px (image 2000×1400)
    expect(panBy(state, -100, 0, 0.5, 2000, 1400).offsetX).toBe(200)
  })
})

describe('displayScale', () => {
  it('maps frame pixels to source pixels', () => {
    expect(displayScale(320, { cropSize: 800, offsetX: 0, offsetY: 0 })).toBe(0.4)
    expect(displayScale(700, { cropSize: 700, offsetX: 0, offsetY: 0 })).toBe(1)
  })
})
