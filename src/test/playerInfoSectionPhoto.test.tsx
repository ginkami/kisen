vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'ru' } }),
}))

vi.mock('../hooks/useAssociations.ts', () => ({
  useMyAssociations: () => ({ data: [], isLoading: false }),
  useAssociationsByIds: () => [],
}))

vi.mock('../context/AuthContext.tsx', () => ({
  useAuth: () => ({ user: null, firebaseUser: null, isAuthenticated: false }),
}))

vi.mock('../components/player/avatarInput.ts', () => ({
  inspectAvatarFile: vi.fn(),
  loadAvatarImage: vi.fn(),
  renderAvatarCrop: vi.fn(),
}))

vi.mock('../components/player/AvatarCropModal.tsx', () => ({
  AvatarCropModal: ({ onApply }: { onApply: (bytes: Uint8Array) => void }) => (
    <div aria-label="crop-modal" role="dialog">
      <button type="button" onClick={() => onApply(new Uint8Array([7, 7]))}>
        mock-apply
      </button>
    </div>
  ),
}))

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PlayerInfoSection } from '../components/player/PlayerInfoSection.tsx'
import { inspectAvatarFile, loadAvatarImage } from '../components/player/avatarInput.ts'
import { createEmptyFormState, type PlayerFormState } from '../hooks/playerFormHelpers.ts'

function makeFormState(avatar: Uint8Array | null = null): PlayerFormState {
  const base = createEmptyFormState()
  base.locales.ru.familyName = 'Иванов'
  base.locales.ru.givenName = 'Иван'
  base.nationality = 'ru'
  return { ...base, avatar }
}

function renderSection(avatar: Uint8Array | null = null) {
  const onUpdateBasic = vi.fn()
  render(
    <PlayerInfoSection
      formState={makeFormState(avatar)}
      activeLocale="ru"
      onLocaleChange={vi.fn()}
      onUpdateLocale={vi.fn()}
      onUpdateBasic={onUpdateBasic}
      onUpdateRating={vi.fn()}
      onAddAssociation={vi.fn()}
      onRemoveAssociation={vi.fn()}
      canEditAssociations={true}
    />,
  )
  return { onUpdateBasic }
}

function makeFile(type = 'image/png'): File {
  return new File([new Uint8Array(8)], 'photo.png', { type })
}

describe('PlayerInfoSection photo block', () => {
  it('shows the label and add button when there is no avatar', () => {
    renderSection()
    expect(screen.getByText('player.edit.photo')).toBeInTheDocument()
    expect(screen.getByText('player.edit.photoAdd')).toBeInTheDocument()
    expect(screen.queryByAltText('player.edit.photo')).toBeNull()
    expect(screen.queryByText('player.edit.photoDelete')).toBeNull()
  })

  it('shows a 200×200 preview plus change and delete buttons when an avatar exists', () => {
    renderSection(new Uint8Array([1, 2, 3]))
    const preview = screen.getByAltText('player.edit.photo')
    expect(preview).toBeInTheDocument()
    expect(preview.className).toContain('h-[200px]')
    expect(preview.className).toContain('w-[200px]')
    expect(screen.getByText('player.edit.photoChange')).toBeInTheDocument()
    expect(screen.getByText('player.edit.photoDelete')).toBeInTheDocument()
    expect(screen.queryByText('player.edit.photoAdd')).toBeNull()
  })

  it('delete clears the avatar in the form state', () => {
    const { onUpdateBasic } = renderSection(new Uint8Array([1]))
    fireEvent.click(screen.getByText('player.edit.photoDelete'))
    expect(onUpdateBasic).toHaveBeenCalledWith('avatar', null)
  })

  it('rejects an image below 700px with a notification and no crop modal', async () => {
    vi.mocked(inspectAvatarFile).mockResolvedValue({
      ok: false,
      reason: 'tooSmall',
      width: 699,
      height: 1000,
    })
    renderSection()
    fireEvent.drop(screen.getByText('player.edit.photoAdd'), {
      dataTransfer: { files: [makeFile()] },
    })
    await waitFor(() => {
      expect(screen.getByText('player.edit.photoMinSize')).toBeInTheDocument()
    })
    expect(screen.queryByLabelText('crop-modal')).toBeNull()
    expect(loadAvatarImage).not.toHaveBeenCalled()
  })

  it('opens the crop modal for a valid file and wires apply into the form state', async () => {
    vi.mocked(inspectAvatarFile).mockResolvedValue({ ok: true, width: 1000, height: 800 })
    vi.mocked(loadAvatarImage).mockResolvedValue({
      naturalWidth: 1000,
      naturalHeight: 800,
    } as HTMLImageElement)
    const { onUpdateBasic } = renderSection()
    fireEvent.drop(screen.getByText('player.edit.photoAdd'), {
      dataTransfer: { files: [makeFile('image/jpeg')] },
    })
    await waitFor(() => {
      expect(screen.getByLabelText('crop-modal')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('mock-apply'))
    expect(onUpdateBasic).toHaveBeenCalledWith('avatar', new Uint8Array([7, 7]))
  })
})