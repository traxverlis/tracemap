import { Link } from 'react-router-dom'

import { Button } from './Button'
import { Card } from './Card'
import { Spinner } from './Spinner'

export function LoadingState({ message = 'Loading…' }: { message?: string }): JSX.Element {
  return (
    <Card>
      <div className="inline">
        <Spinner inline />
        <span>{message}</span>
      </div>
    </Card>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }): JSX.Element {
  return (
    <Card>
      <div className="stack stack--sm">
        <strong>Something needs attention</strong>
        <span className="muted">{message}</span>
        {onRetry ? (
          <div>
            <Button variant="secondary" onClick={onRetry}>Try again</Button>
          </div>
        ) : null}
      </div>
    </Card>
  )
}

export function IdentityRequiredState(): JSX.Element {
  return (
    <Card>
      <div className="stack stack--sm">
        <strong>Select or create an identity first</strong>
        <span className="muted">
          Most DIM workflows are scoped to the active identity. Create one manually or use the wizard.
        </span>
        <div className="inline">
          <Link to="/identity">Go to identity profile</Link>
          <Link to="/identity/wizard">Open wizard</Link>
        </div>
      </div>
    </Card>
  )
}
