/**
 * Utility functions for search functionality
 */

/**
 * Detects if a search query is a username search
 * Username search patterns:
 * - Starts with @ (e.g., @username)
 * - Or is a simple alphanumeric string (potential username)
 * 
 * @param {string} query - The search query
 * @returns {Object} - { isUsername: boolean, username: string | null }
 */
export function detectUsernameQuery(query) {
  if (!query || typeof query !== 'string') {
    return { isUsername: false, username: null }
  }

  const trimmed = query.trim()
  
  // If it starts with @, it's definitely a username search
  if (trimmed.startsWith('@')) {
    const username = trimmed.slice(1).trim().toLowerCase()
    // Username should be non-empty after removing @
    if (username.length > 0) {
      return { isUsername: true, username }
    }
  }

  // Check if it's a simple alphanumeric string (potential username)
  // Username pattern: alphanumeric, underscores, hyphens, no spaces
  const usernamePattern = /^[a-zA-Z0-9_-]+$/
  if (usernamePattern.test(trimmed) && trimmed.length > 0) {
    // If it doesn't contain spaces and looks like a username, treat it as such
    // But we'll be conservative - only if it starts with @ or explicitly looks like a username
    // For now, we only treat @username as username search to avoid false positives
    return { isUsername: false, username: null }
  }

  return { isUsername: false, username: null }
}

/**
 * Normalizes a search query for username detection
 * Strips @ prefix and converts to lowercase
 * 
 * @param {string} query - The search query
 * @returns {string} - Normalized username
 */
export function normalizeUsername(query) {
  if (!query) return ''
  const trimmed = query.trim()
  if (trimmed.startsWith('@')) {
    return trimmed.slice(1).trim().toLowerCase()
  }
  return trimmed.toLowerCase()
}
