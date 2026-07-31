import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore'
import { db } from './firebaseConfig.ts'
import type { Association } from '../domain/association.ts'

const COLLECTION_NAME = 'associations'

export class FirestoreAssociationRepository {
  private get collectionRef() {
    return collection(db, COLLECTION_NAME)
  }

  async getById(id: string): Promise<Association | null> {
    const docRef = doc(db, COLLECTION_NAME, id)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
      return null
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
    } as Association
  }

  async listManagedByUser(userId: string): Promise<Association[]> {
    const q = query(
      this.collectionRef,
      where('managers', 'array-contains', userId)
    )
    const snapshot = await getDocs(q)

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Association[]
  }

  async listCreatedByUser(userId: string): Promise<Association[]> {
    const q = query(this.collectionRef, where('createdBy', '==', userId))
    const snapshot = await getDocs(q)

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Association[]
  }

  async create(association: Association): Promise<Association> {
    const docRef = doc(db, COLLECTION_NAME, association.id)
    await setDoc(docRef, association)
    return association
  }

  async update(association: Association): Promise<Association> {
    const docRef = doc(db, COLLECTION_NAME, association.id)
    await setDoc(docRef, association)
    return association
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id)
    await deleteDoc(docRef)
  }

  async listAll(): Promise<Association[]> {
    const snapshot = await getDocs(this.collectionRef)
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Association[]
  }
}

export const firestoreAssociationRepository =
  new FirestoreAssociationRepository()
