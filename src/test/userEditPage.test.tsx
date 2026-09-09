import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { UserEditPage } from '../pages/UserEditPage.tsx'
import { sendPasswordResetEmail } from 'firebase/auth'
import {
  getUserById,
  setUserRole,
  updateUser,
} from '../services/userService.ts'
import type { User } from '../types/user.ts'

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

vi.mock('firebase/auth', () => ({
  sendPasswordResetEmail: vi.fn(),
}))

vi.mock('../services/userService.ts', () => ({
  getUserById: vi.fn(),
  setUserRole: vi.fn(),
  updateUser: vi.fn(),
}))

vi.mock('../services/firebaseConfig.ts', () => ({
  auth: { __authInstance: true },
  db: {},
}))

const ADMIN_ID = 'admin-1'
const TARGET_ID = 'user-2'

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: TARGET_ID,
    email: 'target@example.com',
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

function makeAdmin(): User {
  return makeUser({ id: ADMIN_ID, email: 'admin@example.com', role: 'admin' })
}

function renderEditPage(targetId: string = TARGET_ID) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/users/${targetId}/edit`]}>
        <Routes>
          <Route
            path="/"
            element={<Outlet context={{ setHasUnsavedChanges: vi.fn() }} />}
          >
            <Route path="users/:id/edit" element={<UserEditPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  authState.user = makeAdmin()
  authState.isAuthenticated = true
  vi.mocked(getUserById).mockReset()
  vi.mocked(setUserRole).mockReset()
  vi.mocked(setUserRole).mockResolvedValue(undefined)
  vi.mocked(updateUser).mockReset()
  vi.mocked(updateUser).mockResolvedValue(makeUser())
  vi.mocked(sendPasswordResetEmail).mockReset()
  vi.mocked(sendPasswordResetEmail).mockResolvedValue(undefined)
})

describe('UserEditPage access', () => {
  it('shows the access alert for non-admins and never loads the user', () => {
    authState.user = makeUser({ role: 'manager' })
    renderEditPage()

    expect(screen.getByText('user.edit.errors.noAccess')).toBeInTheDocument()
    expect(getUserById).not.toHaveBeenCalled()
  })
})

describe('UserEditPage access block', () => {
  it('changes the role and blocks the user on save', async () => {
    vi.mocked(getUserById).mockResolvedValue(makeUser())
    renderEditPage()

    await waitFor(() => {
      expect(screen.getByLabelText('user.edit.role')).toHaveValue('user')
    })
    fireEvent.change(screen.getByLabelText('user.edit.role'), {
      target: { value: 'manager' },
    })
    fireEvent.click(screen.getByLabelText('user.edit.blocked'))
    fireEvent.click(screen.getByRole('button', { name: 'user.edit.save' }))

    await waitFor(() => {
      expect(setUserRole).toHaveBeenCalledWith(TARGET_ID, 'manager')
    })
    expect(updateUser).toHaveBeenCalledTimes(1)
    const [, patch] = vi.mocked(updateUser).mock.calls[0]
    expect(patch.auth?.isActive).toBe(false)
    expect(patch.auth?.passwordHash).toBeNull()
    expect(screen.getByText('user.edit.accessSuccess')).toBeInTheDocument()
  })

  it('unblocks a blocked user without touching the role', async () => {
    vi.mocked(getUserById).mockResolvedValue(
      makeUser({
        role: 'manager',
        auth: {
          passwordHash: null,
          providers: [],
          emailVerified: true,
          isActive: false,
        },
      })
    )
    renderEditPage()

    await waitFor(() => {
      expect(screen.getByLabelText('user.edit.blocked')).toBeChecked()
    })
    fireEvent.click(screen.getByLabelText('user.edit.blocked'))
    fireEvent.click(screen.getByRole('button', { name: 'user.edit.save' }))

    await waitFor(() => {
      expect(updateUser).toHaveBeenCalled()
    })
    expect(setUserRole).not.toHaveBeenCalled()
    const [, patch] = vi.mocked(updateUser).mock.calls[0]
    expect(patch.auth?.isActive).toBe(true)
  })

  it('shows a save error when the update fails', async () => {
    vi.mocked(getUserById).mockResolvedValue(makeUser())
    vi.mocked(updateUser).mockRejectedValue(new Error('denied'))
    renderEditPage()

    await waitFor(() => {
      expect(screen.getByLabelText('user.edit.blocked')).not.toBeChecked()
    })
    fireEvent.click(screen.getByLabelText('user.edit.blocked'))
    fireEvent.click(screen.getByRole('button', { name: 'user.edit.save' }))

    await waitFor(() => {
      expect(screen.getByText('user.edit.accessError')).toBeInTheDocument()
    })
  })
  it('disables the access controls for the admin’s own account', async () => {
    authState.user = makeAdmin()
    vi.mocked(getUserById).mockResolvedValue(makeAdmin())
    renderEditPage(ADMIN_ID)

    await waitFor(() => {
      expect(screen.getByLabelText('user.edit.role')).toHaveValue('user')
    })
    expect(screen.getByLabelText('user.edit.role')).toBeDisabled()
    expect(screen.getByLabelText('user.edit.blocked')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'user.edit.save' })).toBeDisabled()
    expect(screen.getByText('user.edit.selfEditHint')).toBeInTheDocument()
  })
})

describe('UserEditPage password reset', () => {
  it('sends a reset email to the edited user and confirms', async () => {
    vi.mocked(getUserById).mockResolvedValue(makeUser())
    renderEditPage()

    await waitFor(() => {
      expect(screen.getByText('target@example.com')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'user.edit.sendReset' }))

    await waitFor(() => {
      expect(sendPasswordResetEmail).toHaveBeenCalledWith(
        { __authInstance: true },
        'target@example.com'
      )
    })
    expect(screen.getByText('user.edit.resetSent')).toBeInTheDocument()
  })

  it('shows a localized error when the reset fails', async () => {
    vi.mocked(getUserById).mockResolvedValue(makeUser())
    vi.mocked(sendPasswordResetEmail).mockRejectedValue({
      code: 'auth/user-not-found',
    })
    renderEditPage()

    await waitFor(() => {
      expect(screen.getByText('target@example.com')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'user.edit.sendReset' }))

    await waitFor(() => {
      expect(screen.getByText('user.edit.errors.userNotFound')).toBeInTheDocument()
    })
  })
})

