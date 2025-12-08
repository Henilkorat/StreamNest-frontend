import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${API_BASE_URL.replace(/\/$/, '')}/api/v1`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Response interceptor to handle ApiResponse format
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Extract backend error message from response.data.message
    // Backend returns ApiError with message field
    const backendMessage = error?.response?.data?.message
    const message = backendMessage || error.message || 'Request failed'
    // Preserve the original error but override message with backend message
    const enhancedError = { ...error }
    enhancedError.message = message
    return Promise.reject(enhancedError)
  }
)

export function setAuthHeader(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common.Authorization
  }
}

export const userApi = {
  login: (payload) => api.post('/users/login', payload),
  register: (formData) => axios.post(
    `${API_BASE_URL.replace(/\/$/, '')}/api/v1/users/register`,
    formData,
    { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } }
  ),
  logout: () => api.post('/users/logout'),
  me: () => api.get('/users/current-user'),
  refresh: (refreshToken) => api.post('/users/refresh-token', { refreshToken }),
  updateAccount: (payload) => api.patch('/users/update-account', payload),
  changePassword: (payload) => api.post('/users/change-password', payload),
  updateAvatar: (file) => {
    const fd = new FormData()
    fd.append('avatar', file)
    return axios.patch(`${API_BASE_URL.replace(/\/$/, '')}/api/v1/users/update-avatar`, fd, { withCredentials: true })
  },
  updateCover: (file) => {
    const fd = new FormData()
    fd.append('coverImage', file)
    return axios.patch(`${API_BASE_URL.replace(/\/$/, '')}/api/v1/users/update-coverImage`, fd, { withCredentials: true })
  },
  channelProfile: (username) => api.get(`/users/channel/${encodeURIComponent(username)}`),
  history: () => api.get('/users/history')
}

export const videoApi = {
  list: (params = {}) => api.get('/videos', { params }),
  get: (videoId) => api.get(`/videos/${videoId}`),
  remove: (videoId) => api.delete(`/videos/${videoId}`),
  update: (videoId, data, thumbnailFile) => {
    if (thumbnailFile) {
      const fd = new FormData()
      Object.entries(data || {}).forEach(([k, v]) => fd.append(k, v))
      fd.append('thumbnail', thumbnailFile)
      return axios.patch(`${API_BASE_URL.replace(/\/$/, '')}/api/v1/videos/${videoId}`, fd, { withCredentials: true })
    }
    return api.patch(`/videos/${videoId}`, data)
  },
  upload: (videoFile, thumbnailFile, fields = {}) => {
    const fd = new FormData()
    fd.append('videoFile', videoFile)
    if (thumbnailFile) fd.append('thumbnail', thumbnailFile)
    Object.entries(fields).forEach(([k, v]) => fd.append(k, v))
    return axios.post(`${API_BASE_URL.replace(/\/$/, '')}/api/v1/videos`, fd, { withCredentials: true })
  },
  togglePublish: (videoId) => api.patch(`/videos/toggle/publish/${videoId}`)
}

export const commentsApi = {
  list: (videoId) => api.get(`/comments/${videoId}`),
  add: (videoId, payload) => api.post(`/comments/${videoId}`, payload),
  remove: (commentId) => api.delete(`/comments/c/${commentId}`)
}

export const likesApi = {
  toggleVideo: (videoId) => api.post(`/likes/toggle/v/${videoId}`),
  toggleComment: (commentId) => api.post(`/likes/toggle/c/${commentId}`),
  toggleTweet: (tweetId) => api.post(`/likes/toggle/t/${tweetId}`),
  likedVideos: () => api.get('/likes/videos')
}

export const playlistApi = {
  create: (payload) => api.post('/playlist', payload),
  get: (playlistId) => api.get(`/playlist/${playlistId}`),
  update: (playlistId, payload) => api.patch(`/playlist/${playlistId}`),
  remove: (playlistId) => api.delete(`/playlist/${playlistId}`),
  addVideo: (videoId, playlistId) => api.patch(`/playlist/add/${videoId}/${playlistId}`),
  removeVideo: (videoId, playlistId) => api.patch(`/playlist/remove/${videoId}/${playlistId}`),
  userPlaylists: (userId) => api.get(`/playlist/user/${userId}`)
}

export const subsApi = {
  subscribed: (channelId) => api.get(`/subscriptions/c/${channelId}`),
  toggle: (channelId) => api.post(`/subscriptions/c/${channelId}`),
  channelSubscribers: (channelId) => api.get(`/subscriptions/u/${channelId}`)
}

export const tweetsApi = {
  create: (payload) => api.post('/tweets', payload),
  byUser: (userId) => api.get(`/tweets/user/${userId}`),
  update: (tweetId, payload) => api.patch(`/tweets/${tweetId}`, payload),
  remove: (tweetId) => api.delete(`/tweets/${tweetId}`)
}

export const dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
  videos: () => api.get('/dashboard/videos')
}
