import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useDeck } from '../../contexts/DeckContext'
import type { Deck } from '../../contexts/DeckContext'
import { getDeck, firestoreDeckToAppDeck } from '../../services/deckService'
import {
  toggleLike,
  hasUserLiked,
  incrementViewCount,
  getComments,
  addComment,
  deleteComment,
  type DeckComment,
} from '../../services/socialService'
import './DeckDetail.css'

export default function DeckDetail() {
  const { deckId } = useParams<{ deckId: string }>()
  const { user } = useAuth()
  const { setDeckForAnalysis } = useDeck()
  const navigate = useNavigate()

  const [deck, setDeck] = useState<Deck | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Engagement state
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [comments, setComments] = useState<DeckComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!deckId) return

    const loadDeck = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const firestoreDeck = await getDeck(deckId)
        if (!firestoreDeck) {
          setError('Deck not found')
          return
        }

        const appDeck = firestoreDeckToAppDeck(firestoreDeck)
        setDeck(appDeck)
        setLikeCount(appDeck.likeCount || 0)

        // Increment view count
        incrementViewCount(deckId).catch(() => {})

        // Check like status and load comments in parallel
        const loadTasks: Promise<void>[] = []

        if (user) {
          loadTasks.push(
            hasUserLiked(deckId, user.uid).then((liked) => setIsLiked(liked))
          )
        }

        loadTasks.push(
          getComments(deckId).then((c) => setComments(c))
        )

        await Promise.all(loadTasks)
      } catch (err) {
        console.error('Failed to load deck:', err)
        setError('Failed to load deck')
      } finally {
        setIsLoading(false)
      }
    }

    loadDeck()
  }, [deckId, user])

  const handleLike = useCallback(async () => {
    if (!user || !deckId) return

    const wasLiked = isLiked
    setIsLiked(!wasLiked)
    setLikeCount((c) => c + (wasLiked ? -1 : 1))

    try {
      await toggleLike(deckId, user.uid)
    } catch (err) {
      console.error('Failed to toggle like:', err)
      setIsLiked(wasLiked)
      setLikeCount((c) => c + (wasLiked ? 1 : -1))
    }
  }, [user, deckId, isLiked])

  const handleAddComment = useCallback(async () => {
    if (!user || !deckId || !newComment.trim()) return

    setIsSubmittingComment(true)
    try {
      const commentId = await addComment(deckId, user.uid, user.displayName, newComment.trim())
      setComments((prev) => [
        {
          id: commentId,
          authorId: user.uid,
          authorName: user.displayName,
          content: newComment.trim(),
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ])
      setNewComment('')
    } catch (err) {
      console.error('Failed to add comment:', err)
    } finally {
      setIsSubmittingComment(false)
    }
  }, [user, deckId, newComment])

  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!deckId) return
    try {
      await deleteComment(deckId, commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch (err) {
      console.error('Failed to delete comment:', err)
    }
  }, [deckId])

  const handleShare = useCallback(() => {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [])

  const handleAnalyze = useCallback(() => {
    if (!deck) return
    setDeckForAnalysis(deck.name, deck.format, deck.cards, deck.commander)
    navigate('/analysis')
  }, [deck, setDeckForAnalysis, navigate])

  const getFormatColor = (format: string): string => {
    const colors: Record<string, string> = {
      standard: '#22c55e',
      modern: '#3b82f6',
      commander: '#8b5cf6',
      pioneer: '#f59e0b',
      legacy: '#ef4444',
      vintage: '#ec4899',
      pauper: '#6b7280',
    }
    return colors[format] || '#6b7280'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatCommentDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(dateString)
  }

  if (isLoading) {
    return (
      <div className="deck-detail-page">
        <div className="deck-detail-loading">Loading deck...</div>
      </div>
    )
  }

  if (error || !deck) {
    return (
      <div className="deck-detail-page">
        <div className="deck-detail-error">
          <h2>{error || 'Deck not found'}</h2>
          <Link to="/public-decks" className="back-link">Back to Explore</Link>
        </div>
      </div>
    )
  }

  // Group cards by type
  const cardsByType = new Map<string, { name: string; quantity: number; cmc: number; manaCost: string }[]>()
  deck.cards.forEach((card) => {
    const type = card.cardType.charAt(0).toUpperCase() + card.cardType.slice(1)
    if (!cardsByType.has(type)) cardsByType.set(type, [])
    cardsByType.get(type)!.push({
      name: card.name,
      quantity: card.quantity,
      cmc: card.cmc,
      manaCost: card.manaCost,
    })
  })

  // Sort types in conventional order
  const typeOrder = ['Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Planeswalker', 'Land']
  const sortedTypes = Array.from(cardsByType.entries()).sort((a, b) => {
    const ai = typeOrder.indexOf(a[0])
    const bi = typeOrder.indexOf(b[0])
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  let totalCards = 0
  deck.cards.forEach((c) => { totalCards += c.quantity })
  if (deck.commander) totalCards += 1

  return (
    <div className="deck-detail-page">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/public-decks">Explore</Link>
        <span className="separator">/</span>
        <span>{deck.name}</span>
      </div>

      {/* Deck Header */}
      <div className="deck-detail-header">
        <div className="deck-detail-title">
          <h1>{deck.name}</h1>
          <div className="deck-detail-meta">
            <span
              className="format-badge"
              style={{
                background: `${getFormatColor(deck.format)}20`,
                color: getFormatColor(deck.format),
              }}
            >
              {deck.format.charAt(0).toUpperCase() + deck.format.slice(1)}
            </span>
            <span className="meta-item">{totalCards} cards</span>
            <span className="meta-item">Updated {formatDate(deck.updatedAt)}</span>
          </div>
        </div>

        <div className="deck-detail-actions">
          <button
            type="button"
            className={`action-btn like-btn ${isLiked ? 'liked' : ''}`}
            onClick={handleLike}
            disabled={!user}
          >
            {isLiked ? '\u2764\uFE0F' : '\u2661'} {likeCount}
          </button>
          <button type="button" className="action-btn share-btn" onClick={handleShare}>
            {copied ? 'Copied!' : 'Share'}
          </button>
          <button type="button" className="action-btn analyze-btn" onClick={handleAnalyze}>
            Analyze
          </button>
        </div>
      </div>

      {/* Author */}
      <Link to={`/profile/${deck.authorId}`} className="deck-author-bar">
        <div className="author-avatar-sm">
          {deck.authorName.charAt(0).toUpperCase()}
        </div>
        <span className="author-name-link">{deck.authorName}</span>
      </Link>

      {/* Description & Tags */}
      {deck.description && (
        <div className="deck-detail-description">
          <p>{deck.description}</p>
        </div>
      )}

      {deck.tags && deck.tags.length > 0 && (
        <div className="deck-detail-tags">
          {deck.tags.map((tag, i) => (
            <span key={i} className="detail-tag">{tag}</span>
          ))}
        </div>
      )}

      {/* Commander */}
      {deck.commander && (
        <div className="commander-section">
          <h3>Commander</h3>
          <div className="commander-card">
            {deck.commander.scryfallData?.image_uris?.normal && (
              <img
                src={deck.commander.scryfallData.image_uris.normal}
                alt={deck.commander.name}
                className="commander-img"
              />
            )}
            <div className="commander-info">
              <span className="commander-name">{deck.commander.name}</span>
              <span className="commander-type">{deck.commander.cardType}</span>
            </div>
          </div>
        </div>
      )}

      {/* Card List */}
      <div className="card-list-section">
        <h3>Decklist</h3>
        <div className="card-list-columns">
          {sortedTypes.map(([type, cards]) => {
            const typeTotal = cards.reduce((s, c) => s + c.quantity, 0)
            return (
              <div key={type} className="card-type-group">
                <h4>
                  {type} ({typeTotal})
                </h4>
                <ul>
                  {cards
                    .sort((a, b) => a.cmc - b.cmc || a.name.localeCompare(b.name))
                    .map((card) => (
                      <li key={card.name}>
                        <span className="card-qty">{card.quantity}x</span>
                        <span className="card-name">{card.name}</span>
                      </li>
                    ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>

      {/* Comments */}
      <div className="comments-section">
        <h3>Comments ({comments.length})</h3>

        {user && (
          <div className="comment-form">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={3}
            />
            <button
              type="button"
              className="submit-comment-btn"
              onClick={handleAddComment}
              disabled={isSubmittingComment || !newComment.trim()}
            >
              {isSubmittingComment ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        )}

        {comments.length > 0 ? (
          <div className="comments-list">
            {comments.map((comment) => (
              <div key={comment.id} className="comment-item">
                <div className="comment-header">
                  <Link to={`/profile/${comment.authorId}`} className="comment-author">
                    <div className="comment-avatar">
                      {comment.authorName.charAt(0).toUpperCase()}
                    </div>
                    <span>{comment.authorName}</span>
                  </Link>
                  <span className="comment-date">{formatCommentDate(comment.createdAt)}</span>
                  {user?.uid === comment.authorId && (
                    <button
                      type="button"
                      className="delete-comment-btn"
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      x
                    </button>
                  )}
                </div>
                <p className="comment-content">{comment.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-comments">No comments yet. Be the first!</p>
        )}
      </div>
    </div>
  )
}
