import { useState, type FormEvent } from 'react'

import { getHealth } from '../api/auth'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { useFetch } from '../hooks/useFetch'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { getErrorDetail } from '../utils'

export function LoginPage(): JSX.Element {
  const { login } = useAuth()
  const { addToast } = useToast()
  const { data: health } = useFetch(getHealth, [])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login({ email, password })
      addToast({ title: 'Welcome back', tone: 'success' })
    } catch (errorValue) {
      const detail = getErrorDetail(errorValue)
      setError(detail)
      addToast({ title: 'Login failed', description: detail, tone: 'danger' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="full-screen-shell">
      <Card className="auth-card" title="Sign in to Digital Identity Manager" description="Authenticate with your local DIM credentials to manage identities, scans, and privacy workflows.">
        <form className="stack" onSubmit={onSubmit}>
          <Field label="Email" htmlFor="login-email" required>
            <input id="login-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label="Password" htmlFor="login-password" required>
            <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
          {error ? <div className="warning-banner">{error}</div> : null}
          <Button type="submit" isLoading={submitting} fullWidth>
            Sign in
          </Button>
          <p className="muted" style={{ marginBottom: 0 }}>
            API health: {health ? `${health.status} · ${health.version}` : 'checking…'}
          </p>
        </form>
      </Card>
    </div>
  )
}
