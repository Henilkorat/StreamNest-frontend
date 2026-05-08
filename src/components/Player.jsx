import React from 'react';
import VideoPlayer from './VideoPlayer.jsx';
import { Loader2 } from 'lucide-react';

export default function Player({ src, poster, title, videoId, onPlay, processingStatus }) {
  
  if (processingStatus === 'processing') {
    return (
      <div className="card overflow-hidden bg-black aspect-video flex flex-col justify-center items-center text-center p-6 space-y-4">
        <Loader2 className="animate-spin text-primary-500 w-12 h-12" />
        <h3 className="text-xl font-semibold">Processing Video...</h3>
        <p className="text-neutral-400 text-sm max-w-md">
          Your video is currently being optimized for adaptive streaming. This may take a few minutes depending on the length of the video.
        </p>
      </div>
    );
  }

  if (processingStatus === 'failed') {
    return (
      <div className="card overflow-hidden bg-black aspect-video flex flex-col justify-center items-center text-center p-6 space-y-4">
        <div className="text-red-500 bg-red-500/10 p-3 rounded-full">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-red-500">Video Processing Failed</h3>
        <p className="text-neutral-400 text-sm max-w-md">
          We encountered an error while optimizing this video. Please try uploading it again.
        </p>
      </div>
    );
  }

  // Render the adaptive HLS player
  return (
    <VideoPlayer 
      src={src} 
      poster={poster} 
      title={title} 
      videoId={videoId} 
      onPlay={onPlay} 
    />
  );
}
