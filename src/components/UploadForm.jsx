import { useState } from 'react'
import { videoApi } from '../services/api.js'

export default function UploadForm({ onUploaded }) {
  const [videoFile, setVideoFile] = useState(null)
  const [thumbnail, setThumbnail] = useState(null)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!videoFile) { setError('Video file required'); return }
    setLoading(true)
    try {
      await videoApi.upload(videoFile, thumbnail, { title, description: desc })
      setVideoFile(null)
      setThumbnail(null)
      setTitle('')
      setDesc('')
      onUploaded && onUploaded()
    } catch (err) {
      setError(err?.response?.data?.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 space-y-5">
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          Video Title <span className="text-red-400">*</span>
        </label>
        <input 
          className="input" 
          placeholder="Enter video title" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">Description</label>
        <textarea 
          className="textarea" 
          rows={4} 
          placeholder="Enter video description" 
          value={desc} 
          onChange={(e) => setDesc(e.target.value)} 
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          Video File <span className="text-red-400">*</span>
        </label>
        <input 
          type="file" 
          accept="video/*" 
          onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
          className="input file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-700"
          required
        />
        <p className="text-xs text-neutral-500 mt-1">Select the video file you want to upload</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">Thumbnail</label>
        <input 
          type="file" 
          accept="image/*" 
          onChange={(e) => setThumbnail(e.target.files?.[0] || null)}
          className="input file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-700"
        />
        <p className="text-xs text-neutral-500 mt-1">Upload a custom thumbnail for your video</p>
      </div>
      {error && (
        <div className="p-3 rounded-lg bg-red-900/20 border border-red-800/50">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </div>
      )}
      <button 
        className="btn-primary w-full" 
        disabled={loading || !videoFile || !title}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Uploading…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Video
          </>
        )}
      </button>
    </form>
  )
}
