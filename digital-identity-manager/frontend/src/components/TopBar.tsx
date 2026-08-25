import { Link } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'
import { useIdentity } from '../hooks/useIdentity'
import { useTheme } from '../hooks/useTheme'
import { useI18n } from '../i18n'
import { Button } from './Button'
import { LanguageSwitcher } from './LanguageSwitcher'

export function TopBar(): JSX.Element {
  const { user, logout } = useAuth()
  const { identities, selectedIdentityId, setSelectedIdentityId, refreshIdentities, loading } = useIdentity()
  const { theme, toggleTheme } = useTheme()
  const { t } = useI18n()

  return (
    <header className="topbar">
      <div className="topbar__controls">
        <div className="topbar__identity">
          <select
            aria-label={t('topbar.selectIdentity')}
            value={selectedIdentityId ?? ''}
            onChange={(event) => setSelectedIdentityId(event.target.value || null)}
            disabled={loading || identities.length === 0}
          >
            {identities.length === 0 ? <option value="">{t('topbar.noIdentities')}</option> : null}
            {identities.map((identity) => (
              <option key={identity.id} value={identity.id}>
                {identity.label}
              </option>
            ))}
          </select>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void refreshIdentities()}>
          {t('topbar.refreshIdentities')}
        </Button>
        <Link to="/identity/wizard">{t('topbar.newIdentity')}</Link>
      </div>
      <div className="topbar__actions">
        <LanguageSwitcher className="topbar__language" />
        <Button variant="ghost" size="sm" onClick={toggleTheme}>
          {t('topbar.theme', { theme: t(theme === 'light' ? 'topbar.theme.light' : 'topbar.theme.dark') })}
        </Button>
        <span className="muted">{user?.display_name ?? user?.email}</span>
        <Button variant="ghost" size="sm" onClick={logout}>{t('topbar.logout')}</Button>
      </div>
    </header>
  )
}
