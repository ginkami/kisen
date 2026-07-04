import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type UserCredential,
} from 'firebase/auth'
import { auth } from './firebaseConfig.ts'

export interface AuthCredentials {
  email: string
  password: string
}

export async function signUpWithEmail(
  credentials: AuthCredentials
): Promise<UserCredential> {
  return createUserWithEmailAndPassword(
    auth,
    credentials.email,
    credentials.password
  )
}

export async function signInWithEmail(
  credentials: AuthCredentials
): Promise<UserCredential> {
  return signInWithEmailAndPassword(
    auth,
    credentials.email,
    credentials.password
  )
}

export async function signInWithGoogle(): Promise<UserCredential> {
  const provider = new GoogleAuthProvider()
  return signInWithPopup(auth, provider)
}

export async function logOut(): Promise<void> {
  return signOut(auth)
}

export function getCurrentAuthUser() {
  return auth.currentUser
}
