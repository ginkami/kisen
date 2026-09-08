import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { PlayerEditModal } from '../components/player/PlayerEditModal.tsx'
import type { Player } from '../domain/player.ts'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
}))

const authState = vi.hoisted(() => ({
  user: null as unknown,
  firebaseUser: null as unknown,
  isAuthenticated: true,
}))

vi.mock('../context/AuthContext.tsx', () => ({
  useAuth: () => authState,
}))

const associationsState = vi.hoisted(() => ({
  associations: [] as Array<{ id: string }>,
  isLoading: false,
}))

vi.mock('../hooks/useAssociations.ts', () => ({
  useMyAssociations: () => ({
    data: associationsState.associations,
    isLoading: associationsState.isLoading,
  }),
  useAssociationsByIds: () => [],
}))

const playerServiceState = vi.hoisted(() => ({
  player: null as Player | null,
}))

vi.mock('../services/playerService.ts', () => ({
  playerService: {
    getById: vi.fn(() => Promise.resolve(playerServiceState.player)),
  },
}))

function makePlayer(part: Partial<Player> = {}): Player {
  return {
    id: '00000000-0000-7000-8000-000000000001',
    createdBy: 'creator-1',
    locales: {
      ru: { familyName: 'Иванов', givenName: 'Иван' },
      en: { familyName: 'Ivanov', givenName: 'Ivan' },
    },
    nationality: 'jp',
    gender: null,
    currentRating: { value: 1800, rank: null, updatedAt: new Date('2026-01-01T00:00:00Z') },
    birthDate: null,
    primaryAssociation: null,
    secondaryAssociations: [],
    ...part,
  } as Player
}

function makeUser(role: string) {
  return { role }
}

function makeFirebaseUser(uid: string) {
  return { uid }
}

function renderModal() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <PlayerEditModal
        playerId="00000000-0000-7000-8000-000000000001"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  authState.user = makeUser('manager')
  authState.firebaseUser = makeFirebaseUser('user-1')
  associationsState.associations = [{ id: 'assn-a' }]
  associationsState.isLoading = false
  playerServiceState.player = makePlayer()
})

describe('PlayerEditModal access guard', () => {
  it('shows the no-access alert without a save control for an unauthorized manager', async () => {
    playerServiceState.player = makePlayer({ createdBy: 'creator-1' })
    renderModal()

    await waitFor(() => {
      expect(screen.getByText('player.edit.errors.noAccess')).toBeTruthy()
    })
    expect(screen.queryByText('common.confirm')).toBeNull()
    expect(screen.getByText('common.cancel')).toBeTruthy()
    expect(screen.queryByText('player.edit.familyName')).toBeNull()
  })

  it('renders the form when the player was created by the current user', async () => {
    playerServiceState.player = makePlayer({ createdBy: 'user-1' })
    renderModal()

    // Wait for the form itself (the Confirm button renders disabled while
    // the player query is still in flight).
    await waitFor(() => {
      expect(screen.getByText('player.edit.familyName')).toBeTruthy()
    })
    expect(screen.getByText('common.confirm')).toBeTruthy()
    expect(screen.queryByText('player.edit.errors.noAccess')).toBeNull()
  })

  it('renders the form when a managed association is affiliated with the player', async () => {
    playerServiceState.player = makePlayer({
      createdBy: 'creator-1',
      primaryAssociation: 'assn-a',
    })
    renderModal()

    await waitFor(() => {
      expect(screen.getByText('player.edit.familyName')).toBeTruthy()
    })
    expect(screen.getByText('common.confirm')).toBeTruthy()
    expect(screen.queryByText('player.edit.errors.noAccess')).toBeNull()
  })

  it('renders the form for admins regardless of ownership', async () => {
    authState.user = makeUser('admin')
    playerServiceState.player = makePlayer({ createdBy: 'creator-1' })
    renderModal()

    await waitFor(() => {
      expect(screen.getByText('player.edit.familyName')).toBeTruthy()
    })
    expect(screen.getByText('common.confirm')).toBeTruthy()
    expect(screen.queryByText('player.edit.errors.noAccess')).toBeNull()
  })

  it('keeps showing the spinner while the managed associations are loading', async () => {
    playerServiceState.player = makePlayer({ createdBy: 'creator-1' })
    associationsState.isLoading = true
    const { container } = renderModal()

    // While the player query is in flight the Confirm button is still
    // rendered (disabled, pre-existing behavior); it disappears once the
    // player has loaded and the access check starts.
    await waitFor(() => {
      expect(screen.queryByText('common.confirm')).toBeNull()
    })
    expect(container.querySelector('.loading')).not.toBeNull()
    expect(screen.queryByText('player.edit.errors.noAccess')).toBeNull()
  })
})