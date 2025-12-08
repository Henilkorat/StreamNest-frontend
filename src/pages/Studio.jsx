import { useEffect, useMemo, useState, useRef } from 'react'
import { dashboardApi, subsApi, videoApi } from '../services/api.js'
import VideoCard from '../components/VideoCard.jsx'
import { emit } from '../utils/events.js'
import { useAuth } from '../state/AuthContext.jsx'
import { useVideoState } from '../state/VideoStateContext.jsx'
import { on } from '../utils/events.js'

function num(...vals) {
  for (const v of vals) {
    if (typeof v === 'number' && !Number.isNaN(v)) return v
    const parsed = typeof v === 'string' ? parseInt(v, 10) : NaN
    if (!Number.isNaN(parsed)) return parsed
  }
  return 0
}

export default function Studio() {
  const { user } = useAuth()
  const { getCachedVideo } = useVideoState()
  const [stats, setStats] = useState(null)
  const [videos, setVideos] = useState([])
  const [subs, setSubs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const totals = useMemo(() => {
    // Use synchronized per-video counts as the canonical source for total views
    // This matches Home/Library behavior and avoids Studio-specific drift
    const seen = new Set()
    const views = videos.reduce((sum, v) => {
      const id = v?._id || v?.id
      if (!id || seen.has(id)) return sum
      seen.add(id)
      const val = typeof v?.views === 'number' ? v.views : num(v?.views, 0)
      return sum + val
    }, 0)
    
    const likes = typeof stats?.totalLikes === 'number' 
      ? stats.totalLikes 
      : 0
    const subscribers = typeof stats?.totalSubscribers === 'number' 
      ? stats.totalSubscribers 
      : (typeof subs === 'number' ? subs : 0)
    const videoCount = typeof stats?.totalVideos === 'number' 
      ? stats.totalVideos 
      : videos.length
    
    return { views, likes, subscribers, videos: videoCount }
  }, [stats, videos, subs])

  const loadingRef = useRef(false)
  const mountedRef = useRef(true)
  const loadedUserIdRef = useRef(null)
  const hasLoadedRef = useRef(false)
  const statsFetchedRef = useRef(false)
  const videosFetchedRef = useRef(false)
  const loadInProgressRef = useRef(false) // Global lock to prevent any concurrent loads
  
  // Session-level flag to prevent reloading when navigating back
  // This persists across component remounts but resets on page refresh
  const getSessionLoadedKey = () => `studio_loaded_${user?._id || 'anonymous'}`
  const getSessionLoadedTimeKey = () => `studio_loaded_time_${user?._id || 'anonymous'}`
  const hasLoadedInSession = () => {
    if (!user?._id) return false
    const loaded = sessionStorage.getItem(getSessionLoadedKey()) === 'true'
    const loadedTime = parseInt(sessionStorage.getItem(getSessionLoadedTimeKey()) || '0', 10)
    const now = Date.now()
    // Consider loaded if loaded flag is true AND it was loaded within last 5 minutes
    // This prevents reloads when navigating back and forth across the app
    return loaded && (now - loadedTime) < 300000
  }
  const markLoadedInSession = () => {
    if (user?._id) {
      sessionStorage.setItem(getSessionLoadedKey(), 'true')
      sessionStorage.setItem(getSessionLoadedTimeKey(), Date.now().toString())
    }
  }
  const clearSessionLoaded = () => {
    if (user?._id) {
      sessionStorage.removeItem(getSessionLoadedKey())
      sessionStorage.removeItem(getSessionLoadedTimeKey())
    }
  }

  // Helper: merge video list with cached entries (aligns with Home/Library semantics)
  const mergeWithCache = (list = []) => {
    const merged = []
    const seen = new Set()
    let changed = false

    for (const item of list) {
      const id = item?._id || item?.id
      if (!id || seen.has(id)) continue
      seen.add(id)

      const cached = getCachedVideo(id)
      if (cached?.data) {
        const mergedViews = typeof cached.data.views === 'number' ? cached.data.views : item?.views || 0
        const mergedItem = {
          ...item,
          ...cached.data,
          views: mergedViews,
        }
        if (mergedViews !== item?.views) {
          changed = true
        }
        if (import.meta.env?.DEV) {
          console.debug('studio:view-merge', { id, from: 'cache', views: mergedViews })
        }
        merged.push(mergedItem)
      } else {
        merged.push(item)
      }
    }

    return { merged, changed }
  }
  
  async function load(forceRefresh = false) {
    const currentUserId = user?._id
    
    // CRITICAL: Check session-level flag first - prevents reload when navigating back
    // This is the most important guard for preventing double loads on navigation
    // if (!forceRefresh && hasLoadedInSession() && currentUserId && loadedUserIdRef.current === currentUserId) {
    //   return // Already loaded in this session, skip completely
    // }
    // Only skip when we have both stats and videos loaded already
    if (!forceRefresh && hasLoadedInSession() && stats && videos.length > 0) {
      // Ensure UI leaves loading state when skipping fetch
      setLoading(false)
      return // Already loaded in this session, skip completely
    }
    
    // CRITICAL: Use global lock to prevent ANY concurrent loads
    // This is the most important guard - prevents double execution in React StrictMode
    if (loadInProgressRef.current && !forceRefresh) {
      return // Load already in progress, skip completely
    }
    loadInProgressRef.current = true // Set IMMEDIATELY - this is the global lock
    
    // Additional guard: check loadingRef
    if (loadingRef.current && !forceRefresh) {
      loadInProgressRef.current = false
      return // Already loading, skip completely
    }
    loadingRef.current = true // Set BEFORE any async operations
    
    // Only load if user ID has changed OR if it's the first load OR if force refresh
    // This prevents double loading in React StrictMode
    if (!forceRefresh && hasLoadedRef.current && currentUserId && loadedUserIdRef.current === currentUserId) {
      loadingRef.current = false
      loadInProgressRef.current = false
      return // Already loaded for this user, skip unless explicitly requested
    }
    
    hasLoadedRef.current = true
    markLoadedInSession() // Mark as loaded in session storage
    if (currentUserId) {
      loadedUserIdRef.current = currentUserId
    }
    
    // Reset fetch flags for force refresh
    if (forceRefresh) {
      statsFetchedRef.current = false
      videosFetchedRef.current = false
      clearSessionLoaded() // Clear session flag on force refresh
    }
    
    setLoading(true)
    setError('')
    try {
      // Load stats first - this is the source of truth for total views
      // Stats API uses database aggregation which is accurate
      // CRITICAL: Only fetch stats ONCE per load to prevent double counting
      if (!statsFetchedRef.current) {
        statsFetchedRef.current = true // Set immediately to prevent concurrent calls
        
        try {
          const s = await dashboardApi.stats()
          const statsData = s?.data?.data || s?.data || {}
          
          // Only update stats if component is still mounted and user hasn't changed
          // CRITICAL: Only update once - statsFetchedRef ensures this block runs only once
          if (mountedRef.current && loadedUserIdRef.current === currentUserId) {
            setStats(statsData)
            
            // If backend provides subscriber count, use it; otherwise fetch separately
            if (typeof statsData?.totalSubscribers !== 'number' && user?._id) {
              try {
                const r = await subsApi.channelSubscribers(user._id)
                const subsData = r?.data?.data || r?.data || []
                const count = Array.isArray(subsData) ? subsData.length : 0
                if (mountedRef.current && loadedUserIdRef.current === currentUserId) {
                  setSubs(count)
                }
              } catch {}
            } else if (typeof statsData?.totalSubscribers === 'number') {
              setSubs(statsData.totalSubscribers)
            }
          }
        } catch (err) {
          console.error('Failed to fetch stats:', err)
          statsFetchedRef.current = false // Reset on error so it can retry
        }
      }
      
      // Load videos for display (individual video cards)
      // Note: Total views come from stats API, not from summing these videos
      // Merge with cached video data to get updated views (same approach as Home/Library)
      // CRITICAL: Only fetch videos ONCE per load to prevent double counting
      if (!videosFetchedRef.current) {
        videosFetchedRef.current = true // Set immediately to prevent concurrent calls
        
        try {
          const v = await dashboardApi.videos()
          // Backend ApiResponse: { statusCode, success, message, data: videos }
          const items = v?.data?.data || []
          const rawList = Array.isArray(items) ? items : (Array.isArray(items?.docs) ? items.docs : [])

          // Merge with cached view counts to align with Home/Library canonical cache
          const { merged } = mergeWithCache(rawList)
          
          // CRITICAL: Only update once - videosFetchedRef ensures this block runs only once
          if (mountedRef.current && loadedUserIdRef.current === currentUserId) {
            setVideos(merged)
          }
        } catch (err) {
          console.error('Failed to fetch videos:', err)
          videosFetchedRef.current = false // Reset on error so it can retry
        }
      }
    } catch (e) {
      if (mountedRef.current && loadedUserIdRef.current === currentUserId) {
        setError('Failed to load studio')
      }
    } finally {
      loadingRef.current = false
      loadInProgressRef.current = false // Release global lock
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    mountedRef.current = true
    
    // CRITICAL: Check session-level flag FIRST before resetting refs
    // If already loaded in session, don't reset refs and don't reload
    const alreadyLoadedInSession = hasLoadedInSession() ;
    if (!alreadyLoadedInSession) {
      // Only reset refs if not already loaded in session
      hasLoadedRef.current = false // Reset on mount/unmount
      statsFetchedRef.current = false // Reset stats fetch flag
      videosFetchedRef.current = false // Reset videos fetch flag
      loadingRef.current = false // Reset loading flag
      loadInProgressRef.current = false // Reset global lock
    } else if (!stats || videos.length === 0) {
      // session says loaded but we don't have data; force refresh
      statsFetchedRef.current = false
      videosFetchedRef.current = false
      load(true)
    } else {
      // If we are reusing cached session data, leave loading state immediately
      setLoading(false)
    }
    
    // Load when user ID is available; if session says loaded but data missing, load(true) above
    if (user?._id && !hasLoadedRef.current && !alreadyLoadedInSession) {
      hasLoadedRef.current = true // Set BEFORE calling load() - atomic operation
      load()
    }
    
    // Cleanup: prevent loads and state updates after unmount
    // NOTE: Do NOT reset session storage - it persists across navigation
    return () => {
      mountedRef.current = false
      loadingRef.current = false
      // Do NOT reset hasLoadedRef, statsFetchedRef, videosFetchedRef, loadInProgressRef
      // They will be reset on next mount if session flag is cleared
    }
  }, [user?._id])

  // Reconcile with cache on mount or when videos change (no refetch needed)
  useEffect(() => {
    if (!videos.length) return
    const { merged, changed } = mergeWithCache(videos)
    if (changed) {
      setVideos(merged)
    }
  }, [videos])

  // Invalidate/refresh Studio data when related events occur elsewhere
  useEffect(() => {
    const off1 = on('likes:updated', () => load(true))
    const off2 = on('subscription:updated', () => load(true))
    const off3 = on('videos:updated', () => load(true))
    const off4 = on('history:updated', () => load(true))
    return () => {
      off1()
      off2()
      off3()
      off4()
    }
  }, [])

  // Do NOT listen for video:views:updated events
  // Watch.jsx no longer emits this event to prevent double counting
  // Studio will show correct counts when it loads from API (backend has already incremented)

  async function deleteVideo(id) {
    if (!confirm('Delete this video?')) return
    
    // Optimistic update: remove video from UI immediately
    const videoToDelete = videos.find(v => (v._id || v.id) === id)
    setVideos(prev => prev.filter(v => (v._id || v.id) !== id))
    
    // Emit events to update other parts of the app
    emit('videos:updated', { id })
    emit('likes:updated')
    emit('history:updated')
    emit('playlists:updated')
    
    try {
      await videoApi.remove(id)
      // Reload to get fresh data after deletion
      // Use forceRefresh to bypass session flag since we need fresh data
      await load(true)
      
      // Show success toast
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast('Video deleted successfully', 'success')
      }
    } catch (e) {
      // Restore video if deletion failed
      if (videoToDelete) {
        setVideos(prev => [...prev, videoToDelete])
      }
      
      // Check if it's a Cloudinary error
      const errorMessage = e?.response?.data?.message || e?.message || 'Failed to delete video'
      const isCloudinaryError = errorMessage.toLowerCase().includes('cloudinary') || 
                                 errorMessage.toLowerCase().includes('resource type')
      
      // Show appropriate error message
      if (typeof window !== 'undefined' && window.showToast) {
        if (isCloudinaryError) {
          window.showToast('Cloud file removal failed. Please retry later.', 'error')
        } else {
          window.showToast(errorMessage, 'error')
        }
      } else {
        alert(errorMessage)
      }
    }
  }

  return (
    <div className="space-y-8 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title mb-0">Creator Studio</h1>
          <p className="text-neutral-400 mt-2">Manage your content and track your performance</p>
        </div>
        <button 
          className="btn-primary w-full sm:w-auto" 
          onClick={() => load(true)}
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

      {/* Error Message */}
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

      {/* Stats Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-neutral-400">Total Videos</div>
            <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-white">{Intl.NumberFormat().format(totals.videos)}</div>
        </div>
        <div className="card p-6 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-neutral-400">Total Views</div>
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-white">
            {Intl.NumberFormat('en-US', { 
              notation: totals.views >= 1000000 ? 'compact' : 'standard',
              maximumFractionDigits: 1 
            }).format(totals.views)}
          </div>
        </div>
        <div className="card p-6 bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-neutral-400">Total Likes</div>
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-white">
            {Intl.NumberFormat('en-US', { 
              notation: totals.likes >= 1000000 ? 'compact' : 'standard',
              maximumFractionDigits: 1 
            }).format(totals.likes)}
          </div>
        </div>
        <div className="card p-6 bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-neutral-400">Subscribers</div>
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-white">
            {Intl.NumberFormat('en-US', { 
              notation: totals.subscribers >= 1000000 ? 'compact' : 'standard',
              maximumFractionDigits: 1 
            }).format(totals.subscribers)}
          </div>
        </div>
      </section>

      {/* Videos Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="section-title mb-0">Your videos</h2>
          <span className="text-sm text-neutral-400">{videos.length} video{videos.length !== 1 ? 's' : ''}</span>
        </div>
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <svg className="animate-spin h-8 w-8 text-primary-500 mx-auto" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm text-neutral-400">Loading videos…</p>
            </div>
          </div>
        )}
        {!loading && videos.length === 0 && (
          <div className="card p-12 text-center">
            <svg className="w-16 h-16 text-neutral-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-neutral-400 mb-2">No videos yet</p>
            <p className="text-sm text-neutral-500">Start uploading your first video!</p>
          </div>
        )}
        {!loading && videos.length > 0 && (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {videos.filter(v => v && (v._id || v.id)).map((v) => (
              <div key={v._id || v.id} className="space-y-3">
                <VideoCard video={v} />
                <button 
                  className="w-full btn-secondary text-red-400 hover:bg-red-900/20 hover:border-red-800" 
                  onClick={() => deleteVideo(v._id || v.id)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Video
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
