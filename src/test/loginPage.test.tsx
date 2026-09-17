import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { LoginPage } from '../pages/LoginPage.tsx'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
}))

const settingsState = vi.hoisted(() => ({
  settings: null as unknown,
}))

vi.mock('../hooks/useAppSettings.ts', () => ({
  useAppSettings: () => settingsState.settings,
}))

vi.mock('../components/AuthForm.tsx', () => ({
  AuthForm: () => <div>AuthForm</div>,
}))

function setSettings(settings: unknown) {
  settingsState.settings = settings
}

describe('LoginPage testing-mode lock', () => {
  beforeEach(() => {
    window.location.hash = ''
    setSettings({ lockLogin: false, loginHash: '' })
  })

  it('renders the auth form when the login page is not locked', () => {
    render(<LoginPage />)
    expect(screen.getByText('AuthForm')).toBeInTheDocument()
  })

  it('renders the auth form when the correct hash is provided', () => {
    setSettings({ lockLogin: true, loginHash: 'secret-42' })
    window.location.hash = '#secret-42'
    render(<LoginPage />)
    expect(screen.getByText('AuthForm')).toBeInTheDocument()
  })

  it('hides the auth form when the hash is wrong', () => {
    setSettings({ lockLogin: true, loginHash: 'secret-42' })
    window.location.hash = '#wrong'
    render(<LoginPage />)
    expect(screen.getByText('auth.unavailable')).toBeInTheDocument()
    expect(screen.queryByText('AuthForm')).not.toBeInTheDocument()
  })

  it('hides the auth form when no hash is provided', () => {
    setSettings({ lockLogin: true, loginHash: 'secret-42' })
    render(<LoginPage />)
    expect(screen.getByText('auth.unavailable')).toBeInTheDocument()
  })
})
