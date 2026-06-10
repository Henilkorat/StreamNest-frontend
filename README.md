# StreamNest Frontend

Minimalist React frontend for the StreamNest video sharing and adaptive streaming platform.

## Features

* **HLS Adaptive Playback**: Custom HTML5 media player using `hls.js` with resolution switcher (up to 1080p) and fallback handling for transcoder processing states.
* **Creator Studio**: Channel analytics dashboard displaying aggregated views, likes, subscriber counts, and video catalog controls.
* **Interactive Features**: Dynamic comments thread, optimistic like/subscribe toggles, and user playlist management.
* **State & Session Persistence**: Route guards for authentication, sessionStorage-backed video metadata, and dynamic action redirection.

## Tech Stack

* **Frontend Framework**: React 18.3.1 (Vite 5.4.8)
* **Styling**: Tailwind CSS 3.4.14, PostCSS 8.4.47
* **Routing & Client**: React Router DOM 6.26.2, Axios 1.7.7
* **Video Playback**: HLS.js 1.6.16
* **Deployment**: Multi-stage Docker (Nginx Alpine)

## Architecture Overview

* **Authentication**: Cookie-based HTTP-only JWTs. The auth provider caches pending user interactions (e.g., likes/subscriptions) and resumes execution post-login.
* **Caching & View Protection**: Global state manager stores video statistics and viewed session lists, preventing duplicate API view increments caused by React StrictMode double mounts.
* **Decoupled Sync**: A native `EventTarget`-based custom event bus manages UI updates across detached pages without context nesting or redundant root re-renders.

## Project Structure

```text
src/
├── components/   # UI elements (HLS VideoPlayer, Comments, LikeButton, AddToPlaylist)
├── pages/        # Views (Home, Watch, Studio, Library, Settings, Channel)
├── services/     # Axios client configuration and backend endpoints
├── state/        # Global context models (Auth, Sidebar, VideoState)
└── utils/        # Event bus and search parsing helpers
```

## Getting Started

### Prerequisites

* Node.js 18+
* StreamNest backend running on `http://localhost:8000` (CORS configured to accept `http://localhost:5173`)

### Installation & Run

```bash
npm install
npm run dev
```

### Environment Variables

Set `VITE_API_BASE_URL` in a `.env` file to point to your backend:

| Variable Name | Required | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Yes | `http://localhost:8000` | The origin URL of the running StreamNest API backend service. |

## API Endpoints

All endpoints are relative to `/api/v1`:

* **Auth & Profiles**: `POST /users/login`, `POST /users/register`, `POST /users/logout`, `GET /users/current-user`, `PATCH /users/update-account`, `PATCH /users/update-avatar`, `PATCH /users/update-coverImage`, `GET /users/channel/:username`, `GET /users/history`
* **Content Management**: `GET /videos`, `POST /videos`, `GET/PATCH/DELETE /videos/:videoId`, `PATCH /videos/toggle/publish/:videoId`
* **Engagement**: `GET/POST /comments/:videoId`, `DELETE /comments/c/:commentId`, `POST /likes/toggle/[v|c|t]/:id`, `GET /likes/videos`
* **Playlists & Social**: `POST /playlist`, `GET/PATCH/DELETE /playlist/:playlistId`, `PATCH /playlist/[add|remove]/:videoId/:playlistId`, `POST/GET /subscriptions/c/:channelId`
* **Dashboard**: `GET /dashboard/stats`, `GET /dashboard/videos`

## Database Schema (Referenced)

* **User**: `_id`, `userName`, `email`, `fullName`, `avatar`, `coverImage`, `watchHistory`
* **Video**: `_id`, `title`, `description`, `thumbnail`, `views`, `processingStatus`, `masterPlaylistUrl`, `owner`
* **Playlist**: `_id`, `name`, `videos`, `owner`

## Deployment

Build and host static assets via Nginx using the multi-stage Docker setup:

```bash
docker build -t streamnest-frontend .
docker run -d -p 8080:80 streamnest-frontend
```

## Challenges & Key Learnings

1. **View Count Double-Counting**: Resolved React StrictMode double-mount API calls by caching viewed video IDs in `sessionStorage` and validating requests against a memory lock ref during the mount lifecycle.
2. **Component Coupling**: Reduced prop-drilling by employing browser native `EventTarget` dispatch calls to signal state invalidation dynamically across disconnected lists.
3. **Cross-Browser HLS Support**: Designed custom playback control overlays to fallback gracefully to Safari's native WebKit player where MSE (Media Source Extensions) quality menus are restricted.

## Future Improvements

* WebSockets integration for real-time view counts and chat feeds.
* Keyboard shortcuts and customizable playback rates in the player.

## License

MIT
