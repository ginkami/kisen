import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { UserMenu } from '../components/UserMenu.tsx'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
}))

const authState = vi.hoisted(() => ({
  user: {
    locales: {
      ru: { displayName: 'Ив' },
      en: { displayName: 'Iv' },
    },
    email: 'user@example.com',
  } as unknown,
  logout: vi.fn(() => Promise.resolve()),
}))

vi.mock('../context/AuthContext.tsx', () => ({
  useAuth: () => ({ user: authState.user, logout: authState.logout }),
}))

function renderMenu() {
  return render(
    <MemoryRouter initialEntries={['/tournaments/abc/edit']}>
      <Routes>
        <Route path="/tournaments/abc/edit" element={<UserMenu onOpenAdmin={vi.fn()} />} />
        <Route path="/" element={<div>home-page-marker</div>} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  authState.logout.mockClear()
})

describe('UserMenu logout', () => {
  it('calls logout and navigates to the home page', async () => {
    renderMenu()

    fireEvent.click(screen.getByText('auth.logout'))

    await waitFor(() => {
      expect(screen.getByText('home-page-marker')).toBeTruthy()
    })
    expect(authState.logout).toHaveBeenCalledTimes(1)
  })
})