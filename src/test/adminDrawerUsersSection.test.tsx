import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AdminDrawer } from '../components/AdminDrawer.tsx'
import type { User } from '../types/user.ts'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
}))

const authState = vi.hoisted(() => ({
  user: null as unknown,
  firebaseUser: { uid: 'admin-1' } as unknown,
  isAuthenticated: true,
}))

const userSearchState = vi.hoisted(() => ({
  results: [] as User[],
}))

vi.mock('../context/AuthContext.tsx', () => ({
  useAuth: () => authState,
}))

vi.mock('../hooks/useTournaments.ts', () => ({
  useTournamentSearch: () => ({ data: [], isFetching: false }),
  useEditableTournaments: () => ({ data: [], isLoading: false, error: null }),
}))

vi.mock('../hooks/useEvents.ts', () => ({
  useEventSearch: () => ({ data: [], isFetching: false }),
  useEventsByIds: () => ({ data: [] }),
  useEditableEvents: () => ({ data: [], isLoading: false, error: null }),
}))

vi.mock('../hooks/useAssociations.ts', () => ({
  useAssociationsForPanel: () => ({ data: [], isLoading: false }),
}))

vi.mock('../hooks/useUsers.ts', () => ({
  useUserSearch: (query: string) => ({
    data: query.trim().length >= 3 ? userSearchState.results : [],
    isFetching: false,
    error: null,
  }),
}))

vi.mock('../services/regulationService.ts', () => ({
  regulationService: { listEditable: vi.fn().mockResolvedValue([]) },
}))

vi.mock('../services/playerService.ts', () => ({
  playerService: { bulkImport: vi.fn() },
}))

vi.mock('../components/NewTournamentButton.tsx', () => ({
  NewTournamentButton: () => null,
}))

vi.mock('../components/player/PlayerSearchPanel.tsx', () => ({
  PlayerSearchPanel: () => null,
}))

vi.mock('../components/BulkImportResultModal.tsx', () => ({
  BulkImportResultModal: () => null,
}))

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-2',
    email: 'petrov@example.com',
    role: 'user',
    auth: {
      passwordHash: null,
      providers: [],
      emailVerified: true,
      isActive: true,
    },
    locales: {
      ru: { familyName: 'Петров', givenName: 'Пётр', displayName: 'Пётр П.' },
      en: { familyName: 'Petrov', givenName: 'Petr', displayName: 'Petr P.' },
    },
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

function renderDrawer() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <AdminDrawer isOpen onClose={() => {}} hasUnsavedChanges={false} />
            }
          />
          <Route path="/users/:id/edit" element={<div>user-edit-marker</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  authState.user = makeUser({ id: 'admin-1', email: 'admin@example.com', role: 'admin' })
  userSearchState.results = []
})

describe('AdminDrawer Users section', () => {
  it('shows the Users section for an admin', () => {
    renderDrawer()

    expect(screen.getByText('admin.users')).toBeInTheDocument()
  })

  it('hides the Users section for a manager', () => {
    authState.user = makeUser({ id: 'manager-1', email: 'm@example.com', role: 'manager' })
    renderDrawer()

    expect(screen.queryByText('admin.users')).not.toBeInTheDocument()
  })

  it('renders user cards with name, email, role, and blocked badge', async () => {
    userSearchState.results = [makeUser({ auth: { passwordHash: null, providers: [], emailVerified: true, isActive: false } })]
    renderDrawer()

    fireEvent.change(screen.getByPlaceholderText('admin.searchUsers'), {
      target: { value: 'pet' },
    })

    await waitFor(() => {
      expect(screen.getByText('Петров, Пётр')).toBeInTheDocument()
    })
    expect(screen.getByText('petrov@example.com')).toBeInTheDocument()
    expect(screen.getByText('user.role.user')).toBeInTheDocument()
    expect(screen.getByText('admin.userBlocked')).toBeInTheDocument()
  })

  it('navigates to the user edit page when a card is clicked', async () => {
    userSearchState.results = [makeUser()]
    renderDrawer()

    fireEvent.change(screen.getByPlaceholderText('admin.searchUsers'), {
      target: { value: 'pet' },
    })

    await waitFor(() => {
      expect(screen.getByText('Петров, Пётр')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Петров, Пётр'))

    await waitFor(() => {
      expect(screen.getByText('user-edit-marker')).toBeInTheDocument()
    })
  })
})
