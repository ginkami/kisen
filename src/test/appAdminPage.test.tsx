import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AppAdminPage } from '../pages/AppAdminPage.tsx'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
}))

const authState = vi.hoisted(() => ({
  user: null as unknown,
  isAuthenticated: true,
}))

vi.mock('../context/AuthContext.tsx', () => ({
  useAuth: () => authState,
}))

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app-admin']}>
        <Routes>
          <Route path="/app-admin" element={<AppAdminPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  authState.isAuthenticated = true
  authState.user = { id: 'admin-1', role: 'admin' }
})

describe('AppAdminPage', () => {
  it('renders the title and the settings tab for an admin', () => {
    renderPage()

    expect(screen.getByText('appAdmin.title')).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: 'appAdmin.tabs.settings' })
    ).toBeInTheDocument()
    expect(screen.getByText('appAdmin.settings.empty')).toBeInTheDocument()
  })

  it('shows the access alert for a manager', () => {
    authState.user = { id: 'manager-1', role: 'manager' }
    renderPage()

    expect(screen.getByText('appAdmin.errors.noAccess')).toBeInTheDocument()
    expect(screen.queryByText('appAdmin.title')).not.toBeInTheDocument()
  })

  it('shows the access alert for an unauthenticated visitor', () => {
    authState.isAuthenticated = false
    authState.user = null
    renderPage()

    expect(screen.getByText('appAdmin.errors.noAccess')).toBeInTheDocument()
  })
})
