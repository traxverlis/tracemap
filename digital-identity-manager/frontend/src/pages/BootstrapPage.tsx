import { useState, type FormEvent } from 'react'

import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { useI18n } from '../i18n'
import { getErrorDetail } from '../utils'

export function BootstrapPage(): JSX.Element {
  const { bootstrap } = useAuth()
  const { addToast } = useToast()
  const { t } = useI18n()
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
      setError(t('bootstrap.passwordsMustMatch'))
      return
    }
    if (password.length < 12) {
      setError(t('bootstrap.passwordTooShort'))
      return
    }

    setSubmitting(true)
    try {
      await bootstrap({ email, password, display_name: displayName || undefined })
      addToast({ title: t('bootstrap.complete'), description: t('bootstrap.completeDescription'), tone: 'success' })
    } catch (errorValue) {
      const detail = getErrorDetail(errorValue)
      setError(detail)
      addToast({ title: t('bootstrap.failed'), description: detail, tone: 'danger' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="full-screen-shell">
      <Card className="auth-card" title={t('bootstrap.title')} description={t('bootstrap.description')}>
        <form className="stack" onSubmit={onSubmit}>
          <Field label={t('bootstrap.displayName')} htmlFor="bootstrap-name">
            <input id="bootstrap-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </Field>
          <Field label={t('login.email')} htmlFor="bootstrap-email" required>
            <input id="bootstrap-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label={t('login.password')} htmlFor="bootstrap-password" required hint={t('bootstrap.passwordHint')}>
            <input id="bootstrap-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
          <Field label={t('bootstrap.confirmPassword')} htmlFor="bootstrap-confirm" required>
            <input id="bootstrap-confirm" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          </Field>
          {error ? <div className="warning-banner">{error}</div> : null}
          <Button type="submit" isLoading={submitting} fullWidth>
            {t('bootstrap.submit')}
          </Button>
          <div className="space-between">
            <span className="muted">{t('language.label')}</span>
            <LanguageSwitcher />
          </div>
        </form>
      </Card>
    </div>
  )
}
