vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'ru' } }),
}))

vi.mock('../components/player/avatarInput.ts', () => ({
  inspectAvatarFile: vi.fn(),
  loadAvatarImage: vi.fn(),
  renderAvatarCrop: vi.fn(async () => new Uint8Array([9, 9])),
}))

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AvatarCropModal } from '../components/player/AvatarCropModal.tsx'
import { renderAvatarCrop } from '../components/player/avatarInput.ts'

function makeImage(): HTMLImageElement {
  const img = document.createElement('img')
  Object.defineProperty(img, 'naturalWidth', { value: 1000 })
  Object.defineProperty(img, 'naturalHeight', { value: 800 })
  Object.defineProperty(img, 'src', { value: 'blob:fake-source', configurable: true })
  return img
}

function renderModal() {
  const onApply = vi.fn()
  const onClose = vi.fn()
  const image = makeImage()
  const { container } = render(
    <AvatarCropModal isOpen image={image} onClose={onClose} onApply={onApply} />,
  )
  const preview = container.querySelector('img') as HTMLImageElement
  return { onApply, onClose, preview }
}

function displayWidth(preview: HTMLImageElement): number {
  return parseFloat(preview.style.width)
}

describe('AvatarCropModal', () => {
  it('cancel closes without applying', () => {
    const { onApply, onClose } = renderModal()
    fireEvent.click(screen.getByText('common.cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onApply).not.toHaveBeenCalled()
  })

  it('zoom-in is limited to the 700px source area', () => {
    const { preview } = renderModal()
    // cropSize 800, frame 320 → displayed width 1000 * 320/800 = 400
    expect(displayWidth(preview)).toBeCloseTo(1000 * (320 / 800), 5)

    const zoomInBtn = screen.getByLabelText('player.edit.photoZoomIn')
    fireEvent.click(zoomInBtn)
    // 800/1.25 = 640 → clamped to 700 → width 1000 * 320/700
    const clamped = displayWidth(preview)
    expect(clamped).toBeCloseTo(1000 * (320 / 700), 5)

    for (let i = 0; i < 10; i++) fireEvent.click(zoomInBtn)
    expect(displayWidth(preview)).toBe(clamped)
  })

  it('zoom-out stops at the shortest side', () => {
    const { preview } = renderModal()
    fireEvent.click(screen.getByLabelText('player.edit.photoZoomIn'))
    const zoomOutBtn = screen.getByLabelText('player.edit.photoZoomOut')
    for (let i = 0; i < 20; i++) fireEvent.click(zoomOutBtn)
    expect(displayWidth(preview)).toBeCloseTo(1000 * (320 / 800), 5)
  })

  it('apply encodes the crop and passes the bytes to onApply', async () => {
    vi.mocked(renderAvatarCrop).mockResolvedValue(new Uint8Array([9, 9]))
    const { onApply, onClose } = renderModal()
    fireEvent.click(screen.getByText('player.edit.photoApply'))
    await waitFor(() => {
      expect(onApply).toHaveBeenCalledWith(new Uint8Array([9, 9]))
    })
    expect(renderAvatarCrop).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})