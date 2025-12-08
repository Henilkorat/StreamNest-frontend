import { useState, useEffect, useRef } from 'react'
import { likesApi } from '../services/api.js'
import { useVideoState } from '../state/VideoStateContext.jsx'
import { on } from '../utils/events.js'

export default function LikeButton({ videoId, commentId, initialLiked = false, initialCount = 0, onLikeChange }) {
  const { getLikeStatus, toggleLike, checkLike } = useVideoState()
  const [loading, setLoading] = useState(false)
  const itemId = commentId || videoId
  const prevIdRef = useRef(itemId)
  const hasInteractedRef = useRef(false)

  // Get like status from centralized store (only for videos, not comments)
  const likeStatus = videoId ? getLikeStatus(
    videoId,
    initialLiked !== null ? initialLiked : null,
    typeof initialCount === 'number' ? initialCount : 0
  ) : { isLiked: initialLiked, count: typeof initialCount === 'number' ? initialCount : 0 }

  const { isLiked, count } = likeStatus

  // Reset when item changes
  useEffect(() => {
    if (prevIdRef.current !== itemId) {
      prevIdRef.current = itemId
      hasInteractedRef.current = false
    }
  }, [itemId])

  // Listen for like updates (only revalidate, don't call on mount)
  useEffect(() => {
    if (!videoId) return
    const off = on('likes:updated', ({ videoId: updatedVideoId }) => {
      if (updatedVideoId === videoId) {
        // Only revalidate if this video was updated
        checkLike(videoId).catch(() => {})
      }
    })
    return off
  }, [videoId]) // Don't include checkLike in deps to avoid loop

  const handleToggle = async () => {
    if (loading || !itemId) return

    hasInteractedRef.current = true
    setLoading(true)
    
    try {
      if (commentId) {
        // Comments still use direct API call (not in centralized store)
        await likesApi.toggleComment(itemId)
        if (onLikeChange) {
          onLikeChange(!isLiked)
        }
      } else if (videoId) {
        // Videos use centralized store
        await toggleLike(videoId, count)
        if (onLikeChange) {
          onLikeChange(!isLiked)
        }
      }
    } catch (error) {
      console.error('Failed to toggle like:', error)
      hasInteractedRef.current = false
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm border transition-colors ${
        isLiked 
          ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700' 
          : 'bg-surface border-neutral-800 hover:bg-muted'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={handleToggle}
      disabled={loading}
      aria-label={isLiked ? 'Unlike video' : 'Like video'}
    >
      <span>👍</span>
    </button>
  )
}
