import { createContext, useContext } from 'react'
import type { User as FirebaseUser } from 'firebase/auth'
import type { AuthCredentials } from '../services/authService.ts'
import type { User } from '../types/user.ts'

export interface SignUpInput extends AuthCredentials {
  displayName: string
}

export interface AuthContextValue {
  firebaseUser: FirebaseUser | null
  user: User | null | undefined
  isLoading: boolean
  isAuthenticated: boolean
  signUp: (input: SignUpInput) => Promise<void>
  signIn: (credentials: AuthCredentials) => Promise<void>
  signInGoogle: () => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
