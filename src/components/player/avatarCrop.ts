/** Output size of the produced avatar (px). */
export const AVATAR_OUTPUT = 700
/** Zoom multiplier per press of a zoom button. */
export const ZOOM_STEP = 1.25

/** Crop square in source-image pixel coordinates (top-left offset + size). */
export interface CropState {
  cropSize: number
  offsetX: number
  offsetY: number
}

export function clampCropSize(size: number, width: number, height: number): number {
  const minSide = Math.min(width, height)
  // Never below the 700px real-photo area (or the whole image if it is
  // smaller, which input validation normally prevents), never above min side.
  return Math.min(Math.max(size, Math.min(AVATAR_OUTPUT, minSide)), minSide)
}

export function clampOffset(
  offsetX: number,
  offsetY: number,
  cropSize: number,
  width: number,
  height: number,
): { offsetX: number; offsetY: number } {
  return {
    offsetX: Math.min(Math.max(offsetX, 0), Math.max(width - cropSize, 0)),
    offsetY: Math.min(Math.max(offsetY, 0), Math.max(height - cropSize, 0)),
  }
}

/** Initial crop: the whole shortest side, centered. */
export function initialCrop(width: number, height: number): CropState {
  const cropSize = clampCropSize(Math.min(width, height), width, height)
  const { offsetX, offsetY } = clampOffset(
    (width - cropSize) / 2,
    (height - cropSize) / 2,
    cropSize,
    width,
    height,
  )
  return { cropSize, offsetX, offsetY }
}

function resize(state: CropState, nextSize: number, width: number, height: number): CropState {
  const cropSize = clampCropSize(nextSize, width, height)
  const cx = state.offsetX + state.cropSize / 2
  const cy = state.offsetY + state.cropSize / 2
  const { offsetX, offsetY } = clampOffset(cx - cropSize / 2, cy - cropSize / 2, cropSize, width, height)
  return { cropSize, offsetX, offsetY }
}

/** Zoom in (selection covers less of the source); clamped at AVATAR_OUTPUT px. */
export function zoomIn(state: CropState, width: number, height: number): CropState {
  return resize(state, state.cropSize / ZOOM_STEP, width, height)
}

/** Zoom out (selection covers more of the source); clamped at the min side. */
export function zoomOut(state: CropState, width: number, height: number): CropState {
  return resize(state, state.cropSize * ZOOM_STEP, width, height)
}

/** Drag by display pixels (`dx`/`dy`); `scale` converts display px → source px. */
export function panBy(
  state: CropState,
  dx: number,
  dy: number,
  scale: number,
  width: number,
  height: number,
): CropState {
  const { offsetX, offsetY } = clampOffset(
    state.offsetX - dx / scale,
    state.offsetY - dy / scale,
    state.cropSize,
    width,
    height,
  )
  return { ...state, offsetX, offsetY }
}

/** Display scale: frame pixels per source pixel. */
export function displayScale(framePx: number, state: CropState): number {
  return state.cropSize > 0 ? framePx / state.cropSize : 1
}
