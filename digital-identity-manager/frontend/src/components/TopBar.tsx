import { Link } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'
import { useIdentity } from '../hooks/useIdentity'
import { useTheme } from '../hooks/useTheme'
import { Button } from './Button'

export function TopBar(): JSX.Element {
  const { user, logout } = useAuth()
  const { identities, selectedIdentityId, setSelectedIdentityId, refreshIdentities, loading } = useIdentity()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="topbar">
      <div className="topbar__controls">
        <div className="topbar__identity">
          <select
            aria-label="Select active identity"
            value={selectedIdentityId ?? ''}
            onChange={(event) => setSelectedIdentityId(event.target.value || null)}
            disabled={loading || identities.length === 0}
          >
            {identities.length === 0 ? <option value="">No identities yet</option> : null}
            {identities.map((identity) => (
              <option key={identity.id} value={identity.id}>
                {identity.label}
              </option>
            ))}
          </select>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void refreshIdentities()}>
          Refresh identities
        </Button>
        <Link to="/identity/wizard">New identity</Link>
      </div>
      <div className="topbar__actions">
        <Button variant="ghost" size="sm" onClick={toggleTheme}>
          Theme: {theme}
        </Button>
        <span className="muted">{user?.display_name ?? user?.email}</span>
        <Button variant="ghost" size="sm" onClick={logout}>Log out</Button>
      </div>
    </header>
  )
}
