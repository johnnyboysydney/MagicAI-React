import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  increment,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '../config/firebase'

// ── Types ──

export interface DeckComment {
  id: string
  authorId: string
  authorName: string
  content: string
  createdAt: string
}

export interface LikeStatus {
  liked: boolean
  likeCount: number
}

// ── Likes ──

/** Toggle like on a deck. Returns new like status. */
export async function toggleLike(deckId: string, userId: string): Promise<LikeStatus> {
  const likeRef = doc(db, 'decks', deckId, 'likes', userId)
  const deckRef = doc(db, 'decks', deckId)
  const likeSnap = await getDoc(likeRef)

  if (likeSnap.exists()) {
    // Unlike
    await deleteDoc(likeRef)
    await updateDoc(deckRef, { likeCount: increment(-1) })
    const deckSnap = await getDoc(deckRef)
    return { liked: false, likeCount: deckSnap.data()?.likeCount || 0 }
  } else {
    // Like
    await setDoc(likeRef, { likedAt: serverTimestamp() })
    await updateDoc(deckRef, { likeCount: increment(1) })
    const deckSnap = await getDoc(deckRef)
    return { liked: true, likeCount: deckSnap.data()?.likeCount || 0 }
  }
}

/** Check if a user has liked a deck. */
export async function hasUserLiked(deckId: string, userId: string): Promise<boolean> {
  const likeRef = doc(db, 'decks', deckId, 'likes', userId)
  const likeSnap = await getDoc(likeRef)
  return likeSnap.exists()
}

/** Batch check which decks a user has liked. */
export async function getUserLikedDecks(deckIds: string[], userId: string): Promise<Set<string>> {
  const liked = new Set<string>()
  // Check each deck in parallel
  const checks = deckIds.map(async (deckId) => {
    const isLiked = await hasUserLiked(deckId, userId)
    if (isLiked) liked.add(deckId)
  })
  await Promise.all(checks)
  return liked
}

// ── Views ──

/** Increment view count for a deck. */
export async function incrementViewCount(deckId: string): Promise<void> {
  const deckRef = doc(db, 'decks', deckId)
  await updateDoc(deckRef, { viewCount: increment(1) })
}

// ── Comments ──

/** Get comments for a deck. */
export async function getComments(deckId: string, limitCount = 50): Promise<DeckComment[]> {
  const commentsRef = collection(db, 'decks', deckId, 'comments')
  const q = query(commentsRef, orderBy('createdAt', 'desc'), limit(limitCount))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => {
    const data = doc.data()
    const createdAt = data.createdAt as Timestamp | undefined
    return {
      id: doc.id,
      authorId: data.authorId,
      authorName: data.authorName,
      content: data.content,
      createdAt: createdAt ? createdAt.toDate().toISOString() : new Date().toISOString(),
    }
  })
}

/** Add a comment to a deck. Returns the new comment ID. */
export async function addComment(
  deckId: string,
  userId: string,
  userName: string,
  content: string
): Promise<string> {
  const commentsRef = collection(db, 'decks', deckId, 'comments')
  const docRef = await addDoc(commentsRef, {
    authorId: userId,
    authorName: userName,
    content,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

/** Delete a comment. */
export async function deleteComment(deckId: string, commentId: string): Promise<void> {
  const commentRef = doc(db, 'decks', deckId, 'comments', commentId)
  await deleteDoc(commentRef)
}

// ── Trending ──

/** Get decks sorted by like count for trending. */
export async function getTrendingDecks(limitCount = 10) {
  const decksRef = collection(db, 'decks')
  const q = query(
    decksRef,
    where('isPublic', '==', true),
    orderBy('likeCount', 'desc'),
    limit(limitCount)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}
