import { useEffect, useState } from 'react'
import { commentsApi } from '../services/api.js'
import LikeButton from './LikeButton.jsx'
import { useAuth } from '../state/AuthContext.jsx'

export default function CommentList({ videoId }) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await commentsApi.list(videoId)
      // Backend ApiResponse: { statusCode, success, message, data: { comments: [], totalComments, pagination } }
      const responseData = data?.data || data || {}
      const arr = Array.isArray(responseData) 
        ? responseData 
        : (Array.isArray(responseData?.comments) 
          ? responseData.comments 
          : (Array.isArray(responseData?.result?.docs)
            ? responseData.result.docs
            : (Array.isArray(responseData?.result?.data)
              ? responseData.result.data
              : [])))
      setComments(arr.filter(Boolean))
    } catch (error) {
      console.error('Failed to load comments:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [videoId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim() || submitting) return

    setSubmitting(true)
    try {
      await commentsApi.add(videoId, { content: text })
      setText('')
      await load()
    } catch (error) {
      console.error('Failed to add comment:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (commentId) => {
    try {
      await commentsApi.remove(commentId)
      await load()
    } catch (error) {
      console.error('Failed to delete comment:', error)
    }
  }

  const handleLikeChange = async (commentId, newLiked) => {
    // Update the comment's like status in the local state
    setComments((prev) =>
      prev.map((c) =>
        c._id === commentId
          ? {
              ...c,
              isLiked: newLiked,
              likesCount: newLiked ? (c.likesCount || 0) + 1 : Math.max(0, (c.likesCount || 0) - 1)
            }
          : c
      )
    )
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="font-medium">Comments</div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input 
          className="input flex-1" 
          placeholder="Add a comment..." 
          value={text} 
          onChange={(e) => setText(e.target.value)}
          disabled={submitting}
        />
        <button className="btn-primary" disabled={submitting || !text.trim()}>
          {submitting ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Posting...
            </>
          ) : (
            'Post'
          )}
        </button>
      </form>
      {loading ? (
        <div className="text-sm opacity-70">Loading…</div>
      ) : comments.length === 0 ? (
        <div className="text-sm opacity-70 text-center py-4">No comments yet. Be the first to comment!</div>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => {
            const isOwner = user?._id === c?.owner?._id || user?._id === c?.owner
            const likesCount = c.likesCount !== undefined ? c.likesCount : (c.likes || 0)
            const isLiked = c.isLiked !== undefined ? c.isLiked : false

            return (
              <li key={c._id} className="bg-muted rounded-lg p-3">
                <div className="flex items-start gap-3">
                  <img 
                    src={c?.owner?.avatar || ''} 
                    alt="avatar" 
                    className="size-8 rounded-full object-cover bg-surface" 
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {c?.owner?.userName || c?.owner?.fullName || c?.owner?.email || 'User'}
                      </span>
                      {c.createdAt && (
                        <span className="text-xs opacity-60">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="text-sm mb-2 whitespace-pre-wrap break-words">
                      {c.content || c.text}
                    </div>
                    <div className="flex items-center gap-3">
                      <LikeButton
                        commentId={c._id}
                        initialLiked={isLiked}
                        initialCount={likesCount}
                        onLikeChange={(newLiked) => handleLikeChange(c._id, newLiked)}
                      />
                      {isOwner && (
                        <button
                          className="text-xs opacity-70 hover:opacity-100 hover:text-red-400 transition-colors"
                          onClick={() => handleDelete(c._id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
