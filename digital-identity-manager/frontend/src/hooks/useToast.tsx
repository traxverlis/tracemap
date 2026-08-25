import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'

import { uid } from '../utils'

export type ToastTone = 'success' | 'warning' | 'danger' | 'info'

export interface ToastItem {
  id: string
  title: string
  description?: string
  tone: ToastTone
}

interface ToastContextValue {
  toasts: ToastItem[]
  addToast: (toast: Omit<ToastItem, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: PropsWithChildren): JSX.Element {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const addToast = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = uid()
      setToasts((current) => [...current, { ...toast, id }])
      window.setTimeout(() => removeToast(id), 4000)
    },
    [removeToast],
  )

  const value = useMemo<ToastContextValue>(() => ({ toasts, addToast, removeToast }), [addToast, removeToast, toasts])

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
