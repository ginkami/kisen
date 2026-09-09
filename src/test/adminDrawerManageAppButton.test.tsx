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
  useUserSearch: () => ({ data: [], isFetching: false, error: null }),
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

function makeUser(role: 'admin' | 'manager' | 'user'): User {
  return {
    id: 'user-1',
    email: 'user@example.com',
    role,
    locales: {
      ru: { familyName: 'Ivanov', givenName: 'Ivan', displayName: 'Ivan I.' },
      en: { familyName: 'Ivanov', givenName: 'Ivan', displayName: 'Ivan I.' },
    },
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
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
          <Route path="/app-admin" element={<div>app-admin-marker</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  authState.user = makeUser('admin')
})

describe('AdminDrawer manage application button', () => {
  it('shows the button for an admin', () => {
    renderDrawer()

    expect(screen.getByRole('button', { name: 'admin.manageApp' })).toBeInTheDocument()
  })

  it('hides the button for a manager', () => {
    authState.user = makeUser('manager')
    renderDrawer()

    expect(
      screen.queryByRole('button', { name: 'admin.manageApp' })
    ).not.toBeInTheDocument()
  })

  it('navigates to /app-admin when clicked', async () => {
    renderDrawer()

    fireEvent.click(screen.getByRole('button', { name: 'admin.manageApp' }))

    await waitFor(() => {
      expect(screen.getByText('app-admin-marker')).toBeInTheDocument()
    })
  })
})
