

import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { videoApi, likesApi } from '../services/api.js'
import Player from '../components/Player.jsx'
import LikeButton from '../components/LikeButton.jsx'
import CommentList from '../components/CommentList.jsx'
import { emit, on } from '../utils/events.js'
import AddToPlaylist from '../components/AddToPlaylist.jsx'
import SubscribeButton from '../components/SubscribeButton.jsx'
import { useVideoState } from '../state/VideoStateContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'

export default function Watch() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { loading: authLoading, isAuthenticated } = useAuth()
  const { 
    getCachedVideo, 
    setCachedVideo, 
    hasViewedVideo, 
    markVideoAsViewed, 
    getLikeStatus,
    hasFailedVideo,
    markVideoAsFailed,
    clearFailedVideo
  } = useVideoState()

  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)
  
  // 🔒 CRITICAL: This Ref prevents double-fetching (and double-views)
  // It stores the ID of the video we have ALREADY started fetching.
  const fetchedIdRef = useRef(null)
  const hasViewedRef = useRef(false)

  // Reset the lock when ID or Retry Key changes
  useEffect(() => {
    fetchedIdRef.current = null
    hasViewedRef.current = false
    setVideo(null)
    setLoading(true)
    setError('')
    setNotFound(false)
  }, [id, retryKey])

  useEffect(() => {
    // 1. Validation Guards
    if (!id || authLoading) return 
    
    if (!isAuthenticated) {
      setLoading(false)
      setError('Please sign in to view this video.')
      return
    }

    // 2. 🔒 THE FIX: Strict Mode Guard
    // If we have already fetched (or are fetching) this ID, STOP immediately.
    // This prevents the +2, +4 view count issue.
    if (fetchedIdRef.current === id) {
      return 
    }

    // Mark this ID as "in progress" immediately (Synchronously)
    fetchedIdRef.current = id

    let isMounted = true
    const controller = new AbortController()

    const fetchVideoData = async () => {
      try {
        // 3. Cache Check
        // If data exists in cache, use it and DO NOT call API.
        // Calling API in background would increment view count again.
        const cached = getCachedVideo(id)
        if (cached && isMounted) {
          setVideo(cached.data)
          hasViewedRef.current = hasViewedVideo(id)
          clearFailedVideo(id)
          setLoading(false)
          return // 🛑 EXIT HERE to prevent API call
        }

        // 4. API Call (Only happens if not cached and not fetched yet)
        console.log(`Fetching video ${id} from API (View +1)...`)
        const { data } = await videoApi.get(id, { signal: controller.signal })
        
        if (!isMounted) return

        const v = data?.data || data
        
        if (!v) throw new Error("Video data empty")

        clearFailedVideo(id)
        setVideo(v)
        setCachedVideo(id, v)
        
        // Mark as viewed locally
        markVideoAsViewed(id)
        hasViewedRef.current = true
        emit('history:updated', { videoId: id })

      } catch (err) {
        if (!isMounted || err.name === 'Canceled') return
        
        // If fetch failed, allow retrying this ID later
        fetchedIdRef.current = null 
        
        console.error("Fetch error:", err)
        const status = err?.response?.status
        const message = err?.response?.data?.message || err?.message || ''
        
        if (status === 404 || status === 410 || message.toLowerCase().includes('not found')) {
           setNotFound(true)
           markVideoAsFailed(id)
        } else {
           setError(message || 'Failed to load video')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchVideoData()

    return () => {
      isMounted = false
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, retryKey, authLoading, isAuthenticated]) 

  // Sync views from socket/events
  useEffect(() => {
    const off = on('video:views:updated', ({ videoId, views }) => {
      if (videoId === id && video) {
        setVideo(prev => prev ? { ...prev, views } : null)
        setCachedVideo(id, { ...video, views })
      }
    })
    return off
  }, [id, video, setCachedVideo])

  // Like Logic
  const { isLiked: initialLiked, count: likeCount } = getLikeStatus(
    video?._id || id,
    video?.isLiked ?? false,
    typeof video?.likes === 'number' ? video.likes : 0
  )

  // -- RENDER UI --

  if (loading && !video) {
    return (
      <div className="flex items-center justify-center py-20">
         <div className="text-center space-y-3">
          <svg className="animate-spin h-8 w-8 text-primary-500 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm text-neutral-400">Loading video...</p>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="card p-12 text-center">
        <p className="text-neutral-400">Video not found</p>
        <button className="btn-primary mt-4" onClick={() => setRetryKey(k => k + 1)}>Retry</button>
      </div>
    )
  }

  if (!video) {
    return (
      <div className="card p-12 text-center">
        <p className="text-neutral-400">{error || 'Unable to load video.'}</p>
        <button className="btn-primary mt-4" onClick={() => setRetryKey(k => k + 1)}>Retry</button>
      </div>
    )
  }

  const title = video?.title || 'Untitled'
  const src = video?.videoFile?.url || video?.videoFile || video?.url || video?.videoUrl
  const poster = video?.thumbnail || video?.thumbnailUrl
  const owner = video?.owner || video?.channel || {}
  const views = video?.views ?? 0
  const createdAt = video?.createdAt ? new Date(video.createdAt).toLocaleDateString() : null

  return (
    <div className="space-y-6 py-4">
      <div className="w-full">
        <Player 
          src={src} 
          poster={poster} 
          title={title}
          videoId={id}
          onPlay={() => {
            if (!hasViewedRef.current) {
              markVideoAsViewed(id)
              hasViewedRef.current = true
            }
          }}
        />
      </div>

      <div className="card p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">{title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-400">
             <span>{views} views</span>
             {createdAt && <span>{createdAt}</span>}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-neutral-800">
          <div className="flex items-center gap-4">
            <img 
              src={owner?.avatar || ''} 
              alt={owner?.userName || 'Avatar'} 
              className="size-12 rounded-full object-cover border-2 border-neutral-800"
            />
            <div>
              <div className="font-semibold">{owner?.userName || owner?.fullName || 'Creator'}</div>
              {owner?.email && <div className="text-sm text-neutral-400">{owner.email}</div>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SubscribeButton channelId={owner?._id} />
            <LikeButton 
              videoId={video?._id} 
              initialLiked={initialLiked} 
              initialCount={likeCount} 
            />
            <AddToPlaylist videoId={video?._id} />
          </div>
        </div>
      </div>

      <CommentList videoId={video?._id} />
    </div>
  )
}