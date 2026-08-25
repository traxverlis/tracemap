import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'

import * as authApi from '../api/auth'
import { ApiClientError } from '../api/client'
import type { AuthResponse, BootstrapStatus, User } from '../api/types'
import { getErrorDetail } from '../utils'

const TOKEN_KEY = 'dim_token'
const IDENTITY_KEY = 'dim_selected_identity'
/** The API container may still be applying migrations when the UI first loads. */
const STATUS_ATTEMPTS = 5
const STATUS_RETRY_MS = 1500

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  needsBootstrap: boolean
  initError: string | null
  login: (data: { email: string; password: string }) => Promise<void>
  bootstrap: (data: { email: string; password: string; display_name?: string }) => Promise<void>
  logout: () => void
  refreshMe: () => Promise<void>
  retryInitialize: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function persistAuth(response: AuthResponse): AuthResponse {
  localStorage.setItem(TOKEN_KEY, response.access_token)
  return response
}

/** Network failures and 5xx responses mean "not ready yet", not "no account". */
function isTransient(error: unknown): boolean {
  return !(error instanceof ApiClientError) || error.status >= 500
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function fetchBootstrapStatus(): Promise<BootstrapStatus> {
  let lastError: unknown = new Error('Bootstrap status unavailable')
  for (let attempt = 1; attempt <= STATUS_ATTEMPTS; attempt += 1) {
    try {
      return await authApi.getBootstrapStatus()
    } catch (error) {
      lastError = error
      if (!isTransient(error) || attempt === STATUS_ATTEMPTS) break
      await wait(STATUS_RETRY_MS * attempt)
    }
  }
  throw lastError
}

export function AuthProvider({ children }: PropsWithChildren): JSX.Element {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsBootstrap, setNeedsBootstrap] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [initAttempt, setInitAttempt] = useState(0)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))

  const refreshMe = useCallback(async () => {
    const me = await authApi.getMe()
    setUser(me)
  }, [])

  useEffect(() => {
    let cancelled = false

    /** Returns true when a stored token could be exchanged for a session. */
    const restoreSession = async (): Promise<boolean> => {
      const existingToken = localStorage.getItem(TOKEN_KEY)
      if (!existingToken) return false
      try {
        const me = await authApi.getMe()
        if (!cancelled) {
          setUser(me)
          setToken(existingToken)
        }
        return true
      } catch (error) {
        // Keep the token when the API is simply unreachable: only a rejected
        // token (401/403) proves the stored session is no longer valid.
        if (!isTransient(error)) {
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(IDENTITY_KEY)
          if (!cancelled) {
            setToken(null)
            setUser(null)
          }
        }
        return false
      }
    }

    const initialize = async () => {
      setLoading(true)
      setInitError(null)
      try {
        const bootstrapStatus = await fetchBootstrapStatus()
        if (cancelled) return
        setNeedsBootstrap(bootstrapStatus.needs_bootstrap)

        if (!bootstrapStatus.needs_bootstrap) {
          await restoreSession()
        }
      } catch (error) {
        // The bootstrap status is unknown: never assume an account exists,
        // otherwise the first-run administrator screen becomes unreachable.
        const restored = await restoreSession()
        if (!cancelled && !restored) {
          setInitError(getErrorDetail(error))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void initialize()

    return () => {
      cancelled = true
    }
  }, [initAttempt])

  const retryInitialize = useCallback(() => {
    setInitAttempt((attempt) => attempt + 1)
  }, [])

  const login = useCallback(async (data: { email: string; password: string }) => {
    const response = persistAuth(await authApi.login(data))
    setToken(response.access_token)
    setUser(response.user)
    setNeedsBootstrap(false)
  }, [])

  const bootstrap = useCallback(
    async (data: { email: string; password: string; display_name?: string }) => {
      const response = persistAuth(await authApi.bootstrap(data))
      setToken(response.access_token)
      setUser(response.user)
      setNeedsBootstrap(false)
    },
    [],
  )

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(IDENTITY_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      needsBootstrap,
      initError,
      login,
      bootstrap,
      logout,
      refreshMe,
      retryInitialize,
    }),
    [
      bootstrap,
      initError,
      loading,
      login,
      logout,
      needsBootstrap,
      refreshMe,
      retryInitialize,
      token,
      user,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error(getErrorDetail(new Error('useAuth must be used within AuthProvider')))
  }
  return context
}
