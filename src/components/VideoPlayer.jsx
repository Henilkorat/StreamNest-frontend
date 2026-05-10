import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Settings, Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';

export default function VideoPlayer({ src, poster, title, videoId, onPlay }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const hasPlayedRef = useRef(false);

  const [qualities, setQualities] = useState([]);
  const [currentQuality, setCurrentQuality] = useState(-1); // -1 is auto
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported() && src && src.endsWith('.m3u8')) {
      const hls = new Hls({
        maxMaxBufferLength: 30, // Optimized for low buffering
      });
      hlsRef.current = hls;

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        // Extract available qualities
        const availableQualities = data.levels.map((level, index) => ({
          height: level.height,
          bitrate: level.bitrate,
          index: index,
        }));
        // Sort descending by height
        availableQualities.sort((a, b) => b.height - a.height);
        setQualities(availableQualities);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        // We could update UI here if auto-switch happened
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = src;
    } else if (src) {
      // Fallback for MP4
      video.src = src;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onPlay) return;

    const handlePlay = () => {
      if (!hasPlayedRef.current) {
        hasPlayedRef.current = true;
        onPlay();
      }
    };

    video.addEventListener('play', handlePlay);
    return () => video.removeEventListener('play', handlePlay);
  }, [onPlay]);

  useEffect(() => {
    hasPlayedRef.current = false;
  }, [videoId]);

  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if (containerRef.current?.webkitRequestFullscreen) {
        containerRef.current.webkitRequestFullscreen();
      } else if (videoRef.current?.webkitEnterFullscreen) {
        videoRef.current.webkitEnterFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  };

  const handleQualityChange = (index) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
      setCurrentQuality(index);
      setShowSettings(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative group card bg-black flex justify-center items-center ${isFullscreen ? 'fixed inset-0 w-screen h-screen z-50 rounded-none' : 'aspect-video'}`}>
      {src ? (
        <div className="relative w-full h-full flex flex-col">
          <video
            ref={videoRef}
            className={`w-full h-full object-contain hide-native-fullscreen ${isFullscreen ? '' : 'rounded-xl'}`}
            controls
            playsInline
            preload="metadata"
            crossOrigin="anonymous"
            poster={poster}
            onClick={() => setShowSettings(false)}
          >
            Sorry, your browser doesn't support embedded videos.
          </video>
          
          {/* Custom Settings Menu Overlay */}
          <div className="absolute bottom-16 sm:bottom-20 right-4 z-50 transition-opacity opacity-100 md:opacity-0 md:group-hover:opacity-100 flex items-center gap-2">
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }}
                className="p-2 sm:p-2.5 bg-black/60 hover:bg-black/80 rounded-full text-white backdrop-blur transition shadow-lg"
                title="Settings"
              >
                <Settings size={20} className="sm:w-6 sm:h-6" />
              </button>
              
              {showSettings && qualities.length > 0 && (
                <div className="absolute bottom-full right-0 mb-3 w-36 sm:w-40 bg-black/90 backdrop-blur rounded-lg border border-neutral-800 shadow-xl overflow-hidden text-sm sm:text-base">
                  <div className="py-1 max-h-48 overflow-y-auto">
                    <button
                      onClick={() => handleQualityChange(-1)}
                      className={`w-full text-left px-4 py-2 hover:bg-white/10 transition ${currentQuality === -1 ? 'text-primary-500 font-bold' : 'text-white'}`}
                    >
                      Auto
                    </button>
                    {qualities.map((q) => (
                      <button
                        key={q.index}
                        onClick={() => handleQualityChange(q.index)}
                        className={`w-full text-left px-4 py-2 hover:bg-white/10 transition ${currentQuality === q.index ? 'text-primary-500 font-bold' : 'text-white'}`}
                      >
                        {q.height}p
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Custom Fullscreen Button */}
            <button
              onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
              className="p-2 sm:p-2.5 bg-black/60 hover:bg-black/80 rounded-full text-white backdrop-blur transition shadow-lg hide-on-ios"
              title="Fullscreen"
            >
              <Maximize size={20} className="sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-muted to-neutral-900 grid place-items-center relative">
          {poster ? (
            <>
              <img src={poster} alt={title} className="h-full w-full object-cover opacity-50" />
            </>
          ) : (
            <div className="text-center space-y-2">
              <p className="text-sm text-neutral-500">No video available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
