# StreamNest Frontend (React + Vite + Tailwind)

This is a minimalist, modern React frontend for your existing YouTube-like backend.

## Prerequisites
- Node.js 18+
- Backend running and accessible (default: `http://localhost:8000`)
- Backend `CORS_ORIGIN` must include `http://localhost:5173`

## Quick start
```bash
cd frontend
npm install
# set API base url for backend origin
# create .env.local (or .env) with:
# VITE_API_BASE_URL=http://localhost:8000
npm run dev
```
Open http://localhost:5173

## Environment
- `VITE_API_BASE_URL` (required): Backend origin (e.g. `http://localhost:8000`).

## Auth notes
- Backend issues `accessToken` and `refreshToken` cookies plus token in JSON.
- Client sends `withCredentials: true` on requests and also keeps `Authorization: Bearer` when token provided in JSON.

## Implemented pages
- Home: Lists videos from `GET /api/v1/videos` (requires auth per backend routes).
- Login: `POST /api/v1/users/login`
- Register: Multipart `POST /api/v1/users/register` (fields: `fullName`, `userName`, `email`, `password`, `avatar`, `coverImage?`).
- Navbar: Auth-aware, logout via `POST /api/v1/users/logout`.

## Important backend endpoints (mounted in backend)
Base: `/api/v1`
- Users: `/users/register`, `/users/login`, `/users/logout`, `/users/refresh-token`, `/users/change-password`, `/users/current-user`, `/users/update-account`, `/users/update-avatar`, `/users/update-coverImage`, `/users/channel/:username`, `/users/history`.
- Videos: `/videos` (GET list, POST upload multipart: `videoFile`, `thumbnail`), `/videos/:videoId` (GET, DELETE, PATCH with `thumbnail`), `/videos/toggle/publish/:videoId` (PATCH).
- Comments: `/comments/:videoId` (GET, POST), `/comments/c/:commentId` (DELETE).
- Likes: `/likes/toggle/v/:videoId` (POST), `/likes/toggle/c/:commentId` (POST), `/likes/toggle/t/:tweetId` (POST), `/likes/videos` (GET).
- Tweets: `/tweets` (POST), `/tweets/user/:userId` (GET), `/tweets/:tweetId` (PATCH, DELETE).
- Playlist: `/playlist` (POST), `/playlist/:playlistId` (GET, PATCH, DELETE), `/playlist/add/:videoId/:playlistId` (PATCH), `/playlist/remove/:videoId/:playlistId` (PATCH), `/playlist/user/:userId` (GET).
- Subscriptions: `/subscriptions/c/:channelId` (GET, POST), `/subscriptions/u/:channelId` (GET).
- Dashboard: `/dashboard/stats` (GET), `/dashboard/videos` (GET).
- Health: `/healthcheck` (GET).

Note: Many routes require auth (`verifyJWT`), so login is needed before most actions. Ensure backend CORS allows the frontend origin and credentials.

## Folder overview
```
frontend/
  src/
    components/    # UI components (Navbar, VideoCard, ...)
    pages/         # Page-level views
    services/      # Axios API client
    state/         # Auth context
```

## Hand-off prompt for another AI (if you want further UI pages)
Copy/paste this prompt for another model to extend the frontend without touching backend:

"""
You are extending a React (Vite) + Tailwind frontend named StreamNest. Keep the design minimalist and modern (dark theme, ample spacing, rounded corners). Do not modify the backend. Use axios with baseURL `${VITE_API_BASE_URL}/api/v1` and withCredentials=true. Respect the following backend endpoints and auth requirements:

- Users: POST /users/register (multipart: avatar required; coverImage optional), POST /users/login, POST /users/logout, POST /users/refresh-token, GET /users/current-user, POST /users/change-password, PATCH /users/update-account, PATCH /users/update-avatar (multipart), PATCH /users/update-coverImage (multipart), GET /users/channel/:username, GET /users/history
- Videos: GET /videos, POST /videos (multipart: videoFile, thumbnail), GET/DELETE/PATCH /videos/:videoId (thumbnail on PATCH), PATCH /videos/toggle/publish/:videoId
- Comments: GET/POST /comments/:videoId, DELETE /comments/c/:commentId
- Likes: POST /likes/toggle/v/:videoId, POST /likes/toggle/c/:commentId, POST /likes/toggle/t/:tweetId, GET /likes/videos
- Tweets: POST /tweets, GET /tweets/user/:userId, PATCH/DELETE /tweets/:tweetId
- Playlist: POST /playlist, GET/PATCH/DELETE /playlist/:playlistId, PATCH /playlist/add/:videoId/:playlistId, PATCH /playlist/remove/:videoId/:playlistId, GET /playlist/user/:userId
- Subscriptions: GET/POST /subscriptions/c/:channelId, GET /subscriptions/u/:channelId
- Dashboard: GET /dashboard/stats, GET /dashboard/videos
- Health: GET /healthcheck

Constraints:
- Use React Router.
- Maintain a global AuthContext that stores current user and optional accessToken (Authorization header) and uses cookie-based credentials.
- Build pages: Home (video grid + search filter), Watch (video details + comments + like), Channel (profile, subscribe button, channel videos), Upload (upload videoFile+thumbnail), Library (playlists, liked videos, history), Studio (dashboard stats and video management), Auth (login/register), Settings (profile updates, avatar/cover uploads, password change).
- Components: Navbar (auth-aware), Sidebar (collapsible), VideoCard, VideoGrid, Player, CommentList, LikeButton, SubscribeButton, PlaylistManager, UploadForm.
- Visual style: dark, high-contrast minimalism, 12px spacing scale, rounded-xl surfaces, subtle borders, smooth hover/focus states.
- Do not change backend code. All forms must include required fields per endpoints above.

Deliverables:
- Implement routes and pages listed.
- Wire API calls with axios client.
- Keep code clean, readable, and typed where helpful with JSDoc.
"""
