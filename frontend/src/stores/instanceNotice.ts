import { reactive } from 'vue'

const STORAGE_PREFIX = 'pidan_restart_pending_'

function getStoredPending(serverId: string | number): boolean {
  try {
    return sessionStorage.getItem(`${STORAGE_PREFIX}${serverId}`) === 'true'
  } catch {
    return false
  }
}

function setStoredPending(serverId: string | number, pending: boolean) {
  try {
    if (pending) {
      sessionStorage.setItem(`${STORAGE_PREFIX}${serverId}`, 'true')
    } else {
      sessionStorage.removeItem(`${STORAGE_PREFIX}${serverId}`)
    }
  } catch {
    // ignore
  }
}

// Global reactive state shared across all views and navigation
const pendingRestarts = reactive<Record<string, boolean>>({})

export function useInstanceNotice() {
  function isRestartRequired(serverId: string | number): boolean {
    const key = String(serverId)
    if (pendingRestarts[key] === undefined) {
      pendingRestarts[key] = getStoredPending(serverId)
    }
    return Boolean(pendingRestarts[key])
  }

  function markRestartRequired(serverId: string | number) {
    const key = String(serverId)
    pendingRestarts[key] = true
    setStoredPending(serverId, true)
  }

  function clearRestartRequired(serverId: string | number) {
    const key = String(serverId)
    pendingRestarts[key] = false
    setStoredPending(serverId, false)
  }

  return {
    isRestartRequired,
    markRestartRequired,
    clearRestartRequired
  }
}
