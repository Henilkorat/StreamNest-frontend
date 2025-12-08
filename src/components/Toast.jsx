import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

let toastContainer = null
let toastId = 0

function ToastItem({ message, type, onClose }) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300)
    }, 4000)

    return () => clearTimeout(timer)
  }, [onClose])

  const bgColor = type === 'error' 
    ? 'bg-red-900/20 border-red-800/50' 
    : type === 'success'
    ? 'bg-green-900/20 border-green-800/50'
    : 'bg-blue-900/20 border-blue-800/50'
  
  const textColor = type === 'error' 
    ? 'text-red-400' 
    : type === 'success'
    ? 'text-green-400'
    : 'text-blue-400'
  
  const iconColor = textColor

  const icon = type === 'error' 
    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    : type === 'success'
    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />

  return (
    <div 
      className={`pointer-events-auto card p-4 min-w-[300px] max-w-md transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
      } ${bgColor}`}
    >
      <div className="flex items-center gap-3">
        <svg className={`w-5 h-5 ${iconColor} flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {icon}
        </svg>
        <p className={`text-sm ${textColor} flex-1`}>{message}</p>
        <button 
          onClick={() => {
            setIsVisible(false)
            setTimeout(onClose, 300)
          }}
          className="text-neutral-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    window.showToast = (message, type = 'info') => {
      const id = toastId++
      const newToast = { id, message, type }
      setToasts(prev => [...prev, newToast])
    }
  }, [])

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}

// Initialize toast container
export function initToast() {
  if (toastContainer) return
  
  const container = document.createElement('div')
  container.id = 'toast-root'
  document.body.appendChild(container)
  const root = createRoot(container)
  root.render(<ToastContainer />)
  toastContainer = container
}

export const toast = {
  success: (message) => {
    if (typeof window !== 'undefined' && window.showToast) {
      window.showToast(message, 'success')
    }
  },
  error: (message) => {
    if (typeof window !== 'undefined' && window.showToast) {
      window.showToast(message, 'error')
    }
  },
  info: (message) => {
    if (typeof window !== 'undefined' && window.showToast) {
      window.showToast(message, 'info')
    }
  },
}
