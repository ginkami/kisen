import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BsZoomIn, BsZoomOut } from 'react-icons/bs'
import {
  displayScale,
  initialCrop,
  panBy,
  zoomIn,
  zoomOut,
  type CropState,
} from './avatarCrop.ts'
import { renderAvatarCrop } from './avatarInput.ts'

interface AvatarCropModalProps {
  isOpen: boolean
  /** Already loaded and validated source image (see `loadAvatarImage`). */
  image: HTMLImageElement | null
  onClose: () => void
  /** Receives the cropped 700×700 JPEG (quality 77) bytes. */
  onApply: (bytes: Uint8Array) => void
}

const FALLBACK_FRAME_PX = 320

/** Square-frame cropper: drag to pan, BsZoomIn/BsZoomOut to zoom, «Применить» to encode. */
export function AvatarCropModal({ isOpen, image, onClose, onApply }: AvatarCropModalProps) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ x: number; y: number } | null>(null)
  const [crop, setCrop] = useState<CropState | null>(null)
  const [framePx, setFramePx] = useState(FALLBACK_FRAME_PX)
  const [applying, setApplying] = useState(false)

  // React 19 render-time state adjustment (no setState-in-effect): (re)initialize
  // the crop whenever a different source image is passed in.
  const [initializedImage, setInitializedImage] = useState<HTMLImageElement | null>(null)
  if (image !== initializedImage) {
    setInitializedImage(image)
    setCrop(image ? initialCrop(image.naturalWidth, image.naturalHeight) : null)
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen && !dialog.open) {
      dialog.showModal()
    } else if (!isOpen && dialog.open) {
      dialog.close()
    }
  }, [isOpen])

  // The square frame adapts to the available container (falls back to 320px).
  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setFramePx(el.clientWidth || FALLBACK_FRAME_PX)
    })
    ro.observe(el)
    return () => ro.disconnect()
  })

  const scale = crop ? displayScale(framePx, crop) : 1

  function handlePointerDown(e: React.PointerEvent<HTMLImageElement>) {
    dragRef.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLImageElement>) {
    if (!dragRef.current || !image) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    dragRef.current = { x: e.clientX, y: e.clientY }
    setCrop((prev) =>
      prev ? panBy(prev, dx, dy, scale, image.naturalWidth, image.naturalHeight) : prev,
    )
  }

  function handlePointerUp() {
    dragRef.current = null
  }

  function zoom(factor: 'in' | 'out') {
    if (!image) return
    setCrop((prev) => {
      if (!prev) return prev
      return factor === 'in'
        ? zoomIn(prev, image.naturalWidth, image.naturalHeight)
        : zoomOut(prev, image.naturalWidth, image.naturalHeight)
    })
  }

  async function handleApply() {
    if (!image || !crop || applying) return
    setApplying(true)
    try {
      const bytes = await renderAvatarCrop(image, crop)
      onApply(bytes)
      onClose()
    } catch {
      // Encoding failures leave the modal open so the user can retry.
    } finally {
      setApplying(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      onClose={onClose}
      aria-modal="true"
      aria-labelledby="avatar-crop-title"
    >
      <div className="modal-box">
        <h3 id="avatar-crop-title" className="text-lg font-bold">
          {t('player.edit.photoTitle')}
        </h3>
        <div className="flex flex-col items-center gap-3 py-4">
          <div
            ref={frameRef}
            className="relative aspect-square w-full max-w-[400px] overflow-hidden rounded-lg border border-base-300 bg-base-300"
          >
            {image && crop && (
              <img
                src={image.src}
                alt=""
                draggable={false}
                className="absolute max-w-none cursor-grab select-none active:cursor-grabbing"
                style={{
                  left: -crop.offsetX * scale,
                  top: -crop.offsetY * scale,
                  width: image.naturalWidth * scale,
                  height: image.naturalHeight * scale,
                  touchAction: 'none',
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              />
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-circle btn-ghost"
              aria-label={t('player.edit.photoZoomOut')}
              onClick={() => zoom('out')}
            >
              <BsZoomOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="btn btn-sm btn-circle btn-ghost"
              aria-label={t('player.edit.photoZoomIn')}
              onClick={() => zoom('in')}
            >
              <BsZoomIn className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={applying || !crop}
            onClick={() => void handleApply()}
          >
            {t('player.edit.photoApply')}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit">close</button>
      </form>
    </dialog>
  )
}
