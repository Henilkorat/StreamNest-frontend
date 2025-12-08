

import { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { videoApi, dashboardApi } from '../services/api.js'
import VideoCard from '../components/VideoCard.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { useVideoState } from '../state/VideoStateContext.jsx'
import { detectUsernameQuery, normalizeUsername } from '../utils/search.js'
import { on } from '../utils/events.js'

// Defines how many videos to request per page
const VIDEOS_PER_PAGE = 10; 

function extractVideos(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.videos)) return raw.videos
  if (Array.isArray(raw?.docs)) return raw.docs
  if (Array.isArray(raw?.items)) return raw.items
  if (Array.isArray(raw?.data)) return raw.data
  return []
}

export default function Home() {
  const { isAuthenticated } = useAuth()
  const { getCachedVideo } = useVideoState()
  const [searchParams] = useSearchParams()
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showHero, setShowHero] = useState(true)

  // PAGINATION STATE
  const [currentPage, setCurrentPage] = useState(1) 
  const [totalPages, setTotalPages] = useState(1)
  // -----------------

  const searchQuery = searchParams.get('search') || ''

  const load = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading(true)
    setError('')
    try {
      const params = {}
      
      // ADD PAGINATION PARAMS
      params.page = currentPage
      params.limit = VIDEOS_PER_PAGE
      // ----------------------

      if (searchQuery) {
        const { isUsername, username } = detectUsernameQuery(searchQuery)
        if (isUsername && username) {
          params.userName = username
        } else {
          params.query = searchQuery
        }
      }
      
      const { data } = await videoApi.list(params)
      // Expected Backend ApiResponse structure: { data: { videos: [...], pagination: { totalPages: 5 } } }
      const responseData = data?.data || data
      
      // EXTRACT totalPages from response
      const paginationData = responseData?.pagination || {}
      const totalPagesFromApi = paginationData.pages || 1
      setTotalPages(totalPagesFromApi)
      
      const primary = extractVideos(responseData?.videos || responseData)
      
      // Merge with cached video data
      const enriched = primary.map(v => {
        const videoId = v._id || v.id
        if (videoId) {
          const cached = getCachedVideo(videoId)
          if (cached?.data?.views !== undefined) {
            return { ...v, views: cached.data.views }
          }
        }
        return v
      })
      
      if (enriched.length) {
        setVideos(enriched)
      } else {
        // fallback: try dashboard videos (only if not searching AND on page 1)
        if (!searchQuery && currentPage === 1) { 
          try {
            const dv = await dashboardApi.videos()
            const dvData = dv?.data?.data || dv?.data
            const secondary = extractVideos(dvData?.videos || dvData)
            setVideos(secondary)
            setTotalPages(1); // Fallback data is a single page
          } catch {
            setVideos([])
          }
        } else {
          setVideos([])
        }
      }
    } catch (e) {
      setError(e?.message || e?.response?.data?.message || 'Failed to load videos')
      setVideos([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, searchQuery, currentPage, getCachedVideo]) // currentPage added to dependencies

  // Reset page to 1 whenever the search query changes
  useEffect(() => {
    setCurrentPage(1); 
  }, [searchQuery])

  // Fetch videos whenever `load` (which depends on `currentPage`) changes
  useEffect(() => { load() }, [load])

  // --- UNAUTHENTICATED VIEW (UNCHANGED) ---
  if (!isAuthenticated) {
    return (
      <div className="space-y-8 py-4">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-8 sm:p-12 lg:p-16">
          <div className="relative z-10 max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-white to-neutral-300 bg-clip-text text-transparent">
              Welcome to StreamNest
            </h1>
            <p className="text-lg sm:text-xl text-neutral-300 mb-6 max-w-2xl">
              Your destination for video streaming, sharing, and discovery. Watch, upload, and engage with content creators from around the world.
            </p>
            <p className="text-base text-neutral-400 mb-8 max-w-xl">
              Join our community to explore trending videos, create your own content, and connect with fellow creators.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                to="/register" 
                className="btn-primary text-base px-6 py-3 w-full sm:w-auto"
              >
                Get Started
              </Link>
              <Link 
                to="/login" 
                className="btn-secondary text-base px-6 py-3 w-full sm:w-auto"
              >
                Sign In
              </Link>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </section>
      </div>
    )
  }

  // --- AUTHENTICATED VIEW ---
  return (
    <div className="space-y-8 py-4">
      {/* Hero Section (UNCHANGED) */}
      {showHero && (
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-8 sm:p-12 lg:p-16">

          {/* Close button */}
          <button
            onClick={() => setShowHero(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl font-bold z-20"
          >
            ×
          </button>

          <div className="relative z-10 max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-white to-neutral-300 bg-clip-text text-transparent">
              Discover Amazing Content
            </h1>
            <p className="text-lg sm:text-xl text-neutral-300 mb-6 max-w-2xl">
              Explore trending videos, discover new creators, and stay up-to-date with the latest content on StreamNest.
            </p>
            <p className="text-base text-neutral-400 mb-8 max-w-xl">
              From entertainment to education, find videos that inspire and engage you.
            </p>
          </div>

          {/* Background circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </section>
      )}

      {/* Header and Refresh Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="page-title mb-0">Trending Videos</h2>
          <p className="text-neutral-400 mt-2">Discover trending videos on StreamNest</p>
        </div>
        <button 
          className="btn-primary w-full sm:w-auto" 
          onClick={() => setCurrentPage(1)} // Reset to page 1 on manual refresh
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

      {/* Loading, Error, and No Videos State (UNCHANGED) */}
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

      {!loading && !videos.length && !error && (
        <div className="card p-12 text-center">
          <svg className="w-16 h-16 text-neutral-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {searchQuery && detectUsernameQuery(searchQuery).isUsername ? (
            <>
              <p className="text-neutral-400">No videos found for @{normalizeUsername(searchQuery)}</p>
              <p className="text-sm text-neutral-500 mt-2">This user may not have uploaded any videos yet.</p>
            </>
          ) : searchQuery ? (
            <>
              <p className="text-neutral-400">No videos found for "{searchQuery}"</p>
              <p className="text-sm text-neutral-500 mt-2">Try a different search term or search by username using @username</p>
            </>
          ) : (
            <>
              <p className="text-neutral-400">No videos found.</p>
              <p className="text-sm text-neutral-500 mt-2">Be the first to upload a video!</p>
            </>
          )}
        </div>
      )}

      {/* Video Grid (UNCHANGED) */}
      {!loading && videos.length > 0 && (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.filter(v => v && (v._id || v.id)).map((v) => (
            <VideoCard key={v._id || v.id} video={v} />
          ))}
        </div>
      )}
      
      {/* --- RENDERED PAGINATION CONTROLS --- */}
      {!loading && videos.length > 0 && totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 pt-8">
              {/* Previous Button */}
              <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || loading}
                  className="btn-secondary px-6 py-2 disabled:opacity-50 flex items-center gap-2"
              >
                  <svg className="w-4 h-4 transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  Previous Videos
              </button>
              
              {/* Page Status */}
              <span className="text-neutral-400">
                  Page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages}</strong>
              </span>
              
              {/* Next Button */}
              <button 
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={currentPage >= totalPages || loading}
                  className="btn-secondary px-6 py-2 disabled:opacity-50 flex items-center gap-2"
              >
                  Next Videos
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
          </div>
      )}
      {/* -------------------------------------- */}
    </div>
  )
}