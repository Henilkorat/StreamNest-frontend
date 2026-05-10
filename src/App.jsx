import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Sidebar from './components/Sidebar.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Watch from './pages/Watch.jsx'
import Channel from './pages/Channel.jsx'
import Upload from './pages/Upload.jsx'
import Library from './pages/Library.jsx'
import Studio from './pages/Studio.jsx'
import Settings from './pages/Settings.jsx'
import Playlist from './pages/Playlist.jsx'
import { useAuth } from './state/AuthContext.jsx'
import { SidebarProvider } from './state/SidebarContext.jsx'
import { initToast } from './components/Toast.jsx'
import AuthModal from './components/AuthModal.jsx'

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    )
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />
}

export default function App() {
  useEffect(() => {
    initToast()
  }, [])

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background text-white">
        <Navbar />
        <AuthModal />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 transition-all duration-300 min-w-0">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Public Routes with Restricted Actions */}
                <Route path="/watch/:id" element={<Watch />} />
                <Route path="/channel/:username" element={<Channel />} />

                {/* Protected Routes */}
                <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
                <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
                <Route path="/playlist/:id" element={<ProtectedRoute><Playlist /></ProtectedRoute>} />
                <Route path="/studio" element={<ProtectedRoute><Studio /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
