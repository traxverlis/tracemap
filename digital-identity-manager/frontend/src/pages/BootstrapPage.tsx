import { useState, type FormEvent } from 'react'

import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { getErrorDetail } from '../utils'

export function BootstrapPage(): JSX.Element {
  const { bootstrap } = useAuth()
  const { addToast } = useToast()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('Passwords must match.')
      return
    }
    if (password.length < 12) {
      setError('Password must be at least 12 characters long.')
      return
    }

    setSubmitting(true)
    try {
      await bootstrap({ email, password, display_name: displayName || undefined })
      addToast({ title: 'Bootstrap complete', description: 'Your administrator account is ready.', tone: 'success' })
    } catch (errorValue) {
      const detail = getErrorDetail(errorValue)
      setError(detail)
      addToast({ title: 'Bootstrap failed', description: detail, tone: 'danger' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="full-screen-shell">
      <Card className="auth-card" title="Initial bootstrap required" description="Create the first DIM administrator account. Local passwords must be at least 12 characters long.">
        <form className="stack" onSubmit={onSubmit}>
          <Field label="Display name" htmlFor="bootstrap-name">
            <input id="bootstrap-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </Field>
          <Field label="Email" htmlFor="bootstrap-email" required>
            <input id="bootstrap-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label="Password" htmlFor="bootstrap-password" required hint="At least 12 characters">
            <input id="bootstrap-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
          <Field label="Confirm password" htmlFor="bootstrap-confirm" required>
            <input id="bootstrap-confirm" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          </Field>
          {error ? <div className="warning-banner">{error}</div> : null}
          <Button type="submit" isLoading={submitting} fullWidth>
            Create administrator
          </Button>
        </form>
      </Card>
    </div>
  )
}
