import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppAdminPanel } from '../components/appAdmin/AppAdminPanel.tsx'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
}))

const authState = vi.hoisted(() => ({
  user: { id: 'admin-1', role: 'admin' },
  isAuthenticated: true,
  isLoading: false,
}))

vi.mock('../context/AuthContext.tsx', () => ({
  useAuth: () => authState,
}))

const settingsCallbacks = vi.hoisted(() => ({
  last: null as ((settings: unknown) => void) | null,
}))

vi.mock('../services/appSettingsService.ts', () => ({
  subscribeAppSettings: vi.fn((onNext: (settings: unknown) => void) => {
    settingsCallbacks.last = onNext
    return () => {}
  }),
  getAppSettings: vi.fn(),
  saveAppSettings: vi.fn(),
}))

import { saveAppSettings } from '../services/appSettingsService.ts'

function pushSettings(settings: unknown) {
  settingsCallbacks.last?.(settings)
}

function renderPanel() {
  return render(<AppAdminPanel />)
}

describe('AppAdminPanel settings tab', () => {
  it('renders the lock checkbox and the hash input from the loaded settings', async () => {
    renderPanel()
    pushSettings({ lockLogin: true, loginHash: 'secret-42' })
    const checkbox = await screen.findByTestId('app-admin-lock-login')
    expect(checkbox).toBeChecked()
    const hashInput = screen.getByTestId('app-admin-login-hash') as HTMLInputElement
    expect(hashInput.value).toBe('secret-42')
  })

  it('saves the edited settings', async () => {
    renderPanel()
    pushSettings({ lockLogin: false, loginHash: '' })
    const checkbox = await screen.findByTestId('app-admin-lock-login')
    fireEvent.click(checkbox)
    fireEvent.change(screen.getByTestId('app-admin-login-hash'), {
      target: { value: 'open-sesame' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'appAdmin.settings.save' }))
    await waitFor(() => {
      expect(saveAppSettings).toHaveBeenCalledWith({
        lockLogin: true,
        loginHash: 'open-sesame',
      })
    })
    expect(screen.getByText('appAdmin.settings.saved')).toBeInTheDocument()
  })
})
