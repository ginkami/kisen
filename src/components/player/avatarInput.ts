import { encode } from '@jsquash/jpeg'
import { AVATAR_OUTPUT } from './avatarCrop.ts'

/** Shortest accepted side of a picked source image (px). */
export const AVATAR_MIN_SIDE = 700
export const AVATAR_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export type AvatarFileRejection = 'unsupported' | 'loadFailed' | 'tooSmall'

export type AvatarFileInspection =
  | { ok: true; width: number; height: number }
  | { ok: false; reason: AvatarFileRejection; width?: number; height?: number }

/** Decode a picked file and validate the ≥700px shortest side. */
export async function inspectAvatarFile(file: File): Promise<AvatarFileInspection> {
  if (!(AVATAR_ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, reason: 'unsupported' }
  }
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return { ok: false, reason: 'loadFailed' }
  }
  const { width, height } = bitmap
  bitmap.close()
  if (Math.min(width, height) < AVATAR_MIN_SIDE) {
    return { ok: false, reason: 'tooSmall', width, height }
  }
  return { ok: true, width, height }
}

/** Load an image element from an object URL (rejects on decode error). */
export function loadAvatarImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
}

/**
 * Draw the selected square to a 700×700 canvas and encode it as JPEG
 * (quality 77) via @jsquash/jpeg.
 */
export async function renderAvatarCrop(
  source: CanvasImageSource,
  crop: { offsetX: number; offsetY: number; cropSize: number },
): Promise<Uint8Array> {
  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_OUTPUT
  canvas.height = AVATAR_OUTPUT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.drawImage(
    source,
    crop.offsetX,
    crop.offsetY,
    crop.cropSize,
    crop.cropSize,
    0,
    0,
    AVATAR_OUTPUT,
    AVATAR_OUTPUT,
  )
  const imageData = ctx.getImageData(0, 0, AVATAR_OUTPUT, AVATAR_OUTPUT)
  const buffer = await encode(imageData, { quality: 77 })
  return new Uint8Array(buffer)
}
