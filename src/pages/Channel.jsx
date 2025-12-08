import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { userApi, subsApi, dashboardApi } from '../services/api.js'
import SubscribeButton from '../components/SubscribeButton.jsx'
import VideoCard from '../components/VideoCard.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { on } from '../utils/events.js'

export default function Channel() {
  const { username } = useParams()
  const { user: me } = useAuth()
  const [profile, setProfile] = useState(null)
  const [videos, setVideos] = useState([])
  const [subs, setSubs] = useState(0)
  const [loading, setLoading] = useState(true)

  const isMe = useMemo(() => {
    return profile && (profile.userName === me?.userName || profile._id === me?._id)
  }, [profile, me])

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await userApi.channelProfile(username)
        const p = data?.data || data
        setProfile(p)
        try {
          if (p?._id) {
            const s = await subsApi.channelSubscribers(p._id)
            const count = s?.data?.data?.length || 0
            setSubs(count)
          }
        } catch {}
        try {
          if (isMe) {
            const dv = await dashboardApi.videos()
            const items = dv?.data?.data || []
            setVideos(Array.isArray(items) ? items : items?.docs || [])
          } else {
            setVideos([])
          }
        } catch {}
      } finally {
        setLoading(false)
      }
    })()
  }, [username, isMe])

  // Listen for subscription updates to refresh subscriber count
  useEffect(() => {
    if (!profile?._id) return
    const off = on('subscription:updated', ({ channelId }) => {
      if (channelId === profile._id) {
        // Refresh subscriber count
        subsApi.channelSubscribers(profile._id)
          .then(s => {
            const count = s?.data?.data?.length || 0
            setSubs(count)
          })
          .catch(() => {})
      }
    })
    return off
  }, [profile?._id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <svg className="animate-spin h-8 w-8 text-primary-500 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm text-neutral-400">Loading channel…</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="card p-12 text-center">
        <svg className="w-16 h-16 text-neutral-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-neutral-400">Channel not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 py-4">
      {/* Channel Header */}
      <div className="card overflow-hidden">
        <div className="aspect-video md:aspect-[21/9] bg-gradient-to-br from-muted to-neutral-900 relative">
          {profile?.coverImage ? (
            <img src={profile.coverImage} alt="cover" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full grid place-items-center">
              <svg className="w-20 h-20 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>
        <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img 
              src={profile?.avatar || ''} 
              alt={profile?.userName || 'Avatar'} 
              className="size-20 rounded-full object-cover border-4 border-surface"
            />
            <div>
              <div className="text-2xl font-bold mb-1">{profile?.userName || profile?.fullName}</div>
              <div className="text-sm text-neutral-400">
                {Intl.NumberFormat('en-US', { 
                  notation: subs >= 1000000 ? 'compact' : 'standard',
                  maximumFractionDigits: 1 
                }).format(subs)} subscriber{subs !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          {!isMe && (
            <SubscribeButton 
              channelId={profile?._id} 
              initialSubscribed={profile?.isSubscribed ?? false}
              initialCount={subs} 
            />
          )}
        </div>
      </div>

      {/* Videos Section */}
      {isMe && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title mb-0">Your Videos</h2>
            <span className="text-sm text-neutral-400">{videos.length} video{videos.length !== 1 ? 's' : ''}</span>
          </div>
          {videos.length === 0 ? (
            <div className="card p-12 text-center">
              <svg className="w-16 h-16 text-neutral-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-neutral-400">No videos yet</p>
            </div>
          ) : (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {videos.filter(v => v && (v._id || v.id)).map((v) => (
                <VideoCard key={v._id || v.id} video={v} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
