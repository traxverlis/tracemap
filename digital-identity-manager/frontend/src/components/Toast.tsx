import { Button } from './Button'
import { useToast } from '../hooks/useToast'
import { cn } from '../utils'

export function ToastViewport(): JSX.Element | null {
  const { toasts, removeToast } = useToast()
  if (toasts.length === 0) return null

  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={cn('toast', `toast--${toast.tone}`)}>
          <div className="space-between">
            <strong>{toast.title}</strong>
            <Button variant="ghost" size="sm" onClick={() => removeToast(toast.id)}>Dismiss</Button>
          </div>
          {toast.description ? <p className="muted" style={{ marginBottom: 0 }}>{toast.description}</p> : null}
        </div>
      ))}
    </div>
  )
}
