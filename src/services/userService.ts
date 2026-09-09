import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore'
import { db } from './firebaseConfig.ts'
import type { User, UserLocales, AuthProvider } from '../types/user.ts'
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

function toPublicUser(docSnap: { id: string; data: () => unknown }): User {
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

  // Blocked users (auth.isActive === false) must not be suggestible as
  // association managers. Legacy documents without the flag stay included.
  const isSearchable = (user: User) => user.auth?.isActive !== false

  const seen = new Set<string>()
  const merged: User[] = []

  for (const snapshot of snapshots) {
    for (const docSnap of snapshot.docs) {
      const id = docSnap.id
      if (seen.has(id)) continue
      seen.add(id)
      const user = toPublicUser(docSnap)
      if (!isSearchable(user)) continue
      merged.push(user)
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

  return toPublicUser(snapshot.docs[0])
}

export async function searchByEmailPrefix(prefix: string): Promise<User[]> {
  const MAX_RESULTS = 20
  const normalized = prefix.toLowerCase()

  const q = query(
    USERS_COLLECTION_REF,
    where('email', '>=', normalized),
    where('email', '<=', normalized + '\uf8ff'),
    orderBy('email'),
    limit(MAX_RESULTS)
  )
  const snapshot = await getDocs(q)

  // Unlike searchByFamilyName (invite search), blocked users MUST be
  // included: finding and unblocking them is the purpose of this search.
  return snapshot.docs.map(toPublicUser)
}

export async function setUserRole(
  id: string,
  role: 'manager' | 'user'
): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, id)
  await updateDoc(userRef, {
    role,
    updatedAt: serverTimestamp(),
  })
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

  return toPublicUser(snapshot)
}

export interface CreateUserInput {
  id: string
  email: string
  role?: User['role']
  passwordHash?: string | null
  providers?: AuthProvider[]
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
    email: input.email.toLowerCase(),
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

export interface UpdateUserInput {
  locales?: UserLocales
  auth?: User['auth']
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  const userRef = doc(db, USERS_COLLECTION, id)

  const patch: Record<string, unknown> = { updatedAt: serverTimestamp() }
  if (input.locales !== undefined) patch.locales = input.locales
  if (input.auth !== undefined) patch.auth = input.auth

  await updateDoc(userRef, patch)

  const updated = await getUserById(id)
  if (!updated) {
    throw new Error('Failed to update user')
  }

  return updated
}

export async function updateUserProviders(
  id: string,
  providers: AuthProvider[]
): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, id)
  // Dot-path patch so that sibling auth fields (passwordHash etc.) are preserved.
  await updateDoc(userRef, {
    'auth.providers': providers,
    updatedAt: serverTimestamp(),
  })
}
