import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../state/AuthContext.jsx'
import { useSidebar } from '../state/SidebarContext.jsx'

export default function Sidebar() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const { isSidebarOpen, isExpanded, setIsExpanded, closeSidebar } = useSidebar()

  // Auto-collapse on mobile when route changes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsExpanded(false)
      } else {
        setIsExpanded(true)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [setIsExpanded])

  const navItems = [
    { path: '/', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { path: '/upload', label: 'Upload', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12', requireAuth: true },
    { path: '/studio', label: 'Studio', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', requireAuth: true },
    { path: '/library', label: 'Library', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', requireAuth: true },
    { path: '/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', requireAuth: true },
  ]

  const filteredItems = navItems.filter(item => !item.requireAuth || isAuthenticated)
  const isActive = (path) => location.pathname === path

  const handleLinkClick = () => {
    // Close sidebar on mobile after navigation
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      closeSidebar()
    }
  }

  // Determine logo variant based on sidebar state
  const showTextLogo = isExpanded && isSidebarOpen

  return (
    <>
      {/* Mobile overlay */}
      {isSidebarOpen && typeof window !== 'undefined' && window.innerWidth < 1024 && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside 
        id="sidebar"
        className={`
          fixed lg:sticky top-12 lg:top-12 left-0 z-40 
          h-[calc(100vh-3rem)] lg:h-[calc(100vh-3rem)]
          bg-surface border-r border-neutral-800/80
          transition-all duration-300 ease-in-out
          ${isSidebarOpen 
            ? 'translate-x-0' 
            : '-translate-x-full lg:translate-x-0'
          }
          ${isExpanded && isSidebarOpen ? 'w-48' : 'w-18'}
        `}
      >
        <div className="flex flex-col h-full">
       

          {/* Navigation items */}
          <nav className="flex-1 overflow-y-auto py-4 px-2 sm:px-3">
            <div className="space-y-1">
              {filteredItems.map((item) => {
                const active = isActive(item.path)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={handleLinkClick}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg
                      transition-all duration-200
                      ${active 
                        ? 'bg-primary/20 text-primary-400' 
                        : 'text-neutral-400 hover:text-white hover:bg-muted'
                      }
                      ${!isExpanded || !isSidebarOpen ? 'justify-center' : ''}
                    `}
                    title={(!isExpanded || !isSidebarOpen) ? item.label : ''}
                  >
                    <svg
                      className={`w-5 h-5 flex-shrink-0 ${active ? 'text-primary-400' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={item.icon}
                      />
                    </svg>
                    {(isExpanded && isSidebarOpen) && (
                      <span className="text-sm font-medium">{item.label}</span>
                    )}
                  </Link>
                )
              })}
            </div>
          </nav>
        </div>

      
      </aside>
    </>
  )
}
