import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
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

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
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
        <div className="flex">
          <Sidebar />
          <main className="flex-1 transition-all duration-300 min-w-0">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route path="/watch/:id" element={<ProtectedRoute><Watch /></ProtectedRoute>} />
                <Route path="/channel/:username" element={<ProtectedRoute><Channel /></ProtectedRoute>} />
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
