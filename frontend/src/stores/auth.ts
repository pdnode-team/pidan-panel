import { ref, computed } from 'vue'
import { 
  getToken, 
  setToken, 
  ApiError 
} from '../api/client'
import { 
  checkSetupStatus, 
  login as apiLogin, 
  signupAdmin as apiSignup, 
  logout as apiLogout, 
  getProfile as apiGetProfile,
  type UserProfile,
  type LoginPayload,
  type SignupPayload
} from '../api/auth'

const token = ref<string | null>(getToken())
const user = ref<UserProfile | null>(null)
const needsSetup = ref<boolean>(false)
const isCheckingSetup = ref<boolean>(false)
const isInitialized = ref<boolean>(false)

export function useAuthStore() {
  const isLoggedIn = computed(() => !!token.value)

  async function init() {
    if (isInitialized.value) return
    isCheckingSetup.value = true
    try {
      const statusRes = await checkSetupStatus()
      needsSetup.value = statusRes.needsSetup
      if (token.value) {
        try {
          user.value = await apiGetProfile()
        } catch (err) {
          // Token expired or invalid
          setToken(null)
          token.value = null
          user.value = null
        }
      }
    } catch (err) {
      // Backend error - do not fake setup status
      console.error('[Pidan Panel] Failed to check setup status from backend:', err)
      throw err
    } finally {
      isCheckingSetup.value = false
      isInitialized.value = true
    }
  }

  async function login(payload: LoginPayload) {
    const res = await apiLogin(payload)
    token.value = res.token
    user.value = res.user
    setToken(res.token)
    return res
  }

  async function signup(payload: SignupPayload) {
    const res = await apiSignup(payload)
    token.value = res.token
    user.value = res.user
    setToken(res.token)
    needsSetup.value = false
    return res
  }

  async function logout() {
    try {
      if (token.value) {
        await apiLogout()
      }
    } catch (err) {
      console.warn('Logout error:', err)
    } finally {
      token.value = null
      user.value = null
      setToken(null)
    }
  }

  return {
    token,
    user,
    needsSetup,
    isCheckingSetup,
    isLoggedIn,
    init,
    login,
    signup,
    logout
  }
}
