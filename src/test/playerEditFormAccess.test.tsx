import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { PlayerEditForm } from '../components/player/PlayerEditForm.tsx'
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

const playerFormState = vi.hoisted(() => ({
  player: null as Player | null,
}))

const makeFormState = vi.hoisted(() => () => ({
  locales: {
    ru: { familyName: 'Иванов', givenName: 'Иван', location: '', club: '', title: '' },
    en: { familyName: 'Ivanov', givenName: 'Ivan', location: '', club: '', title: '' },
  },
  nationality: 'jp',
  residence: '',
  gender: null,
  ratingValue: '1800',
  rank: null,
  title: '',
  birthDate: '',
  primaryAssociation: null,
  secondaryAssociations: [],
}))

vi.mock('../hooks/usePlayerForm.ts', () => ({
  usePlayerForm: () => ({
    player: playerFormState.player,
    formState: makeFormState(),
    isLoading: false,
    loadError: null,
    isSaving: false,
    isDeleting: false,
    saveError: null,
    deleteError: null,
    validationErrors: {},
    clearSaveError: vi.fn(),
    clearDeleteError: vi.fn(),
    updateLocale: vi.fn(),
    updateBasic: vi.fn(),
    updateRating: vi.fn(),
    addAssociation: vi.fn(),
    removeAssociation: vi.fn(),
    savePlayer: vi.fn(),
    deletePlayer: vi.fn(),
  }),
}))

function makeUser(role: string) {
  return { role }
}

function makeFirebaseUser(uid: string) {
  return { uid }
}

function makePlayer(part: Partial<EditableFields> = {}): Player {
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

type EditableFields = Pick<
  Player,
  'createdBy' | 'primaryAssociation' | 'secondaryAssociations'
>

function renderForm() {
  return render(
    <MemoryRouter>
      <PlayerEditForm playerId="00000000-0000-7000-8000-000000000001" />
    </MemoryRouter>
  )
}

beforeEach(() => {
  authState.user = makeUser('manager')
  authState.firebaseUser = makeFirebaseUser('user-1')
  associationsState.associations = []
  associationsState.isLoading = false
  playerFormState.player = null
})

describe('PlayerEditForm access guard', () => {
  it('shows the no-access message instead of the form for an unauthorized manager', () => {
    playerFormState.player = makePlayer({
      createdBy: 'creator-1',
      primaryAssociation: 'assn-x',
    })
    renderForm()

    expect(screen.getByText('player.edit.errors.noAccess')).toBeTruthy()
    expect(screen.queryByText('player.edit.save')).toBeNull()
    expect(screen.queryByRole('button', { name: 'player.edit.delete' })).toBeNull()
  })

  it('renders the full form when the player was created by the current user', () => {
    playerFormState.player = makePlayer({ createdBy: 'user-1' })
    renderForm()

    expect(screen.getByText('player.edit.save')).toBeTruthy()
    expect(screen.getByText('Иванов, Иван')).toBeTruthy()
    expect(screen.queryByText('player.edit.errors.noAccess')).toBeNull()
  })

  it('renders the full form when a managed association is affiliated with the player', () => {
    playerFormState.player = makePlayer({
      createdBy: 'creator-1',
      primaryAssociation: 'assn-a',
    })
    associationsState.associations = [{ id: 'assn-a' }]
    renderForm()

    expect(screen.getByText('player.edit.save')).toBeTruthy()
    expect(screen.queryByText('player.edit.errors.noAccess')).toBeNull()
  })

  it('renders the full form for admins regardless of ownership', () => {
    authState.user = makeUser('admin')
    playerFormState.player = makePlayer({
      createdBy: 'creator-1',
      primaryAssociation: 'assn-x',
    })
    renderForm()

    expect(screen.getByText('player.edit.save')).toBeTruthy()
    expect(screen.queryByText('player.edit.errors.noAccess')).toBeNull()
  })

  it('keeps showing the spinner while the managed associations are loading', () => {
    playerFormState.player = makePlayer({
      createdBy: 'creator-1',
      primaryAssociation: 'assn-x',
    })
    associationsState.isLoading = true
    const { container } = renderForm()

    expect(container.querySelector('.loading')).not.toBeNull()
    expect(screen.queryByText('player.edit.errors.noAccess')).toBeNull()
    expect(screen.queryByText('player.edit.save')).toBeNull()
  })
})