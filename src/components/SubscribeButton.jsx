import { useState, useEffect } from 'react'
import { useVideoState } from '../state/VideoStateContext.jsx'
import { on } from '../utils/events.js'

export default function SubscribeButton({ channelId, initialSubscribed = false, initialCount = 0 }) {
  const { getSubscriptionStatus, toggleSubscription, checkSubscription } = useVideoState()
  const [loading, setLoading] = useState(false)
  
  // Get subscription status from centralized store
  const { isSubscribed, count } = getSubscriptionStatus(
    channelId, 
    initialSubscribed !== null ? initialSubscribed : null, 
    initialCount
  )

  // Listen for subscription updates (only revalidate, don't call on mount)
  useEffect(() => {
    if (!channelId) return
    const off = on('subscription:updated', ({ channelId: updatedChannelId }) => {
      if (updatedChannelId === channelId) {
        // Only revalidate if this channel was updated
        checkSubscription(channelId).catch(() => {})
      }
    })
    return off
  }, [channelId]) // Don't include checkSubscription in deps to avoid loop

  const handleClick = async () => {
    if (loading || !channelId) return
    setLoading(true)
    try {
      await toggleSubscription(channelId, count)
    } catch (error) {
      console.error('Failed to toggle subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      className={`btn-primary ${isSubscribed ? 'bg-neutral-800 hover:bg-neutral-700' : ''} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={handleClick}
      disabled={loading}
      aria-label={isSubscribed ? 'Unsubscribe' : 'Subscribe'}
    >
      {isSubscribed ? (
        <>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Subscribed
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Subscribe
        </>
      )}
    </button>
  )
}
