import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'

import { listIdentities } from '../api/identities'
import type { Identity } from '../api/types'
import { getErrorDetail } from '../utils'
import { useAuth } from './useAuth'

const STORAGE_KEY = 'dim_selected_identity'

interface IdentityContextValue {
  identities: Identity[]
  selectedIdentity: Identity | null
  selectedIdentityId: string | null
  loading: boolean
  error: string | null
  setSelectedIdentityId: (id: string | null) => void
  refreshIdentities: () => Promise<void>
  upsertIdentity: (identity: Identity) => void
  removeIdentity: (identityId: string) => void
}

const IdentityContext = createContext<IdentityContextValue | undefined>(undefined)

export function IdentityProvider({ children }: PropsWithChildren): JSX.Element {
  const { user } = useAuth()
  const [identities, setIdentities] = useState<Identity[]>([])
  const [selectedIdentityId, setSelectedIdentityIdState] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY),
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setSelectedIdentityId = useCallback((id: string | null) => {
    setSelectedIdentityIdState(id)
  }, [])

  const refreshIdentities = useCallback(async () => {
    if (!user) {
      setIdentities([])
      setSelectedIdentityIdState(null)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const items = await listIdentities()
      setIdentities(items)
      setSelectedIdentityIdState((current) => {
        const preferred = current ?? localStorage.getItem(STORAGE_KEY)
        if (preferred && items.some((item) => item.id === preferred)) {
          return preferred
        }
        return items[0]?.id ?? null
      })
    } catch (err) {
      setError(getErrorDetail(err))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      setIdentities([])
      setSelectedIdentityIdState(null)
      setError(null)
      return
    }
    void refreshIdentities()
  }, [refreshIdentities, user])

  useEffect(() => {
    if (selectedIdentityId) {
      localStorage.setItem(STORAGE_KEY, selectedIdentityId)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [selectedIdentityId])

  const upsertIdentity = useCallback((identity: Identity) => {
    setIdentities((current) => {
      const existing = current.find((item) => item.id === identity.id)
      if (existing) {
        return current.map((item) => (item.id === identity.id ? identity : item))
      }
      return [...current, identity]
    })
    setSelectedIdentityIdState(identity.id)
  }, [])

  const removeIdentity = useCallback((identityId: string) => {
    setIdentities((current) => current.filter((item) => item.id !== identityId))
    setSelectedIdentityIdState((current) => (current === identityId ? null : current))
  }, [])

  const selectedIdentity = useMemo(
    () => identities.find((identity) => identity.id === selectedIdentityId) ?? null,
    [identities, selectedIdentityId],
  )

  const value = useMemo<IdentityContextValue>(
    () => ({
      identities,
      selectedIdentity,
      selectedIdentityId,
      loading,
      error,
      setSelectedIdentityId,
      refreshIdentities,
      upsertIdentity,
      removeIdentity,
    }),
    [error, identities, loading, refreshIdentities, removeIdentity, selectedIdentity, selectedIdentityId, setSelectedIdentityId, upsertIdentity],
  )

  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>
}

export function useIdentity(): IdentityContextValue {
  const context = useContext(IdentityContext)
  if (!context) {
    throw new Error('useIdentity must be used within IdentityProvider')
  }
  return context
}
