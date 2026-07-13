export type UserRole = 'user' | 'admin' | 'manager'

export interface AuthProvider {
  provider: string
  externalId: string
}

export interface UserAuth {
  passwordHash: string | null
  providers: AuthProvider[]
  emailVerified: boolean
  isActive: boolean
}

export interface UserLocale {
  familyName: string
  givenName: string
  displayName: string
}

export interface UserLocales {
  ru: UserLocale
  en: UserLocale
}

export interface User {
  id: string
  email: string
  role: UserRole
  auth: UserAuth
  locales: UserLocales
  createdAt: Date
  updatedAt: Date
}
