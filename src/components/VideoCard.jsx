import { Link } from 'react-router-dom'

export default function VideoCard({ video }) {
  // Return null if video is missing or invalid
  if (!video || (!video._id && !video.id)) {
    return null
  }

  const id = video._id || video.id
  const href = id ? `/watch/${id}` : '#'
  const thumbnail = video?.thumbnail || video?.thumbnailUrl || video?.coverImage
  const title = video?.title || video?.name || 'Untitled video'
  const author = video?.owner?.userName || video?.owner?.fullName || video?.channelName || 'Creator'
  const views = video?.views || 0
  const authorAvatar = video?.owner?.avatar || video?.owner?.profileImage

  return (
    <Link 
      to={href} 
      className="card-hover overflow-hidden block group animate-fade-in"
    >
      <div className="aspect-video bg-muted relative overflow-hidden">
        {thumbnail ? (
          <img 
            src={thumbnail} 
            alt={title} 
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" 
          />
        ) : (
          <div className="h-full w-full grid place-items-center text-xs opacity-60 bg-gradient-to-br from-muted to-neutral-900">
            <svg className="w-12 h-12 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
      </div>
      <div className="p-4 space-y-3">
        <h3 className="line-clamp-2 font-semibold text-sm leading-tight group-hover:text-primary-400 transition-colors">
          {title}
        </h3>
        <div className="flex items-center gap-2">
          {authorAvatar ? (
            <img 
              src={authorAvatar} 
              alt={author} 
              className="size-6 rounded-full object-cover flex-shrink-0" 
            />
          ) : (
            <div className="size-6 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center">
              <span className="text-xs font-medium text-primary-400">
                {author.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-neutral-300 truncate">{author}</div>
            <div className="text-xs text-neutral-500">
              {Intl.NumberFormat('en-US', { 
                notation: views >= 1000000 ? 'compact' : 'standard',
                maximumFractionDigits: 1 
              }).format(views)} views
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
