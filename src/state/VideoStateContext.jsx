import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { subsApi, likesApi, videoApi } from '../services/api.js'
import { on, emit } from '../utils/events.js'
import { useAuth } from './AuthContext.jsx'

const VideoStateContext = createContext(null)

// Session storage keys
const SUBSCRIPTION_CACHE_KEY = 'subscription_cache'
const LIKE_CACHE_KEY = 'like_cache'
const VIDEO_CACHE_KEY = 'video_cache'
const VIEWED_VIDEOS_KEY = 'viewed_videos'
const REMOVED_VIDEOS_KEY = 'removed_videos_toast'
const FAILED_VIDEOS_KEY = 'failed_videos' // Track videos that failed to fetch (deleted/missing)

// Helper functions for session storage
function getSessionCache(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key) || '{}')
  } catch {
    return {}
  }
}

function setSessionCache(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify(data))
  } catch {}
}

function getSessionArray(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}

function setSessionArray(key, arr) {
  try {
    sessionStorage.setItem(key, JSON.stringify(arr))
  } catch {}
}

export function VideoStateProvider({ children }) {
  const { user, isAuthenticated } = useAuth()
  
  // Subscription state: { [channelId]: { isSubscribed: boolean, count: number } }
  const [subscriptions, setSubscriptions] = useState(() => getSessionCache(SUBSCRIPTION_CACHE_KEY))
  
  // Like state: { [videoId]: { isLiked: boolean, count: number } }
  const [likes, setLikes] = useState(() => getSessionCache(LIKE_CACHE_KEY))
  
  // Video cache: { [videoId]: { data: video, timestamp: number } }
  const [videoCache, setVideoCache] = useState(() => getSessionCache(VIDEO_CACHE_KEY))
  
  // Track viewed videos in this session
  const [viewedVideos, setViewedVideos] = useState(() => getSessionArray(VIEWED_VIDEOS_KEY))
  
  // Track which videos have already shown removal toast
  const [removedVideosToast, setRemovedVideosToast] = useState(() => getSessionArray(REMOVED_VIDEOS_KEY))
  
  // Track failed video IDs (deleted/missing) to skip future fetch attempts
  const [failedVideos, setFailedVideos] = useState(() => getSessionArray(FAILED_VIDEOS_KEY))
  
  // In-flight requests to prevent duplicates
  const inFlightSubscriptions = useRef(new Set())
  const inFlightLikes = useRef(new Set())
  const inFlightVideos = useRef(new Set())

  // Persist subscriptions to session storage
  useEffect(() => {
    setSessionCache(SUBSCRIPTION_CACHE_KEY, subscriptions)
  }, [subscriptions])

  // Persist likes to session storage
  useEffect(() => {
    setSessionCache(LIKE_CACHE_KEY, likes)
  }, [likes])

  // Persist video cache to session storage
  useEffect(() => {
    setSessionCache(VIDEO_CACHE_KEY, videoCache)
  }, [videoCache])

  // Persist viewed videos to session storage
  useEffect(() => {
    setSessionArray(VIEWED_VIDEOS_KEY, viewedVideos)
  }, [viewedVideos])

  // Persist removed videos toast to session storage
  useEffect(() => {
    setSessionArray(REMOVED_VIDEOS_KEY, removedVideosToast)
  }, [removedVideosToast])

  // Persist failed videos to session storage
  useEffect(() => {
    setSessionArray(FAILED_VIDEOS_KEY, failedVideos)
  }, [failedVideos])

  // Check subscription status from server
  const checkSubscription = useCallback(async (channelId) => {
    if (!channelId || !isAuthenticated || !user?._id || inFlightSubscriptions.current.has(channelId)) {
      // Use functional state access to get current value
      return subscriptions[channelId]?.isSubscribed ?? false
    }

    inFlightSubscriptions.current.add(channelId)
    try {
      // Get the list of channels the user has subscribed to
      // The endpoint GET /subscriptions/c/:channelId returns channels that :channelId (as subscriber) has subscribed to
      const res = await subsApi.subscribed(user._id)
      const data = res?.data?.data || res?.data || {}
      const subscribedChannels = Array.isArray(data) 
        ? data 
        : (Array.isArray(data?.subscribedChannels) ? data.subscribedChannels : [])
      
      // Extract channel IDs from the subscribed channels list
      const channelIds = subscribedChannels
        .map(sub => {
          // sub can be a Subscription object with a populated channel field
          const channel = sub?.channel
          return channel?._id || channel || sub?._id
        })
        .filter(Boolean)
        .map(id => id.toString())
      
      const isSubscribed = channelIds.includes(channelId.toString())
      
      setSubscriptions(prev => {
        // Only update if state actually changed to prevent unnecessary re-renders
        const current = prev[channelId]
        if (current?.isSubscribed === isSubscribed) {
          return prev
        }
        return {
          ...prev,
          [channelId]: {
            isSubscribed,
            count: current?.count ?? 0
          }
        }
      })
      
      return isSubscribed
    } catch (error) {
      console.error('Failed to check subscription:', error)
      // On error, return the current state value (will be stale but better than undefined)
      setSubscriptions(prev => prev) // Trigger a read to get current value
      return false // Default to false on error
    } finally {
      inFlightSubscriptions.current.delete(channelId)
    }
  }, [user?._id, isAuthenticated]) // Remove subscriptions from deps to prevent loop

  // Toggle subscription with optimistic update
  const toggleSubscription = useCallback(async (channelId, currentCount = 0) => {
    if (!channelId || !isAuthenticated || inFlightSubscriptions.current.has(channelId)) {
      return
    }

    const currentState = subscriptions[channelId]?.isSubscribed ?? false
    const newState = !currentState
    
    // Optimistic update
    setSubscriptions(prev => ({
      ...prev,
      [channelId]: {
        isSubscribed: newState,
        count: newState ? (prev[channelId]?.count ?? currentCount) + 1 : Math.max(0, (prev[channelId]?.count ?? currentCount) - 1)
      }
    }))

    inFlightSubscriptions.current.add(channelId)
    try {
      await subsApi.toggle(channelId)
      
      // Emit event for other components
      emit('subscription:updated', { channelId, isSubscribed: newState })
      
      // Revalidate by checking server state
      await checkSubscription(channelId)
    } catch (error) {
      // Revert on error
      setSubscriptions(prev => ({
        ...prev,
        [channelId]: {
          isSubscribed: currentState,
          count: prev[channelId]?.count ?? currentCount
        }
      }))
      console.error('Failed to toggle subscription:', error)
    } finally {
      inFlightSubscriptions.current.delete(channelId)
    }
  }, [isAuthenticated, subscriptions, checkSubscription])

  // Get subscription status (with hydration if needed)
  const getSubscriptionStatus = useCallback((channelId, initialSubscribed = null, initialCount = 0) => {
    if (!channelId) return { isSubscribed: false, count: 0 }
    
    const cached = subscriptions[channelId]
    
    // If we have cached data, use it
    if (cached) {
      return cached
    }
    
    // If initial values provided and no cache, use them and hydrate
    if (initialSubscribed !== null) {
      setSubscriptions(prev => ({
        ...prev,
        [channelId]: {
          isSubscribed: initialSubscribed,
          count: initialCount
        }
      }))
      
      // Hydrate from server in background
      if (isAuthenticated) {
        checkSubscription(channelId)
      }
      
      return { isSubscribed: initialSubscribed, count: initialCount }
    }
    
    // Default
    return { isSubscribed: false, count: 0 }
  }, [subscriptions, isAuthenticated, checkSubscription])

  // Check like status from server
  const checkLike = useCallback(async (videoId) => {
    if (!videoId || !isAuthenticated || inFlightLikes.current.has(videoId)) {
      // Use functional state access to get current value
      return likes[videoId]?.isLiked ?? false
    }

    inFlightLikes.current.add(videoId)
    try {
      const res = await likesApi.likedVideos()
      const data = res?.data?.data || res?.data || {}
      const likedVideos = Array.isArray(data) 
        ? data 
        : (Array.isArray(data?.videos) ? data.videos : [])
      
      const likedIds = likedVideos
        .map(item => item?.video?._id || item?._id || item?.videoId)
        .filter(Boolean)
      
      const isLiked = likedIds.includes(videoId)
      
      setLikes(prev => {
        // Only update if state actually changed to prevent unnecessary re-renders
        const current = prev[videoId]
        if (current?.isLiked === isLiked) {
          return prev
        }
        return {
          ...prev,
          [videoId]: {
            isLiked,
            count: current?.count ?? 0
          }
        }
      })
      
      return isLiked
    } catch (error) {
      console.error('Failed to check like:', error)
      // On error, return the current state value (will be stale but better than undefined)
      setLikes(prev => prev) // Trigger a read to get current value
      return false // Default to false on error
    } finally {
      inFlightLikes.current.delete(videoId)
    }
  }, [isAuthenticated]) // Remove likes from deps to prevent loop

  // Toggle like with optimistic update
  const toggleLike = useCallback(async (videoId, currentCount = 0) => {
    if (!videoId || !isAuthenticated || inFlightLikes.current.has(videoId)) {
      return
    }

    const currentState = likes[videoId]?.isLiked ?? false
    const newState = !currentState
    
    // Optimistic update
    setLikes(prev => ({
      ...prev,
      [videoId]: {
        isLiked: newState,
        count: newState ? (prev[videoId]?.count ?? currentCount) + 1 : Math.max(0, (prev[videoId]?.count ?? currentCount) - 1)
      }
    }))

    inFlightLikes.current.add(videoId)
    try {
      await likesApi.toggleVideo(videoId)
      
      // Emit event for other components
      emit('likes:updated', { videoId })
      
      // Revalidate by checking server state and getting updated count
      await checkLike(videoId)
      
      // CRITICAL: Do NOT invalidate cache or call videoApi.get() here
      // videoApi.get() increments views, so we must never call it from like flow
      // The like state is already updated above, and components read from that
      // We do NOT touch the video cache here to prevent any re-fetch triggers
      // This ensures like actions NEVER trigger view increments
    } catch (error) {
      // Revert on error
      setLikes(prev => ({
        ...prev,
        [videoId]: {
          isLiked: currentState,
          count: prev[videoId]?.count ?? currentCount
        }
      }))
      console.error('Failed to toggle like:', error)
    } finally {
      inFlightLikes.current.delete(videoId)
    }
  }, [isAuthenticated, likes, checkLike])

  // Get like status (with hydration if needed)
  const getLikeStatus = useCallback((videoId, initialLiked = null, initialCount = 0) => {
    if (!videoId) return { isLiked: false, count: 0 }
    
    const cached = likes[videoId]
    
    // If we have cached data, use it
    if (cached) {
      return cached
    }
    
    // If initial values provided and no cache, use them and hydrate
    if (initialLiked !== null) {
      setLikes(prev => ({
        ...prev,
        [videoId]: {
          isLiked: initialLiked,
          count: initialCount
        }
      }))
      
      // Hydrate from server in background
      if (isAuthenticated) {
        checkLike(videoId)
      }
      
      return { isLiked: initialLiked, count: initialCount }
    }
    
    // Default
    return { isLiked: false, count: 0 }
  }, [likes, isAuthenticated, checkLike])

  // Get cached video
  const getCachedVideo = useCallback((videoId) => {
    return videoCache[videoId] || null
  }, [videoCache])

  // Set cached video
  const setCachedVideo = useCallback((videoId, videoData) => {
    setVideoCache(prev => ({
      ...prev,
      [videoId]: { data: videoData, timestamp: Date.now() }
    }))
  }, [])

  // Check if video has been viewed in this session
  const hasViewedVideo = useCallback((videoId) => {
    return viewedVideos.includes(videoId)
  }, [viewedVideos])

  // Mark video as viewed
  const markVideoAsViewed = useCallback((videoId) => {
    if (!viewedVideos.includes(videoId)) {
      setViewedVideos(prev => [...prev, videoId])
    }
  }, [viewedVideos])

  // Update video views count across all caches
  const updateVideoViews = useCallback((videoId, newViews) => {
    // Update video cache
    setVideoCache(prev => {
      if (prev[videoId]) {
        return {
          ...prev,
          [videoId]: {
            ...prev[videoId],
            data: {
              ...prev[videoId].data,
              views: newViews
            }
          }
        }
      }
      return prev
    })
    
    // Emit event to update other components
    emit('video:views:updated', { videoId, views: newViews })
  }, [])

  // Check if video removal toast has been shown
  const hasShownRemovalToast = useCallback((videoId) => {
    return removedVideosToast.includes(videoId)
  }, [removedVideosToast])

  // Mark video removal toast as shown
  const markRemovalToastShown = useCallback((videoId) => {
    if (!removedVideosToast.includes(videoId)) {
      setRemovedVideosToast(prev => [...prev, videoId])
    }
  }, [removedVideosToast])

  // Check if video has failed to fetch (deleted/missing)
  const hasFailedVideo = useCallback((videoId) => {
    return failedVideos.includes(videoId)
  }, [failedVideos])

  // Mark video as failed (deleted/missing) to skip future fetch attempts
  const markVideoAsFailed = useCallback((videoId) => {
    if (videoId && !failedVideos.includes(videoId)) {
      setFailedVideos(prev => [...prev, videoId])
    }
  }, [failedVideos])

  // Clear failed flag when a previously missing video is successfully fetched
  const clearFailedVideo = useCallback((videoId) => {
    if (!videoId) return
    setFailedVideos(prev => prev.filter(id => id !== videoId))
  }, [])

  // Invalidate video cache (e.g., after like/view update)
  const invalidateVideo = useCallback((videoId) => {
    setVideoCache(prev => {
      const updated = { ...prev }
      delete updated[videoId]
      return updated
    })
  }, [])

  // Listen to events for cache invalidation
  useEffect(() => {
    const off1 = on('likes:updated', ({ videoId }) => {
      // CRITICAL: Do NOT invalidate video cache on like updates
      // Invalidating would cause components to re-fetch via videoApi.get()
      // which increments views. We update the cache directly in toggleLike instead.
      // This ensures like actions NEVER trigger view increments
    })
    
    const off2 = on('video:views:updated', ({ videoId }) => {
      if (videoId) {
        // Views updated, cache will be updated by updateVideoViews
      }
    })
    
    const off3 = on('subscription:updated', ({ channelId }) => {
      // Invalidate any video caches that might show subscription status
      // This is handled by components re-fetching
    })
    
    return () => {
      off1()
      off2()
      off3()
    }
  }, [invalidateVideo])

  const value = {
    // Subscriptions
    getSubscriptionStatus,
    toggleSubscription,
    checkSubscription,
    
    // Likes
    getLikeStatus,
    toggleLike,
    checkLike,
    
    // Videos
    getCachedVideo,
    setCachedVideo,
    hasViewedVideo,
    markVideoAsViewed,
    updateVideoViews,
    invalidateVideo,
    
    // Removed videos toast
    hasShownRemovalToast,
    markRemovalToastShown,
    
    // Failed videos (deleted/missing)
    hasFailedVideo,
    markVideoAsFailed,
    clearFailedVideo
  }

  return (
    <VideoStateContext.Provider value={value}>
      {children}
    </VideoStateContext.Provider>
  )
}

export function useVideoState() {
  const context = useContext(VideoStateContext)
  if (!context) {
    throw new Error('useVideoState must be used within VideoStateProvider')
  }
  return context
}
