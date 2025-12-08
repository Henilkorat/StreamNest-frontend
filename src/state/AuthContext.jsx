import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { userApi, setAuthHeader } from '../services/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    let hasInitiated = false
    
    ;(async () => {
      // Prevent double execution in React StrictMode
      if (hasInitiated) return
      hasInitiated = true
      
      try {
        // Attempt to get current user (cookie-based)
        // This will fail with 401 if user is not logged in - that's expected, not an error
        const { data } = await userApi.me()
        if (!isMounted) return
        
        // Backend returns ApiResponse: { statusCode, success, message, data }
        const userData = data?.data || data
        setUser(userData || null)
        if (userData) {
          setAuthHeader(null) // Use cookie auth
        }
      } catch (err) {
        // Expected 401 when user is not logged in - don't treat as error
        // Only try refresh if me() failed with 401 and we might have a refresh token
        if (err?.response?.status === 401) {
          // Check if we have cookies that might contain refresh token
          // Only attempt refresh if there might be a refresh token available
          const hasCookies = document.cookie.length > 0
          
          if (hasCookies) {
            try {
              const { data } = await userApi.refresh('')
              if (!isMounted) return
              
              const token = data?.data?.accessToken || data?.accessToken
              setAccessToken(token || null)
              setAuthHeader(token || null)
              
              const me = await userApi.me()
              if (!isMounted) return
              
              const userData = me?.data?.data || me?.data || null
              setUser(userData || null)
            } catch {
              // Silently fail - user is not authenticated (expected)
              if (isMounted) {
                setUser(null)
                setAccessToken(null)
                setAuthHeader(null)
              }
            }
          } else {
            // No cookies, user is definitely not logged in - expected state
            if (isMounted) {
              setUser(null)
              setAccessToken(null)
              setAuthHeader(null)
            }
          }
        } else {
          // Other errors (network, etc.) - just set user to null
          if (isMounted) {
            setUser(null)
            setAccessToken(null)
            setAuthHeader(null)
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    })()

    return () => {
      isMounted = false
    }
  }, [])

  const login = async (credentials) => {
    try {
      const { data } = await userApi.login(credentials)
      // Backend ApiResponse format: { statusCode, success, message, data: { user, accessToken, refreshToken } }
      const responseData = data?.data || {}
      const token = responseData.accessToken || data?.accessToken
      const userData = responseData.user || data?.user
      
      setAccessToken(token || null)
      setAuthHeader(token || null)
      setUser(userData || null)
      return data
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      await userApi.logout()
    } catch (e) {
      console.error('Logout error:', e)
    } finally {
      setUser(null)
      setAccessToken(null)
      setAuthHeader(null)
    }
  }

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    accessToken,
    loading,
    login,
    logout,
    setUser
  }), [user, accessToken, loading])

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
