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
import type { AuthResponse, User } from '../api/types'
import { getErrorDetail } from '../utils'

const TOKEN_KEY = 'dim_token'
const IDENTITY_KEY = 'dim_selected_identity'

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  needsBootstrap: boolean
  login: (data: { email: string; password: string }) => Promise<void>
  bootstrap: (data: { email: string; password: string; display_name?: string }) => Promise<void>
  logout: () => void
  refreshMe: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function persistAuth(response: AuthResponse): AuthResponse {
  localStorage.setItem(TOKEN_KEY, response.access_token)
  return response
}

export function AuthProvider({ children }: PropsWithChildren): JSX.Element {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsBootstrap, setNeedsBootstrap] = useState(false)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))

  const refreshMe = useCallback(async () => {
    const me = await authApi.getMe()
    setUser(me)
  }, [])

  useEffect(() => {
    let cancelled = false

    const initialize = async () => {
      setLoading(true)
      try {
        const bootstrapStatus = await authApi.getBootstrapStatus()
        if (cancelled) return
        setNeedsBootstrap(bootstrapStatus.needs_bootstrap)

        const existingToken = localStorage.getItem(TOKEN_KEY)
        if (!bootstrapStatus.needs_bootstrap && existingToken) {
          try {
            const me = await authApi.getMe()
            if (!cancelled) {
              setUser(me)
              setToken(existingToken)
            }
          } catch {
            localStorage.removeItem(TOKEN_KEY)
            localStorage.removeItem(IDENTITY_KEY)
            if (!cancelled) {
              setToken(null)
              setUser(null)
            }
          }
        }
      } catch {
        const existingToken = localStorage.getItem(TOKEN_KEY)
        if (existingToken) {
          try {
            const me = await authApi.getMe()
            if (!cancelled) {
              setUser(me)
              setToken(existingToken)
            }
          } catch {
            localStorage.removeItem(TOKEN_KEY)
            localStorage.removeItem(IDENTITY_KEY)
            if (!cancelled) {
              setToken(null)
              setUser(null)
            }
          }
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
    () => ({ user, token, loading, needsBootstrap, login, bootstrap, logout, refreshMe }),
    [bootstrap, loading, login, logout, needsBootstrap, refreshMe, token, user],
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
