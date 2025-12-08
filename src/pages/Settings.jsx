import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { userApi } from '../services/api.js'
import { useAuth } from '../state/AuthContext.jsx'

export default function Settings() {
  const { user, setUser, logout } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState(user?.fullName || '')
  const [email, setEmail] = useState(user?.email || '')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [avatar, setAvatar] = useState(null)
  const [cover, setCover] = useState(null)
  const [msg, setMsg] = useState('')
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="max-w-2xl space-y-8 py-4">
      <div>
        <h1 className="page-title mb-0">Settings</h1>
        <p className="text-neutral-400 mt-2">Manage your account settings and preferences</p>
      </div>

      {/* Profile Section */}
      <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 card p-6">
        <div className="flex items-center gap-4 mb-2">
          <img 
            src={user?.avatar || ''} 
            alt={user?.userName || 'Avatar'} 
            className="size-16 rounded-full object-cover border-2 border-neutral-800" 
          />
          <div>
            <div className="font-bold text-lg">{user?.userName || user?.fullName || 'Profile'}</div>
            <div className="text-sm text-neutral-400">{user?.email}</div>
          </div>
        </div>
        <button 
            className="btn-primary bg-red-600 hover:bg-red-700 focus:ring-red-500 w-full sm:w-auto" 
            onClick={() => setShowLogoutConfirm(true)}
            aria-label="Logout"
          >
            <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
      </section>

      {/* Account Settings */}
      <section className="card p-6 space-y-5">
        <h2 className="text-xl font-bold mb-2">Account Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Full Name</label>
            <input 
              className="input" 
              placeholder="Enter your full name" 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Email</label>
            <input 
              className="input" 
              placeholder="Enter your email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>
          <button 
            className="btn-primary" 
            onClick={async () => { 
              await userApi.updateAccount({ fullName, email }); 
              setUser({ ...user, fullName, email }); 
              setMsg('Profile updated successfully'); 
            }}
          >
            Save Changes
          </button>
        </div>
      </section>

      {/* Password Settings */}
      <section className="card p-6 space-y-5">
        <h2 className="text-xl font-bold mb-2">Change Password</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Current Password</label>
            <input 
              className="input" 
              type="password" 
              placeholder="Enter your current password" 
              value={oldPassword} 
              onChange={(e) => setOldPassword(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">New Password</label>
            <input 
              className="input" 
              type="password" 
              placeholder="Enter your new password" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
            />
          </div>
          <button 
            className="btn-primary" 
            onClick={async () => { 
              await userApi.changePassword({ oldPassword, newPassword }); 
              setOldPassword(''); 
              setNewPassword(''); 
              setMsg('Password changed successfully'); 
            }}
            disabled={!oldPassword || !newPassword}
          >
            Change Password
          </button>
        </div>
      </section>

      {/* Avatar & Cover Settings */}
      <section className="card p-6 space-y-5">
        <h2 className="text-xl font-bold mb-2">Profile Media</h2>
        
        {/* Current Cover */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-3">Current Cover Image</label>
          <div className="aspect-video bg-muted overflow-hidden rounded-lg border border-neutral-800">
            {user?.coverImage ? (
              <img src={user?.coverImage} alt="cover" className="h-full w-full object-cover"/>
            ) : (
              <div className="grid place-items-center h-full">
                <div className="text-center space-y-2">
                  <svg className="w-12 h-12 text-neutral-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs text-neutral-500">No cover image</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Update Avatar */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">Update Avatar</label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => setAvatar(e.target.files?.[0] || null)}
            className="input file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-700"
          />
          <button 
            className="btn-primary mt-3" 
            onClick={async () => { 
              if (!avatar) return; 
              await userApi.updateAvatar(avatar); 
              setMsg('Avatar updated successfully'); 
              setAvatar(null);
            }}
            disabled={!avatar}
          >
            Update Avatar
          </button>
        </div>

        {/* Update Cover */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">Update Cover Image</label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => setCover(e.target.files?.[0] || null)}
            className="input file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-700"
          />
          <button 
            className="btn-primary mt-3" 
            onClick={async () => { 
              if (!cover) return; 
              await userApi.updateCover(cover); 
              setMsg('Cover image updated successfully'); 
              setCover(null);
            }}
            disabled={!cover}
          >
            Update Cover
          </button>
        </div>
      </section>

    

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="card p-6 max-w-md w-full mx-4 space-y-4">
            <h3 className="text-xl font-bold">Confirm Logout</h3>
            <p className="text-neutral-400">Are you sure you want to log out?</p>
            <div className="flex gap-3 justify-end">
              <button
                className="btn-secondary"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary bg-red-600 hover:bg-red-700 focus:ring-red-500"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {msg && (
        <div className="card p-4 bg-green-900/20 border-green-800/50">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-green-400">{msg}</p>
          </div>
        </div>
      )}
    </div>
  )
}
