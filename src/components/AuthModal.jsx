import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext.jsx'
import { userApi } from '../services/api.js'

export default function AuthModal() {
  const navigate = useNavigate()
  const { 
    showAuthModal, 
    closeAuthModal, 
    authModalType, 
    setAuthModalType, 
    login 
  } = useAuth()
  
  const [form, setForm] = useState({ fullName: '', userName: '', email: '', password: '' })
  const [avatar, setAvatar] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!showAuthModal) return null

  const handleClose = () => {
    // Reset state
    setForm({ fullName: '', userName: '', email: '', password: '' })
    setAvatar(null)
    setError('')
    closeAuthModal()
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (authModalType === 'login') {
        const payload = form.userName ? { userName: form.userName, password: form.password } : { email: form.email, password: form.password }
        await login(payload)
        // Note: login success handles closing the modal and running pending actions
      } else {
        if (!avatar) {
          setError('Avatar is required')
          setLoading(false)
          return
        }
        
        const fd = new FormData()
        fd.append('fullName', form.fullName)
        fd.append('userName', form.userName)
        fd.append('email', form.email)
        fd.append('password', form.password)
        fd.append('avatar', avatar)
        
        await userApi.register(fd)
        
        // Auto login after register
        await login({ email: form.email, password: form.password })
      }
    } catch (err) {
      let errorMessage = authModalType === 'login' ? 'Login failed' : 'Registration failed'
      
      if (err?.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err?.message && !err.message.includes('status code')) {
        errorMessage = err.message
      } else if (err?.response?.status === 404) {
        errorMessage = 'User not found'
      } else if (err?.response?.status === 401) {
        errorMessage = 'Invalid password'
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="card w-full max-w-md p-8 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-8">
          <h1 className="page-title mb-2">
            {authModalType === 'login' ? 'Sign in to continue' : 'Create an account'}
          </h1>
          <p className="text-neutral-400">
            {authModalType === 'login' 
              ? 'You need to be logged in to perform this action' 
              : 'Join StreamNest to continue'}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-4">
            {authModalType === 'register' && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  className="input"
                  placeholder="Enter your full name"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                {authModalType === 'login' ? 'Username or Email' : 'Username'} <span className="text-red-400">*</span>
              </label>
              <input
                className="input"
                placeholder={authModalType === 'login' ? "Enter username or email" : "Choose a username"}
                value={form.userName}
                onChange={(e) => setForm({ ...form, userName: e.target.value })}
                required={authModalType === 'register'}
              />
            </div>

            {(authModalType === 'register' || (!form.userName && authModalType === 'login')) && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Email {authModalType === 'register' && <span className="text-red-400">*</span>}
                </label>
                <input
                  className="input"
                  type="email"
                  placeholder="Enter your email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required={authModalType === 'register' || (!form.userName && authModalType === 'login')}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Password <span className="text-red-400">*</span>
              </label>
              <input
                className="input"
                type="password"
                placeholder={authModalType === 'login' ? "Enter your password" : "Create a password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            {authModalType === 'register' && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Avatar <span className="text-red-400">*</span>
                </label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => setAvatar(e.target.files?.[0] || null)}
                  className="input file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-700"
                  required
                />
              </div>
            )}
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
            disabled={loading || (authModalType === 'register' && !avatar)}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {authModalType === 'login' ? 'Signing in…' : 'Creating…'}
              </span>
            ) : (
              authModalType === 'login' ? 'Sign in' : 'Create account'
            )}
          </button>

          <div className="text-sm text-neutral-400 text-center pt-2">
            {authModalType === 'login' ? (
              <>
                No account?{' '}
                <button 
                  type="button"
                  onClick={() => setAuthModalType('register')}
                  className="text-primary-400 hover:text-primary-300 font-medium underline"
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button 
                  type="button"
                  onClick={() => setAuthModalType('login')}
                  className="text-primary-400 hover:text-primary-300 font-medium underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
