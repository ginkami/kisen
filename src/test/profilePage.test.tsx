import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ProfilePage } from '../pages/ProfilePage.tsx'
import {
  reauthenticateWithCredential,
  updatePassword,
  linkWithCredential,
  type User as FirebaseUser,
} from 'firebase/auth'
import { updateUser } from '../services/userService.ts'
import type { User } from '../types/user.ts'
import type { Association } from '../domain/association.ts'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
}))

const authState = vi.hoisted(() => ({
  user: null as unknown,
  firebaseUser: null as unknown,
  isLoading: false,
  isAuthenticated: true,
  associations: [] as unknown[],
}))

vi.mock('../context/AuthContext.tsx', () => ({
  useAuth: () => authState,
}))

vi.mock('firebase/auth', () => ({
  EmailAuthProvider: { credential: vi.fn(() => ({ __credential: true })) },
  reauthenticateWithCredential: vi.fn(),
  updatePassword: vi.fn(),
  linkWithCredential: vi.fn(),
}))

vi.mock('../services/userService.ts', () => ({
  updateUser: vi.fn(),
  updateUserProviders: vi.fn(),
}))

vi.mock('../hooks/useAssociations.ts', () => ({
  useMyAssociations: () => ({ data: authState.associations ?? [] }),
}))

const UID = 'user-1'
const ASSN_ID = 'assn-1'
const ASSN_ID_2 = 'assn-2'

function makeUser(): User {
  return {
    id: UID,
    email: 'user@example.com',
    role: 'manager',
    locales: {
      ru: { familyName: 'Иванов', givenName: 'Иван', displayName: 'Ив' },
      en: { familyName: 'Ivanov', givenName: 'Ivan', displayName: 'Iv' },
    },
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  }
}

function makeFirebaseUser(providerIds: string[]): FirebaseUser {
  return {
    uid: UID,
    email: 'user@example.com',
    providerData: providerIds.map((providerId) => ({ providerId, uid: `${providerId}-ext` })),
    reload: vi.fn().mockResolvedValue(undefined),
  } as unknown as FirebaseUser
}

function makeAssociation(id: string, createdBy: string, title: string): Association {
  return {
    id,
    createdBy,
    managers: [],
    locales: { ru: { title }, en: { title: `${title} EN` } },
  } as unknown as Association
}

function renderProfilePage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/login" element={<div>login-page-marker</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  authState.user = makeUser()
  authState.firebaseUser = makeFirebaseUser(['google.com', 'password'])
  authState.isLoading = false
  authState.isAuthenticated = true
  authState.associations = []
  vi.mocked(updateUser).mockReset()
  vi.mocked(reauthenticateWithCredential).mockReset()
  vi.mocked(updatePassword).mockReset()
  vi.mocked(linkWithCredential).mockReset()
  document.title = ''
})

describe('ProfilePage access', () => {
  it('redirects unauthenticated visitors to /login', () => {
    authState.isAuthenticated = false
    authState.user = null
    renderProfilePage()
    expect(screen.getByText('login-page-marker')).toBeInTheDocument()
  })

  it('shows a spinner while auth state is loading', () => {
    authState.isLoading = true
    const { container } = renderProfilePage()
    expect(container.querySelector('.loading')).toBeInTheDocument()
  })
})

describe('ProfilePage header', () => {
  it('renders the over-title, live h1 and document title', async () => {
    renderProfilePage()
    expect(screen.getByText('profile.edit.managementPanel')).toBeInTheDocument()
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent('Иванов Иван')
    await waitFor(() =>
      expect(document.title).toBe('Иванов Иван — profile.edit.managementPanel | shogi·world')
    )
  })

  it('updates h1 live while editing name fields', () => {
    renderProfilePage()
    fireEvent.change(screen.getByLabelText('profile.edit.familyName'), {
      target: { value: 'Петров' },
    })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Петров Иван')
  })

  it('keeps the delete button disabled', () => {
    renderProfilePage()
    expect(screen.getByRole('button', { name: 'profile.edit.delete' })).toBeDisabled()
  })
})

describe('ProfilePage immutable account section', () => {
  it('shows email and localized role', () => {
    renderProfilePage()
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
    expect(screen.getByText('profile.edit.roles.manager')).toBeInTheDocument()
  })
})

describe('ProfilePage save flow', () => {
  it('disables save until the form is dirty and persists all locales', async () => {
    vi.mocked(updateUser).mockResolvedValue(makeUser())
    renderProfilePage()
    const saveButton = screen.getByRole('button', { name: 'profile.edit.save' })
    expect(saveButton).toBeDisabled()

    fireEvent.change(screen.getByLabelText('profile.edit.givenName'), {
      target: { value: 'Сергей' },
    })
    expect(saveButton).toBeEnabled()

    fireEvent.click(saveButton)
    await waitFor(() =>
      expect(updateUser).toHaveBeenCalledWith(
        UID,
        expect.objectContaining({
          locales: expect.objectContaining({
            ru: expect.objectContaining({ givenName: 'Сергей' }),
          }),
        })
      )
    )
  })

  it('shows an error alert when saving fails', async () => {
    vi.mocked(updateUser).mockRejectedValueOnce(new Error('firestore down'))
    renderProfilePage()
    fireEvent.change(screen.getByLabelText('profile.edit.displayName'), {
      target: { value: 'Сева' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'profile.edit.save' }))
    await waitFor(() =>
      expect(screen.getByText('profile.edit.errors.save')).toBeInTheDocument()
    )
  })

  it('switches locale tabs without losing edits', () => {
    renderProfilePage()
    fireEvent.change(screen.getByLabelText('profile.edit.familyName'), {
      target: { value: 'Петров' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'EN' }))
    expect(screen.getByLabelText('profile.edit.familyName')).toHaveValue('Ivanov')
    fireEvent.click(screen.getByRole('button', { name: 'РУ' }))
    expect(screen.getByLabelText('profile.edit.familyName')).toHaveValue('Петров')
  })
})

describe('ProfilePage providers and password', () => {
  it('renders provider badges and change-password fields when a password is assigned', () => {
    renderProfilePage()
    expect(screen.getByText('Google')).toBeInTheDocument()
    expect(screen.getByText('profile.edit.providers.password')).toBeInTheDocument()
    expect(screen.getByLabelText('profile.edit.password.old')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'profile.edit.password.change' })
    ).toBeInTheDocument()
  })

  it('offers add-password mode without the old password field', () => {
    authState.firebaseUser = makeFirebaseUser(['google.com'])
    renderProfilePage()
    expect(screen.queryByLabelText('profile.edit.password.old')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'profile.edit.password.add' })
    ).toBeInTheDocument()
  })

  it('validates repeat mismatch and short password inline', () => {
    renderProfilePage()
    fireEvent.change(screen.getByLabelText('profile.edit.password.old'), {
      target: { value: 'oldpass1' },
    })
    fireEvent.change(screen.getByLabelText('profile.edit.password.new'), {
      target: { value: 'abc' },
    })
    fireEvent.change(screen.getByLabelText('profile.edit.password.repeat'), {
      target: { value: 'xyz' },
    })
    expect(
      screen.getByRole('button', { name: 'profile.edit.password.change' })
    ).toBeDisabled()
    expect(screen.getByText('profile.edit.password.errors.tooShort')).toBeInTheDocument()
    expect(screen.getByText('profile.edit.password.errors.mismatch')).toBeInTheDocument()
  })

  it('changes the password via reauthentication and updatePassword', async () => {
    vi.mocked(updatePassword).mockResolvedValue(undefined)
    renderProfilePage()
    fireEvent.change(screen.getByLabelText('profile.edit.password.old'), {
      target: { value: 'oldpass1' },
    })
    fireEvent.change(screen.getByLabelText('profile.edit.password.new'), {
      target: { value: 'newpass1' },
    })
    fireEvent.change(screen.getByLabelText('profile.edit.password.repeat'), {
      target: { value: 'newpass1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'profile.edit.password.change' }))
    await waitFor(() => expect(updatePassword).toHaveBeenCalled())
    expect(reauthenticateWithCredential).toHaveBeenCalled()
    expect(screen.getByText('profile.edit.password.success')).toBeInTheDocument()
  })

  it('maps wrong old password to a localized message', async () => {
    vi.mocked(reauthenticateWithCredential).mockRejectedValueOnce({
      code: 'auth/wrong-password',
    })
    renderProfilePage()
    fireEvent.change(screen.getByLabelText('profile.edit.password.old'), {
      target: { value: 'wrongpass' },
    })
    fireEvent.change(screen.getByLabelText('profile.edit.password.new'), {
      target: { value: 'newpass1' },
    })
    fireEvent.change(screen.getByLabelText('profile.edit.password.repeat'), {
      target: { value: 'newpass1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'profile.edit.password.change' }))
    await waitFor(() =>
      expect(screen.getByText('profile.edit.password.errors.wrongPassword')).toBeInTheDocument()
    )
  })

  it('adds a password via linkWithCredential and reloads the user', async () => {
    authState.firebaseUser = makeFirebaseUser(['google.com'])
    vi.mocked(linkWithCredential).mockResolvedValue({} as never)
    renderProfilePage()
    fireEvent.change(screen.getByLabelText('profile.edit.password.new'), {
      target: { value: 'newpass1' },
    })
    fireEvent.change(screen.getByLabelText('profile.edit.password.repeat'), {
      target: { value: 'newpass1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'profile.edit.password.add' }))
    await waitFor(() => expect(linkWithCredential).toHaveBeenCalled())
    expect((authState.firebaseUser as FirebaseUser).reload).toHaveBeenCalled()
  })
})

describe('ProfilePage managed associations', () => {
  it('renders creator and manager badges with edit links', () => {
    authState.associations = [
      makeAssociation(ASSN_ID, UID, 'Ассоциация А'),
      makeAssociation(ASSN_ID_2, 'other-user', 'Ассоциация Б'),
    ]
    renderProfilePage()
    const links = screen.getAllByRole('link')
    expect(links[0]).toHaveAttribute('href', `/assn/${ASSN_ID}/edit`)
    expect(links[0]).toHaveTextContent('association.edit.creator')
    expect(links[1]).toHaveAttribute('href', `/assn/${ASSN_ID_2}/edit`)
    expect(links[1]).not.toHaveTextContent('association.edit.creator')
  })

  it('shows an empty hint when nothing is managed', () => {
    renderProfilePage()
    expect(screen.getByText('profile.edit.associations.empty')).toBeInTheDocument()
  })
})

