import { useEffect, useState } from 'react'
import { likesApi, userApi, playlistApi, videoApi } from '../services/api.js'
import { useAuth } from '../state/AuthContext.jsx'
import { useVideoState } from '../state/VideoStateContext.jsx'
import VideoCard from '../components/VideoCard.jsx'
import { Link } from 'react-router-dom'
import { on } from '../utils/events.js'

function getVideoId(item) {
  return item?.video?._id || item?._id || item?.id || item?.videoId
}

async function enrichVideos(items, getCachedVideo, hasFailedVideo, markVideoAsFailed) {
  const list = (Array.isArray(items) ? items : []).filter(Boolean)
  
  // Pre-filter: skip videos that have already failed (prevents spam and unnecessary API calls)
  const validItems = list.filter(it => {
    const id = getVideoId(it)
    return id && !hasFailedVideo(id)
  })
  
  const results = await Promise.all(validItems.map(async (it) => {
    const v = it?.video || it
    const id = getVideoId(it)
    const hasBasics = v && (v.thumbnail || v.title || v.videoFile || v.url || v.videoUrl) && (v._id || v.id)
    
    if (hasBasics) {
      // Use cached views if available (same as Home/Watch) to avoid +1 drift
      if (id && getCachedVideo) {
        const cached = getCachedVideo(id)
        if (cached?.data?.views !== undefined) {
          return { ...v, views: cached.data.views }
        }
      }
      return v
    }
    
    if (!id) return null
    
    // Prefer cached data to avoid incrementing views unnecessarily
    const cached = getCachedVideo ? getCachedVideo(id) : null
    if (cached?.data) {
      return cached.data
    }
    
    // CRITICAL: Do NOT call videoApi.get() here - it increments views!
    // If video is missing basics, it's likely deleted or incomplete
    // Backend should return full video data for liked/history, so missing basics = deleted
    // Mark as failed immediately to prevent future fetch attempts and spam
    markVideoAsFailed(id)
    return null
  }))
  
  // Filter out null values (deleted/missing videos)
  return results.filter(v => v && (v._id || v.id))
}

function sortByRecent(list) {
  return [...list].sort((a, b) => {
    const ad = new Date(a?.watchedAt || a?.updatedAt || a?.createdAt || 0).getTime()
    const bd = new Date(b?.watchedAt || b?.updatedAt || b?.createdAt || 0).getTime()
    return bd - ad
  })
}

export default function Library() {
  const { user, isAuthenticated } = useAuth()
  const { hasShownRemovalToast, markRemovalToastShown, getCachedVideo, hasFailedVideo, markVideoAsFailed } = useVideoState()
  const [liked, setLiked] = useState([])
  const [history, setHistory] = useState([])
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    if (!isAuthenticated || !user?._id) return
    setLoading(true)
    setError('')
    try {
      try {
        const res = await likesApi.likedVideos()
        // Backend ApiResponse: { statusCode, success, message, data: { total, videos: [{ video: {...} }] } }
        const responseData = res?.data?.data ?? res?.data ?? {}
        const likedList = Array.isArray(responseData) 
          ? responseData 
          : (Array.isArray(responseData?.videos) 
            ? responseData.videos 
            : [])
        
        // Extract video objects from like objects (backend returns { video: {...} })
        const videoItems = likedList
          .filter(Boolean)
          .map((item) => item?.video || item)
          .filter(v => v && (v._id || v.id))
        
        const enriched = await enrichVideos(videoItems, getCachedVideo, hasFailedVideo, markVideoAsFailed)
        setLiked(enriched)
        
        // Silently filter out deleted videos without showing toast
        // Compare original count with enriched count to detect deletions
        const enrichedIds = new Set(enriched.map(v => v._id || v.id).filter(Boolean))
        const removedIds = videoItems
          .map(item => getVideoId(item))
          .filter(id => id && !enrichedIds.has(id))
        
        // Mark removed videos as failed to prevent future fetch attempts
        // No toast notification - videos are silently removed from the list
        removedIds.forEach(id => {
          markVideoAsFailed(id)
        })
      } catch { setLiked([]) }
      try {
        const res = await userApi.history()
        // Backend returns watchHistory array from user model
        const raw = res?.data?.data ?? res?.data ?? []
        const arr = (Array.isArray(raw) ? raw : (Array.isArray(raw?.videos) ? raw.videos : [])).filter(Boolean)
        const enriched = await enrichVideos(arr, getCachedVideo, hasFailedVideo, markVideoAsFailed)
        const limited = sortByRecent(enriched).slice(0, 4)
        setHistory(limited)
        
        // Silently filter out deleted videos without showing toast
        // Compare original count with enriched count to detect deletions
        const enrichedIds = new Set(enriched.map(v => v._id || v.id).filter(Boolean))
        const removedIds = arr
          .map(item => getVideoId(item))
          .filter(id => id && !enrichedIds.has(id))
        
        // Mark removed videos as failed to prevent future fetch attempts
        // No toast notification - videos are silently removed from the list
        removedIds.forEach(id => {
          markVideoAsFailed(id)
        })
      } catch { setHistory([]) }
      try {
        const res = await playlistApi.userPlaylists(user._id)
        const raw = res?.data?.data ?? res?.data ?? []
        const arr = Array.isArray(raw) ? raw : (Array.isArray(raw?.playlists) ? raw.playlists : [])
        setPlaylists(arr)
      } catch { setPlaylists([]) }
    } catch (e) {
      setError('Failed to load library')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let off1 = () => {}, off2 = () => {}, off3 = () => {}
    load()
    off1 = on('likes:updated', () => load())
    off2 = on('history:updated', () => load())
    off3 = on('playlists:updated', () => load())
    // Do NOT listen for video:views:updated events
    // Watch.jsx no longer emits this event to prevent double counting
    // Library will show correct counts when it loads from API (backend has already incremented)
    return () => { off1(); off2(); off3() }
  }, [isAuthenticated, user?._id])

  if (!isAuthenticated) {
    return <div className="text-sm opacity-70">Sign in to view your library.</div>
  }

  return (
    <div className="space-y-8 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title mb-0">Your Library</h1>
          <p className="text-neutral-400 mt-2">Manage your saved content and playlists</p>
        </div>
        <button 
          className="btn-primary w-full sm:w-auto" 
          onClick={load}
          disabled={loading}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </>
          )}
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <svg className="animate-spin h-8 w-8 text-primary-500 mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm text-neutral-400">Loading your library…</p>
          </div>
        </div>
      )}

      {error && (
        <div className="card p-4 bg-red-900/20 border-red-800/50">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Liked Videos Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="section-title mb-0 flex items-center gap-3">
            <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            Liked Videos
          </h2>
          <span className="text-sm text-neutral-400">{liked.length} video{liked.length !== 1 ? 's' : ''}</span>
        </div>
        {!loading && liked.length === 0 && (
          <div className="card p-12 text-center">
            <svg className="w-16 h-16 text-neutral-600 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <p className="text-neutral-400">No liked videos yet</p>
          </div>
        )}
        {liked.length > 0 && (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {liked.filter(v => v && (v._id || v.id)).map((v) => <VideoCard key={v._id || v.id} video={v} />)}
          </div>
        )}
      </section>

      {/* Recent History Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="section-title mb-0 flex items-center gap-3">
            <svg className="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Recent History
          </h2>
          <span className="text-sm text-neutral-400">{history.length} video{history.length !== 1 ? 's' : ''}</span>
        </div>
        {!loading && history.length === 0 && (
          <div className="card p-12 text-center">
            <svg className="w-16 h-16 text-neutral-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-neutral-400">No watch history yet</p>
          </div>
        )}
        {history.length > 0 && (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {history.filter(v => v && (v._id || v.id)).map((v) => <VideoCard key={v._id || v.id} video={v} />)}
          </div>
        )}
      </section>

      {/* Playlists Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="section-title mb-0 flex items-center gap-3">
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Playlists
          </h2>
          <span className="text-sm text-neutral-400">{playlists.length} playlist{playlists.length !== 1 ? 's' : ''}</span>
        </div>
        {!loading && playlists.length === 0 && (
          <div className="card p-12 text-center">
            <svg className="w-16 h-16 text-neutral-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-neutral-400">No playlists yet</p>
            <p className="text-sm text-neutral-500 mt-2">Create a playlist to organize your favorite videos</p>
          </div>
        )}
        {playlists.length > 0 && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {playlists.map((p) => (
              <div key={p._id || p.id} className="card p-5 hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg mb-1 truncate">{p.name || p.title || 'Playlist'}</h3>
                    <p className="text-sm text-neutral-400">
                      {Array.isArray(p.videos) ? p.videos.length : (p.count || 0)} video{(Array.isArray(p.videos) ? p.videos.length : (p.count || 0)) !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <svg className="w-8 h-8 text-primary-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <Link to={`/playlist/${p._id || p.id}`} className="btn-primary w-full">
                  Open Playlist
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
