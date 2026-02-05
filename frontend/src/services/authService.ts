import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../config/firebase'
import {
  type UserProfileCustomization,
  DEFAULT_CUSTOMIZATION,
} from '../config/profileCustomization'

// Owner account configuration
const OWNER_EMAIL = import.meta.env.VITE_OWNER_EMAIL || ''
const OWNER_CREDITS = 999
const OWNER_MIN_CREDITS = 50

// Check if a user is the owner
function isOwner(email: string | null | undefined): boolean {
  return Boolean(OWNER_EMAIL && email && email.toLowerCase() === OWNER_EMAIL.toLowerCase())
}

// User profile stored in Firestore
export interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL: string | null
  subscription: 'free' | 'pro' | 'unlimited'
  credits: number
  profileCustomization: UserProfileCustomization
  createdAt: Date
  updatedAt: Date
}

// Create or update user profile in Firestore
async function createUserProfile(firebaseUser: FirebaseUser): Promise<UserProfile> {
  const userRef = doc(db, 'users', firebaseUser.uid)
  const userSnap = await getDoc(userRef)

  if (userSnap.exists()) {
    // User exists, return existing profile
    const data = userSnap.data()
    let credits = data.credits ?? 10

    // Owner account: auto top-up if below minimum
    if (isOwner(firebaseUser.email) && credits < OWNER_MIN_CREDITS) {
      credits = OWNER_CREDITS
      await updateDoc(userRef, { credits: OWNER_CREDITS, updatedAt: serverTimestamp() })
    }

    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: data.displayName || firebaseUser.displayName || 'Player',
      photoURL: data.photoURL || firebaseUser.photoURL,
      subscription: data.subscription || 'free',
      credits,
      profileCustomization: data.profileCustomization || DEFAULT_CUSTOMIZATION,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    }
  }

  // Create new user profile
  // Owner gets max credits, regular users get starting credits
  const startingCredits = isOwner(firebaseUser.email) ? OWNER_CREDITS : 400

  const newProfile: Omit<UserProfile, 'createdAt' | 'updatedAt'> & {
    createdAt: ReturnType<typeof serverTimestamp>
    updatedAt: ReturnType<typeof serverTimestamp>
  } = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || 'Player',
    photoURL: firebaseUser.photoURL,
    subscription: 'free',
    credits: startingCredits,
    profileCustomization: DEFAULT_CUSTOMIZATION,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(userRef, newProfile)

  return {
    ...newProfile,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as UserProfile
}

// Sign up with email and password
export async function signUp(
  email: string,
  password: string,
  displayName: string
): Promise<UserProfile> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password)

  // Update Firebase Auth profile
  await updateProfile(userCredential.user, { displayName })

  // Create Firestore profile
  return createUserProfile(userCredential.user)
}

// Sign in with email and password
export async function signIn(email: string, password: string): Promise<UserProfile> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password)
  return createUserProfile(userCredential.user)
}

// Sign in with Google
export async function signInWithGoogle(): Promise<UserProfile> {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })

  const userCredential = await signInWithPopup(auth, provider)
  return createUserProfile(userCredential.user)
}

// Sign out
export async function logOut(): Promise<void> {
  await signOut(auth)
}

// Get user profile from Firestore
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, 'users', uid)
  const userSnap = await getDoc(userRef)

  if (!userSnap.exists()) return null

  const data = userSnap.data()
  return {
    uid,
    email: data.email || '',
    displayName: data.displayName || 'Player',
    photoURL: data.photoURL,
    subscription: data.subscription || 'free',
    credits: data.credits ?? 0,
    profileCustomization: data.profileCustomization || DEFAULT_CUSTOMIZATION,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  }
}

// Update user profile
export async function updateUserProfile(
  uid: string,
  updates: Partial<Pick<UserProfile, 'displayName' | 'photoURL'>>
): Promise<void> {
  const userRef = doc(db, 'users', uid)
  await updateDoc(userRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  })
}

// Update profile customization
export async function updateProfileCustomization(
  uid: string,
  customization: UserProfileCustomization
): Promise<void> {
  const userRef = doc(db, 'users', uid)
  await updateDoc(userRef, {
    profileCustomization: customization,
    updatedAt: serverTimestamp(),
  })
}

// Use credits
export async function useCredits(uid: string, amount: number): Promise<number> {
  const userRef = doc(db, 'users', uid)
  const userSnap = await getDoc(userRef)

  if (!userSnap.exists()) throw new Error('User not found')

  const data = userSnap.data()
  const currentCredits = data.credits ?? 0
  const userEmail = data.email

  // Owner auto top-up: if credits would drop below minimum, top up first
  if (isOwner(userEmail) && currentCredits - amount < OWNER_MIN_CREDITS) {
    await updateDoc(userRef, {
      credits: OWNER_CREDITS,
      updatedAt: serverTimestamp(),
    })
    return OWNER_CREDITS
  }

  if (currentCredits < amount) throw new Error('Insufficient credits')

  const newCredits = currentCredits - amount
  await updateDoc(userRef, {
    credits: newCredits,
    updatedAt: serverTimestamp(),
  })

  return newCredits
}

// Add credits (for purchases or rewards)
export async function addCredits(uid: string, amount: number): Promise<number> {
  const userRef = doc(db, 'users', uid)
  const userSnap = await getDoc(userRef)

  if (!userSnap.exists()) throw new Error('User not found')

  const currentCredits = userSnap.data().credits ?? 0
  const newCredits = currentCredits + amount

  await updateDoc(userRef, {
    credits: newCredits,
    updatedAt: serverTimestamp(),
  })

  return newCredits
}

// Subscribe to auth state changes
export function onAuthChange(callback: (user: FirebaseUser | null) => void): () => void {
  return onAuthStateChanged(auth, callback)
}

// Get current Firebase user
export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser
}
