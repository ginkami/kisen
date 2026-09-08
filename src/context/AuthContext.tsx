import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { auth, db } from '../services/firebaseConfig.ts'
import i18n from '../i18n'
import { setBlockedNotice } from './blockedNotice.ts'
import {
  logOut,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  type AuthCredentials,
} from '../services/authService.ts'
import { createUser, getUserById } from '../services/userService.ts'
import type { User } from '../types/user.ts'
import { AuthContext, type SignUpInput } from './useAuth.ts'

// eslint-disable-next-line react-refresh/only-export-components
export { useAuth, type AuthContextValue } from './useAuth.ts'

const USER_QUERY_KEY = 'authUser'

/**
 * Client-side mirror of the auth.isActive flag: only an explicit `false`
 * blocks the user (legacy documents without `auth` count as active).
 */
export function isUserBlocked(profile: Pick<User, 'auth'> | null | undefined): boolean {
  return profile?.auth?.isActive === false
}

function blockedNoticeMessage(): string {
  return i18n.t('auth.errors.userBlocked')
}

/**
 * Splits a display name by whitespace into at most two tokens:
 * the first token becomes givenName, the second becomes familyName.
 * A single token fills only givenName; an empty name yields empty values.
 */
function splitDisplayName(displayName: string): { givenName: string; familyName: string } {
  const [givenName = '', familyName = ''] = displayName.trim().split(/\s+/)
  return { givenName, familyName }
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const queryClient = useQueryClient()

  const ensureUserProfile = useCallback(
    async (fbUser: FirebaseUser): Promise<User | null> => {
      try {
        const existing = await getUserById(fbUser.uid)
        if (existing) {
          return existing
        }

        const displayName = fbUser.displayName ?? ''
        const { givenName, familyName } = splitDisplayName(displayName)

        return await createUser({
          id: fbUser.uid,
          email: fbUser.email ?? '',
          role: 'user',
          passwordHash: null,
          providers: fbUser.providerData.map((p) => ({
            provider: p.providerId,
            externalId: p.uid,
          })),
          emailVerified: fbUser.emailVerified,
          isActive: true,
          locales: {
            ru: { familyName, givenName, displayName },
            en: { familyName, givenName, displayName },
          },
        })
      } catch (error) {
        console.error('Failed to ensure user profile:', error)
        return null
      }
    },
    []
  )

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setFirebaseUser(currentUser)
      setAuthReady(true)

      if (currentUser) {
        void queryClient.prefetchQuery({
          queryKey: [USER_QUERY_KEY, currentUser.uid],
          queryFn: async () => {
            try {
              return await ensureUserProfile(currentUser)
            } catch {
              return null
            }
          },
        })
      } else {
        queryClient.removeQueries({ queryKey: [USER_QUERY_KEY] })
      }
    })

    return () => unsubscribe()
  }, [queryClient, ensureUserProfile])

  const { data: user, isLoading: isProfileLoading } = useQuery({
    queryKey: [USER_QUERY_KEY, firebaseUser?.uid ?? ''],
    queryFn: async () => {
      if (!firebaseUser) return null
      return ensureUserProfile(firebaseUser)
    },
    enabled: !!firebaseUser && authReady,
    staleTime: 5 * 60 * 1000,
  })

  const signUp = useCallback(
    async (input: SignUpInput) => {
      const credential = await signUpWithEmail(input)
      const fbUser = credential.user

      const displayName = input.displayName.trim()
      const { givenName, familyName } = splitDisplayName(displayName)

      const created = await createUser({
        id: fbUser.uid,
        email: fbUser.email ?? input.email,
        role: 'user',
        passwordHash: null,
        providers: fbUser.providerData.map((p) => ({
          provider: p.providerId,
          externalId: p.uid,
        })),
        emailVerified: fbUser.emailVerified,
        isActive: true,
        locales: {
          ru: { familyName, givenName, displayName },
          en: { familyName, givenName, displayName },
        },
      })

      queryClient.setQueryData([USER_QUERY_KEY, fbUser.uid], created)
    },
    [queryClient]
  )

  const signIn = useCallback(
    async (credentials: AuthCredentials) => {
      const credential = await signInWithEmail(credentials)
      const profile = await ensureUserProfile(credential.user)
      if (isUserBlocked(profile)) {
        await logOut()
        queryClient.removeQueries({ queryKey: [USER_QUERY_KEY] })
        setBlockedNotice()
        throw new Error(blockedNoticeMessage())
      }
      queryClient.setQueryData(
        [USER_QUERY_KEY, credential.user.uid],
        profile
      )
    },
    [ensureUserProfile, queryClient]
  )

  const signInGoogle = useCallback(async () => {
    const credential = await signInWithGoogle()
    const profile = await ensureUserProfile(credential.user)
    if (isUserBlocked(profile)) {
      await logOut()
      queryClient.removeQueries({ queryKey: [USER_QUERY_KEY] })
      setBlockedNotice()
      throw new Error(blockedNoticeMessage())
    }
    queryClient.setQueryData(
      [USER_QUERY_KEY, credential.user.uid],
      profile
    )
  }, [ensureUserProfile, queryClient])

  const logout = useCallback(async () => {
    await logOut()
    queryClient.removeQueries({ queryKey: [USER_QUERY_KEY] })
  }, [queryClient])

  // Live enforcement: when an admin blocks the user mid-session
  // (auth.isActive flips to false), sign the session out immediately and
  // store a notice flag for the BlockedNoticeBanner.
  useEffect(() => {
    if (!firebaseUser) return

    const unsubscribe = onSnapshot(
      doc(db, 'users', firebaseUser.uid),
      (snapshot) => {
        // Ignore snapshots served from the persistent local cache: after a
        // block is lifted, the cache can hold a stale isActive=false which
        // must not block a fresh sign-in. Server snapshots are authoritative.
        if (snapshot.metadata.fromCache) return
        const data = snapshot.data() as { auth?: { isActive?: boolean } } | undefined
        if (snapshot.exists() && data?.auth?.isActive === false) {
          setBlockedNotice()
          void logOut().then(() => {
            queryClient.removeQueries({ queryKey: [USER_QUERY_KEY] })
          })
        }
      },
      (error) => {
        console.error('Failed to watch user profile:', error)
      }
    )

    return () => unsubscribe()
  }, [firebaseUser, queryClient])

  const value = useMemo(
    () => ({
      firebaseUser,
      user,
      isLoading: !authReady || isProfileLoading,
      isAuthenticated: !!firebaseUser,
      signUp,
      signIn,
      signInGoogle,
      logout,
    }),
    [
      firebaseUser,
      user,
      authReady,
      isProfileLoading,
      signUp,
      signIn,
      signInGoogle,
      logout,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

