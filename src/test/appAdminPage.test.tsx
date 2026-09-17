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
  isLoading: false,
}))

vi.mock('../context/AuthContext.tsx', () => ({
  useAuth: () => authState,
}))

const settingsState = vi.hoisted(() => ({
  settings: { lockLogin: false, loginHash: '' } as unknown,
}))

vi.mock('../hooks/useAppSettings.ts', () => ({
  useAppSettings: () => settingsState.settings,
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
  authState.isLoading = false
  authState.user = { id: 'admin-1', role: 'admin' }
})

describe('AppAdminPage', () => {
  it('renders the title and the settings tab for an admin', () => {
    renderPage()

    expect(screen.getByText('appAdmin.title')).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: 'appAdmin.tabs.settings' })
    ).toBeInTheDocument()
    // The settings are still loading (the subscription has not pushed yet).
    expect(screen.getByText('appAdmin.settings.loading')).toBeInTheDocument()
  })

  it('shows a spinner instead of the access alert while loading', () => {
    authState.isLoading = true
    const { container } = renderPage()

    expect(container.querySelector('.loading-spinner')).toBeTruthy()
    expect(screen.queryByText('appAdmin.errors.noAccess')).toBeNull()
    expect(screen.queryByText('appAdmin.title')).toBeNull()
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
