import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { playlistApi } from '../services/api.js'
import VideoCard from '../components/VideoCard.jsx'
import { useVideoState } from '../state/VideoStateContext.jsx'
import { on } from '../utils/events.js'

export default function Playlist() {
  const { id } = useParams()
  const { getCachedVideo } = useVideoState()
  const [pl, setPl] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await playlistApi.get(id)
        const playlistData = data?.data || data
        
        // Enrich videos with cached views and ensure owner data is present
        if (playlistData?.videos && Array.isArray(playlistData.videos)) {
          const enrichedVideos = playlistData.videos.map(video => {
            const videoId = video._id || video.id
            // Use cached views if available (same as Home/Watch/Studio)
            if (videoId) {
              const cached = getCachedVideo(videoId)
              if (cached?.data?.views !== undefined) {
                return { ...video, views: cached.data.views }
              }
            }
            return video
          })
          setPl({ ...playlistData, videos: enrichedVideos })
        } else {
          setPl(playlistData)
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [id, getCachedVideo])

  // Listen for views updates from Watch page (same as Home/Studio)
  useEffect(() => {
    const off = on('video:views:updated', ({ videoId, views }) => {
      if (pl?.videos) {
        setPl(prev => {
          if (!prev?.videos) return prev
          return {
            ...prev,
            videos: prev.videos.map(v => {
              const id = v._id || v.id
              if (id === videoId) {
                return { ...v, views }
              }
              return v
            })
          }
        })
      }
    })
    return off
  }, [pl])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <svg className="animate-spin h-8 w-8 text-primary-500 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm text-neutral-400">Loading playlist…</p>
        </div>
      </div>
    )
  }

  if (!pl) {
    return (
      <div className="card p-12 text-center">
        <svg className="w-16 h-16 text-neutral-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-neutral-400">Playlist not found</p>
      </div>
    )
  }

  const videos = (pl?.videos || []).filter(v => v && (v._id || v.id))

  return (
    <div className="space-y-6 py-4">
      {/* Playlist Header */}
      <div className="card p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="size-20 rounded-lg bg-primary/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold mb-2 truncate">{pl?.name || pl?.title || 'Playlist'}</h1>
            <p className="text-neutral-400">
              {videos.length} video{videos.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Videos Grid */}
      {videos.length === 0 ? (
        <div className="card p-12 text-center">
          <svg className="w-16 h-16 text-neutral-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-neutral-400 mb-2">This playlist is empty</p>
          <p className="text-sm text-neutral-500">Add videos to get started</p>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title mb-0">Videos</h2>
            <span className="text-sm text-neutral-400">{videos.length} video{videos.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {videos.filter(v => v && (v._id || v.id)).map((v) => (
              <VideoCard key={v._id || v.id} video={v} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
