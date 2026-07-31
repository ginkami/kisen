import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore'
import { db } from './firebaseConfig.ts'
import type { User, UserLocales } from '../types/user.ts'
import { supportedLocales } from '../domain/locale.ts'

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

const USERS_COLLECTION_REF = collection(db, 'users')

export async function searchByFamilyName(prefix: string): Promise<User[]> {
  const MAX_RESULTS = 20

  const perLocaleQueries = supportedLocales.map((locale) => {
    const fieldPath = `locales.${locale}.familyName`
    const q = query(
      USERS_COLLECTION_REF,
      where(fieldPath, '>=', prefix),
      where(fieldPath, '<=', prefix + '\uf8ff'),
      orderBy(fieldPath),
      limit(MAX_RESULTS)
    )
    return getDocs(q)
  })

  const snapshots = await Promise.all(perLocaleQueries)

  const seen = new Set<string>()
  const merged: User[] = []

  for (const snapshot of snapshots) {
    for (const docSnap of snapshot.docs) {
      const id = docSnap.id
      if (seen.has(id)) continue
      seen.add(id)
      const data = docSnap.data() as FirestoreUser
      merged.push({
        id,
        email: data.email,
        role: data.role,
        auth: data.auth,
        locales: data.locales,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      })
      if (merged.length >= MAX_RESULTS) return merged
    }
  }

  return merged
}

export async function getByEmail(email: string): Promise<User | null> {
  const q = query(
    USERS_COLLECTION_REF,
    where('email', '==', email.toLowerCase())
  )
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null

  const docSnap = snapshot.docs[0]
  const data = docSnap.data() as FirestoreUser
  return {
    id: docSnap.id,
    email: data.email,
    role: data.role,
    auth: data.auth,
    locales: data.locales,
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
  }
}

export async function getByIds(ids: string[]): Promise<User[]> {
  if (ids.length === 0) return []
  const users: User[] = []
  await Promise.all(
    ids.map(async (id) => {
      const user = await getUserById(id)
      if (user) users.push(user)
    })
  )
  return users
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
    ru: {
      familyName: 'Placeholder',
      givenName: 'Placeholder',
      displayName: 'Placeholder',
    },
    en: {
      familyName: 'Placeholder',
      givenName: 'Placeholder',
      displayName: 'Placeholder',
    },
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
    role: input.role ?? 'user',
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
