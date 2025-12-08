import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../state/AuthContext.jsx'
import { useSidebar } from '../state/SidebarContext.jsx'
import { useState, useEffect } from 'react'

export default function Navbar() {
  const { isAuthenticated, user } = useAuth()
  const { isSidebarOpen, isExpanded, toggleSidebar } = useSidebar()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [isMobile, setIsMobile] = useState(false)

  const avatarUrl = user?.avatar || user?.profileImage || ''

  // Check if mobile breakpoint
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Initialize search query from URL params
  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '')
  }, [searchParams])

  const handleSearch = (e) => {
    e.preventDefault()
    const query = searchQuery.trim()
    if (query) {
      navigate(`/?search=${encodeURIComponent(query)}`)
    } else {
      navigate('/')
    }
  }

  const handleProfileClick = () => {
    navigate('/settings')
  }

  // Determine which logo to show:
  // - Desktop (>=1024px) => text logo
  // - Mobile (<1024px) => icon logo
  const showTextLogo = !isMobile

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-800/80 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-full px-2 sm:px-4 lg:px-4">
        <div className="flex h-12 items-center justify-between gap-3">
          {/* Left side: Hamburger + Logo */}
          <div className="flex items-center gap-3 sm:gap-3">
            {/* Hamburger button */}
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-neutral-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-background"
              aria-expanded={isSidebarOpen}
              aria-controls="sidebar"
              aria-label="Toggle sidebar"
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isSidebarOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>

            {/* Logo */}
            <Link 
              to="/" 
              className="inline-flex items-center hover:opacity-80 transition-opacity  "
            >
              {showTextLogo ? (
                <img 
                  src="./assets/logo/logo-text.png" 
                  alt="StreamNest" 
                  className="h-17 w-32 object-contain"
                  width={32}
                  height={32}
                />
              ) : (
                <img 
                  src="assets/logo/logo-icon.png" 
                  alt="StreamNest" 
                  className="h-8 w-8 object-contain"
                  width={32}
                  height={32}
                />
              )}
            </Link>
          </div>

          {/* Center: Search bar */}
          {isAuthenticated && (<div className="flex-1 max-w-2xl mx-2 sm:mx-4">
            <form onSubmit={handleSearch} className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search videos or @username..."
                className="w-full h-9 sm:h-10 rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 pl-10 pr-4 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                aria-label="Search videos or username"
              />
              <button
                type="submit"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors focus:outline-none"
                aria-label="Search"
              >
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            </form>
          </div>
          )}

          {/* Right side: Profile image */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <>
                {avatarUrl ? (
                  <button
                    onClick={handleProfileClick}
                    className="focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-background rounded-full transition-transform hover:scale-105"
                    aria-label="Open Settings"
                  >
                    <img 
                      src={avatarUrl} 
                      alt={user?.userName || 'Avatar'} 
                      className="size-8 sm:size-9 rounded-full object-cover border-2 border-neutral-800"
                    />
                  </button>
                ) : (
                  <button
                    onClick={handleProfileClick}
                    className="size-8 sm:size-9 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-background transition-transform hover:scale-105"
                    aria-label="Open Settings"
                  >
                    {(user?.userName || user?.email || 'U')[0].toUpperCase()}
                  </button>
                )}
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="btn-primary text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2"
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="btn-primary bg-neutral-800 hover:bg-neutral-700 text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 hidden sm:inline-block"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
