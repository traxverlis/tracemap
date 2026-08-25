import { Link } from 'react-router-dom'

import { useI18n } from '../i18n'
import { Button } from './Button'
import { Card } from './Card'
import { Spinner } from './Spinner'

export function LoadingState({ message }: { message?: string }): JSX.Element {
  const { t } = useI18n()

  return (
    <Card>
      <div className="inline">
        <Spinner inline />
        <span>{message ?? t('common.loading')}</span>
      </div>
    </Card>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }): JSX.Element {
  const { t } = useI18n()

  return (
    <Card>
      <div className="stack stack--sm">
        <strong>{t('state.errorTitle')}</strong>
        <span className="muted">{message}</span>
        {onRetry ? (
          <div>
            <Button variant="secondary" onClick={onRetry}>{t('common.retry')}</Button>
          </div>
        ) : null}
      </div>
    </Card>
  )
}

export function IdentityRequiredState(): JSX.Element {
  const { t } = useI18n()

  return (
    <Card>
      <div className="stack stack--sm">
        <strong>{t('state.identityRequiredTitle')}</strong>
        <span className="muted">{t('state.identityRequiredDescription')}</span>
        <div className="inline">
          <Link to="/identity">{t('state.goToIdentity')}</Link>
          <Link to="/identity/wizard">{t('state.openWizard')}</Link>
        </div>
      </div>
    </Card>
  )
}
