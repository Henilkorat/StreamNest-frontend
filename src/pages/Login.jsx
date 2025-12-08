import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../state/AuthContext.jsx'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ userName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = form.userName ? { userName: form.userName, password: form.password } : { email: form.email, password: form.password }
      await login(payload)
      navigate('/')
    } catch (err) {
      // Extract error message from backend response
      // Backend returns ApiError with message field in response.data.message
      // The API interceptor should have set err.message to the backend message
      // But we also check response.data.message directly as fallback
      let errorMessage = 'Login failed'
      
      if (err?.response?.data?.message) {
        // Backend error message (e.g., "Invalid password", "User not found")
        errorMessage = err.response.data.message
      } else if (err?.message && !err.message.includes('status code')) {
        // Use err.message if it's not the generic axios error
        errorMessage = err.message
      } else if (err?.response?.status === 404) {
        // Fallback: if 404, check if it's user not found or password error
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
    <div className="mx-auto max-w-md w-full py-8">
      <div className="text-center mb-8">
        <h1 className="page-title mb-2">Welcome back</h1>
        <p className="text-neutral-400">Sign in to your StreamNest account</p>
      </div>
      <form onSubmit={onSubmit} className="card p-8 space-y-5">
        <div className="text-sm text-neutral-400 text-center">
          Login with username or email
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Username (optional)
            </label>
            <input
              className="input"
              placeholder="Enter your username"
              value={form.userName}
              onChange={(e) => setForm({ ...form, userName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Email
            </label>
            <input
              className="input"
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Password
            </label>
            <input
              className="input"
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
        </div>
        {error && (
          <div 
            className="p-3 rounded-lg bg-red-900/20 border border-red-800/50"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
          >
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
          disabled={loading}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </button>
        <div className="text-sm text-neutral-400 text-center pt-2">
          No account?{' '}
          <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium underline">
            Create one
          </Link>
        </div>
      </form>
    </div>
  )
}
