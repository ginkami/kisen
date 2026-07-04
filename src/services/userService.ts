import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore'
import { db } from './firebaseConfig.ts'
import type { User, UserLocales } from '../types/user.ts'

const USERS_COLLECTION = 'users'

interface FirestoreUser {
  id: string
  email: string
  role: User['role']
  auth: User['auth']
  locales: UserLocales
  createdAt: Timestamp
  updatedAt: Timestamp
}

export async function getUserById(id: string): Promise<User | null> {
  const userRef = doc(db, USERS_COLLECTION, id)
  const snapshot = await getDoc(userRef)

  if (!snapshot.exists()) {
    return null
  }

  const data = snapshot.data() as FirestoreUser

  return {
    id: snapshot.id,
    email: data.email,
    role: data.role,
    auth: data.auth,
    locales: data.locales,
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
  }
}

export interface CreateUserInput {
  id: string
  email: string
  role?: User['role']
  passwordHash?: string | null
  providers?: User['auth']['providers']
  emailVerified?: boolean
  isActive?: boolean
  locales?: Partial<UserLocales>
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const now = serverTimestamp()

  const fallbackLocales: UserLocales = {
    ru: { familyName: 'Placeholder', givenName: 'Placeholder' },
    en: { familyName: 'Placeholder', givenName: 'Placeholder' },
  }

  const mergedLocales: UserLocales = {
    ru: { ...fallbackLocales.ru, ...input.locales?.ru },
    en: { ...fallbackLocales.en, ...input.locales?.en },
  }

  const userData: Omit<FirestoreUser, 'createdAt' | 'updatedAt'> & {
    createdAt: ReturnType<typeof serverTimestamp>
    updatedAt: ReturnType<typeof serverTimestamp>
  } = {
    id: input.id,
    email: input.email,
    role: input.role ?? 'manager',
    auth: {
      passwordHash: input.passwordHash ?? null,
      providers: input.providers ?? [],
      emailVerified: input.emailVerified ?? false,
      isActive: input.isActive ?? true,
    },
    locales: mergedLocales,
    createdAt: now,
    updatedAt: now,
  }

  const userRef = doc(db, USERS_COLLECTION, input.id)
  await setDoc(userRef, userData)

  const created = await getUserById(input.id)
  if (!created) {
    throw new Error('Failed to create user')
  }

  return created
}
