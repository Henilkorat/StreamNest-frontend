import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { userApi } from '../services/api.js'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', userName: '', email: '', password: '' })
  const [avatar, setAvatar] = useState(null)
  const [coverImage, setCoverImage] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('fullName', form.fullName)
      fd.append('userName', form.userName)
      fd.append('email', form.email)
      fd.append('password', form.password)
      if (avatar) fd.append('avatar', avatar)
      if (coverImage) fd.append('coverImage', coverImage)
      await userApi.register(fd)
      navigate('/login')
    } catch (err) {
      setError(err?.message || err?.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md w-full py-8">
      <div className="text-center mb-8">
        <h1 className="page-title mb-2">Create your account</h1>
        <p className="text-neutral-400">Join StreamNest and start sharing your videos</p>
      </div>
      <form onSubmit={onSubmit} className="card p-8 space-y-5">
        <div className="space-y-4">
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
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Username <span className="text-red-400">*</span>
            </label>
            <input
              className="input"
              placeholder="Choose a username"
              value={form.userName}
              onChange={(e) => setForm({ ...form, userName: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              className="input"
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Password <span className="text-red-400">*</span>
            </label>
            <input
              className="input"
              type="password"
              placeholder="Create a password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
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
            <p className="text-xs text-neutral-500 mt-1">Choose a profile picture for your account</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Cover Image (optional)
            </label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
              className="input file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-700"
            />
            <p className="text-xs text-neutral-500 mt-1">Optional: Add a cover image to your profile</p>
          </div>
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
          disabled={loading || !avatar}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating…
            </>
          ) : (
            'Create account'
          )}
        </button>
        <div className="text-sm text-neutral-400 text-center pt-2">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium underline">
            Sign in
          </Link>
        </div>
      </form>
    </div>
  )
}
