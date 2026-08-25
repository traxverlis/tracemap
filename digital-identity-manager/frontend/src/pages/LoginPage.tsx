import { useState, type FormEvent } from 'react'

import { getHealth } from '../api/auth'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { useFetch } from '../hooks/useFetch'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { useI18n } from '../i18n'
import { getErrorDetail } from '../utils'

export function LoginPage(): JSX.Element {
  const { login } = useAuth()
  const { addToast } = useToast()
  const { t } = useI18n()
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
      addToast({ title: t('login.welcomeBack'), tone: 'success' })
    } catch (errorValue) {
      const detail = getErrorDetail(errorValue)
      setError(detail)
      addToast({ title: t('login.failed'), description: detail, tone: 'danger' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="full-screen-shell">
      <Card className="auth-card" title={t('login.title')} description={t('login.description')}>
        <form className="stack" onSubmit={onSubmit}>
          <Field label={t('login.email')} htmlFor="login-email" required>
            <input id="login-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label={t('login.password')} htmlFor="login-password" required>
            <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
          {error ? <div className="warning-banner">{error}</div> : null}
          <Button type="submit" isLoading={submitting} fullWidth>
            {t('login.submit')}
          </Button>
          <div className="space-between">
            <p className="muted" style={{ marginBottom: 0 }}>
              {t('login.apiHealth', {
                status: health ? `${health.status} · ${health.version}` : t('login.apiHealthChecking'),
              })}
            </p>
            <LanguageSwitcher />
          </div>
        </form>
      </Card>
    </div>
  )
}
