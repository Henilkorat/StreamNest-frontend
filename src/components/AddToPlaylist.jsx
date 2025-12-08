import { useEffect, useState } from 'react'
import { playlistApi } from '../services/api.js'
import { useAuth } from '../state/AuthContext.jsx'
import { emit } from '../utils/events.js'

export default function AddToPlaylist({ videoId }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [playlists, setPlaylists] = useState([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!open || !user?._id) return
    ;(async () => {
      try {
        const res = await playlistApi.userPlaylists(user._id)
        const raw = res?.data?.data ?? res?.data ?? []
        const arr = Array.isArray(raw) ? raw : (Array.isArray(raw?.playlists) ? raw.playlists : [])
        setPlaylists(arr)
      } catch {
        setPlaylists([])
      }
    })()
  }, [open, user?._id])

  async function addTo(playlistId) {
    setLoading(true)
    setMsg('')
    try {
      await playlistApi.addVideo(videoId, playlistId)
      setMsg('Added to playlist')
      emit('playlists:updated', { playlistId, videoId })
      setOpen(false)
    } catch {
      setMsg('Failed to add to playlist')
    } finally {
      setLoading(false)
    }
  }

  async function createAndAdd() {
    if (!name.trim()) return
    setLoading(true)
    setMsg('')
    try {
      const res = await playlistApi.create({ name })
      const pl = res?.data?.data || res?.data
      await playlistApi.addVideo(videoId, pl?._id || pl?.id)
      setMsg('Created and added')
      emit('playlists:updated', { created: true, videoId, playlistId: pl?._id || pl?.id })
      setOpen(false)
      setName('')
    } catch {
      setMsg('Failed to create/add')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <button 
        className="btn-secondary inline-flex items-center gap-2" 
        onClick={() => setOpen((o) => !o)}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Save
      </button>
      {open && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setOpen(false)}
          />
          <div className="absolute z-20 mt-2 w-80 card p-4 space-y-4 right-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Add to playlist</h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-60 overflow-auto space-y-1">
              {playlists.map((p) => (
                <button 
                  key={p._id || p.id} 
                  className="w-full text-left text-sm rounded-lg px-3 py-2 hover:bg-muted transition-colors" 
                  onClick={() => addTo(p._id || p.id)} 
                  disabled={loading}
                >
                  {p.name || p.title || 'Playlist'}
                </button>
              ))}
              {!playlists.length && (
                <div className="text-sm text-neutral-400 text-center py-4">No playlists yet</div>
              )}
            </div>
            <div className="pt-3 border-t border-neutral-800 space-y-3">
              <input 
                className="input text-sm" 
                placeholder="New playlist name" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    createAndAdd()
                  }
                }}
              />
              <button 
                className="btn-primary w-full text-sm" 
                onClick={createAndAdd} 
                disabled={loading || !name.trim()}
              >
                Create & add
              </button>
            </div>
            {msg && (
              <div className={`text-xs p-2 rounded-lg ${msg.includes('Failed') ? 'bg-red-900/20 text-red-400' : 'bg-green-900/20 text-green-400'}`}>
                {msg}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
