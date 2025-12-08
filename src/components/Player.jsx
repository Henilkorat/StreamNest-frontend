import { useEffect, useRef } from 'react'

export default function Player({ src, poster, title, videoId, onPlay }) {
  const videoRef = useRef(null)
  const hasPlayedRef = useRef(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !onPlay) return

    const handlePlay = () => {
      // Only trigger once per video load
      if (!hasPlayedRef.current) {
        hasPlayedRef.current = true
        onPlay()
      }
    }

    video.addEventListener('play', handlePlay)

    return () => {
      video.removeEventListener('play', handlePlay)
    }
  }, [onPlay])

  // Reset hasPlayedRef when videoId changes
  useEffect(() => {
    hasPlayedRef.current = false
  }, [videoId])

  return (
    <div className="card overflow-hidden bg-black">
      {src ? (
        <video
          ref={videoRef}
          className="w-full aspect-video"
          controls
          playsInline
          preload="metadata"
          crossOrigin="anonymous"
          poster={poster}
          src={src}
        >
          Sorry, your browser doesn't support embedded videos.
        </video>
      ) : (
        <div className="aspect-video bg-gradient-to-br from-muted to-neutral-900 grid place-items-center relative">
          {poster ? (
            <>
              <img src={poster} alt={title} className="h-full w-full object-cover opacity-50" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-20 h-20 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </>
          ) : (
            <div className="text-center space-y-2">
              <svg className="w-16 h-16 text-neutral-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-neutral-500">No video available</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


