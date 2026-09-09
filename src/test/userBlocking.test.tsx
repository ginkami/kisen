import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AuthProvider, isUserBlocked } from '../context/AuthContext.tsx'
import { useAuth } from '../context/useAuth.ts'
import { logOut } from '../services/authService.ts'
import { getUserById } from '../services/userService.ts'
import i18n from '../i18n'
import { BLOCKED_NOTICE_EVENT } from '../context/blockedNotice.ts'
import type { User } from '../types/user.ts'

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
}))

vi.mock('../services/authService.ts', () => ({
  signInWithEmail: vi.fn(() =>
    Promise.resolve({ user: { uid: 'user-1', email: 'u@example.com' } })
  ),
  signInWithGoogle: vi.fn(),
  signUpWithEmail: vi.fn(),
  logOut: vi.fn(() => Promise.resolve()),
}))

vi.mock('../services/userService.ts', () => ({
  getUserById: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
}))

const authStateHandler = vi.hoisted(() => ({
  callback: null as ((user: { uid: string }) => void) | null,
}))

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(
    (_auth: unknown, callback: (user: { uid: string }) => void) => {
      authStateHandler.callback = callback
      return vi.fn()
    }
  ),
}))

vi.mock('../services/firebaseConfig.ts', () => ({
  auth: {},
  db: {},
}))

const snapshotHandler = vi.hoisted(() => ({
  callback: null as ((snapshot: {
    exists: () => boolean
    data: () => unknown
    metadata: { fromCache: boolean }
  }) => void) | null,
}))

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  onSnapshot: vi.fn(
    (
      _ref: unknown,
      callback: (snapshot: {
        exists: () => boolean
        data: () => unknown
        metadata: { fromCache: boolean }
      }) => void
    ) => {
      snapshotHandler.callback = callback
      return vi.fn()
    }
  ),
}))
function makeUser(isActive: boolean | undefined): User {
  return {
    id: 'user-1',
    email: 'u@example.com',
    role: 'user',
    auth:
      isActive === undefined
        ? undefined
        : {
            passwordHash: null,
            providers: [],
            emailVerified: true,
            isActive,
          },
    locales: {
      ru: { familyName: '', givenName: '', displayName: '' },
      en: { familyName: '', givenName: '', displayName: '' },
    },
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  }
}

function renderSignInProbe() {
  const queryClient = new QueryClient()
  let lastErrorMessage: string | null = null

  function Probe() {
    const { signIn } = useAuth()
    return (
      <button
        type="button"
        onClick={() => {
          signIn({ email: 'u@example.com', password: 'secret' }).catch(
            (err: Error) => {
              lastErrorMessage = err.message
            }
          )
        }}
      >
        sign-in-probe
      </button>
    )
  }

  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>
  )

  return {
    clickSignIn: () => fireEvent.click(screen.getByText('sign-in-probe')),
    getLastErrorMessage: () => lastErrorMessage,
  }
}

beforeEach(() => {
  vi.mocked(logOut).mockClear()
  vi.mocked(getUserById).mockReset()
  snapshotHandler.callback = null
  sessionStorage.clear()
})

describe('stale blocked-notice flag lifecycle', () => {
  it('clears a stale flag once an active profile loads', async () => {
    sessionStorage.setItem('auth.blockedNotice', '1')
    vi.mocked(getUserById).mockResolvedValue(makeUser(true))
    renderSignInProbe()
    authenticate()

    await waitFor(() => {
      expect(getUserById).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(sessionStorage.getItem('auth.blockedNotice')).toBeNull()
    })
  })

  it('keeps the flag while the loaded profile is blocked', async () => {
    sessionStorage.setItem('auth.blockedNotice', '1')
    vi.mocked(getUserById).mockResolvedValue(makeUser(false))
    renderSignInProbe()
    authenticate()

    await waitFor(() => {
      expect(getUserById).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(sessionStorage.getItem('auth.blockedNotice')).toBe('1')
    })
  })
})

function authenticate() {
  authStateHandler.callback?.({ uid: 'user-1' })
}

describe('isUserBlocked', () => {
  it('blocks only when auth.isActive is explicitly false', () => {
    expect(isUserBlocked(makeUser(false))).toBe(true)
    expect(isUserBlocked(makeUser(true))).toBe(false)
    expect(isUserBlocked(makeUser(undefined))).toBe(false)
    expect(isUserBlocked(null)).toBe(false)
  })
})

describe('sign-in blocking', () => {
  it('signs out and reports the localized error for a blocked user', async () => {
    vi.mocked(getUserById).mockResolvedValue(makeUser(false))
    const noticeListener = vi.fn()
    window.addEventListener(BLOCKED_NOTICE_EVENT, noticeListener)
    const probe = renderSignInProbe()

    probe.clickSignIn()
    await waitFor(() => {
      expect(logOut).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(probe.getLastErrorMessage()).toBe(i18n.t('auth.errors.userBlocked'))
    })
    expect(sessionStorage.getItem('auth.blockedNotice')).toBe('1')
    expect(noticeListener).toHaveBeenCalled()
    window.removeEventListener(BLOCKED_NOTICE_EVENT, noticeListener)
  })

  it('signs in normally for an active user', async () => {
    vi.mocked(getUserById).mockResolvedValue(makeUser(true))
    const probe = renderSignInProbe()

    probe.clickSignIn()
    await waitFor(() => {
      expect(getUserById).toHaveBeenCalled()
    })
    expect(logOut).not.toHaveBeenCalled()
    expect(probe.getLastErrorMessage()).toBeNull()
  })

  it('treats a legacy profile without auth data as active', async () => {
    vi.mocked(getUserById).mockResolvedValue(makeUser(undefined))
    const probe = renderSignInProbe()

    probe.clickSignIn()
    await waitFor(() => {
      expect(getUserById).toHaveBeenCalled()
    })
    expect(logOut).not.toHaveBeenCalled()
  })
})

describe('live blocking via user document snapshot', () => {
  it('re-synchronizes the profile listener after authentication', async () => {
    vi.mocked(getUserById).mockResolvedValue(makeUser(true))
    renderSignInProbe()
    authenticate()

    await waitFor(() => {
      expect(snapshotHandler.callback).not.toBeNull()
    })
  })

  it('signs out and stores the notice flag when the profile becomes blocked', async () => {
    vi.mocked(getUserById).mockResolvedValue(makeUser(true))
    renderSignInProbe()
    authenticate()

    await waitFor(() => {
      expect(snapshotHandler.callback).not.toBeNull()
    })
    snapshotHandler.callback?.({
      exists: () => true,
      data: () => makeUser(false),
      metadata: { fromCache: false },
    })

    await waitFor(() => {
      expect(logOut).toHaveBeenCalled()
    })
    expect(sessionStorage.getItem('auth.blockedNotice')).toBe('1')
  })

  it('does not sign out while the profile remains active', async () => {
    vi.mocked(getUserById).mockResolvedValue(makeUser(true))
    renderSignInProbe()
    authenticate()

    await waitFor(() => {
      expect(snapshotHandler.callback).not.toBeNull()
    })
    snapshotHandler.callback?.({
      exists: () => true,
      data: () => makeUser(true),
      metadata: { fromCache: false },
    })

    expect(logOut).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('auth.blockedNotice')).toBeNull()
  })

  it('ignores cache-sourced snapshots so a stale flag cannot block re-login', async () => {
    vi.mocked(getUserById).mockResolvedValue(makeUser(true))
    renderSignInProbe()
    authenticate()

    await waitFor(() => {
      expect(snapshotHandler.callback).not.toBeNull()
    })
    snapshotHandler.callback?.({
      exists: () => true,
      data: () => makeUser(false),
      metadata: { fromCache: true },
    })

    expect(logOut).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('auth.blockedNotice')).toBeNull()
  })
})
