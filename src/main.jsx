import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './state/AuthContext.jsx'
import { VideoStateProvider } from './state/VideoStateContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <VideoStateProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </VideoStateProvider>
    </AuthProvider>
  </React.StrictMode>
)
