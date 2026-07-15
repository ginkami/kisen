import {
  createContext,
  useCallback,
  useContext,
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

export interface SignUpInput extends AuthCredentials {
  displayName: string
}

interface AuthContextValue {
  firebaseUser: FirebaseUser | null
  user: User | null | undefined
  isLoading: boolean
  isAuthenticated: boolean
  signUp: (input: SignUpInput) => Promise<void>
  signIn: (credentials: AuthCredentials) => Promise<void>
  signInGoogle: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const USER_QUERY_KEY = 'authUser'

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
        const [givenName = 'Placeholder', familyName = 'Placeholder'] =
          displayName.split(' ')

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
            ru: { familyName, givenName, displayName: givenName },
            en: { familyName, givenName, displayName: givenName },
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
      const [givenName = 'Placeholder', familyName = 'Placeholder'] =
        displayName.split(' ')

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

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
