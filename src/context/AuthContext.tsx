import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { auth } from '../services/firebaseConfig.ts'
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
    queryClient.setQueryData(
      [USER_QUERY_KEY, credential.user.uid],
      profile
    )
  }, [ensureUserProfile, queryClient])

  const logout = useCallback(async () => {
    await logOut()
    queryClient.removeQueries({ queryKey: [USER_QUERY_KEY] })
  }, [queryClient])

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

