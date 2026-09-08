import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NewTournamentButton } from '../components/NewTournamentButton.tsx'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
}))

const authState = vi.hoisted(() => ({
  isAuthenticated: true,
  firebaseUser: { uid: 'user-1', displayName: 'Ivan Ivanov' },
}))

vi.mock('../context/AuthContext.tsx', () => ({
  useAuth: () => authState,
}))

vi.mock('../services/tournamentService.ts', () => ({
  tournamentService: {
    createDraft: vi.fn(() =>
      Promise.resolve({ id: '00000000-0000-7000-8000-000000000001' })
    ),
  },
}))

import { tournamentService } from '../services/tournamentService.ts'

function renderButton() {
  const queryClient = new QueryClient()
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<NewTournamentButton />} />
          <Route
            path="/tournaments/:id/edit"
            element={<div>tournament-edit-page-marker</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
  return { invalidateSpy }
}

beforeEach(() => {
  authState.isAuthenticated = true
  vi.mocked(tournamentService.createDraft).mockClear()
})

describe('NewTournamentButton cache invalidation', () => {
  it('creates a draft, invalidates the tournaments cache, and navigates to the edit page', async () => {
    const { invalidateSpy } = renderButton()

    fireEvent.click(screen.getByText('tournament.new'))

    await waitFor(() => {
      expect(screen.getByText('tournament-edit-page-marker')).toBeTruthy()
    })
    expect(tournamentService.createDraft).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: 'user-1' })
    )
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tournaments'] })
  })
})