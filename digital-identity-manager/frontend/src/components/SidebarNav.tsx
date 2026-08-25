import { NavLink } from 'react-router-dom'

import { useI18n, type TranslationKey } from '../i18n'

interface NavSection {
  titleKey: TranslationKey
  items: Array<{ to: string; labelKey: TranslationKey }>
}

const sections: NavSection[] = [
  {
    titleKey: 'nav.section.overview',
    items: [
      { to: '/dashboard', labelKey: 'nav.dashboard' },
      { to: '/identity', labelKey: 'nav.identity' },
      { to: '/identity/wizard', labelKey: 'nav.identityWizard' },
    ],
  },
  {
    titleKey: 'nav.section.coreData',
    items: [
      { to: '/identifiers', labelKey: 'nav.identifiers' },
      { to: '/emails', labelKey: 'nav.emails' },
      { to: '/phones', labelKey: 'nav.phones' },
      { to: '/usernames', labelKey: 'nav.usernames' },
      { to: '/addresses', labelKey: 'nav.addresses' },
      { to: '/professional', labelKey: 'nav.professional' },
      { to: '/domains', labelKey: 'nav.domains' },
      { to: '/profiles', labelKey: 'nav.profiles' },
      { to: '/photos', labelKey: 'nav.photos' },
    ],
  },
  {
    titleKey: 'nav.section.investigations',
    items: [
      { to: '/findings', labelKey: 'nav.findings' },
      { to: '/relationships', labelKey: 'nav.relationships' },
      { to: '/data-brokers', labelKey: 'nav.dataBrokers' },
      { to: '/deletions', labelKey: 'nav.deletions' },
      { to: '/scans', labelKey: 'nav.scans' },
      { to: '/evidence', labelKey: 'nav.evidence' },
    ],
  },
  {
    titleKey: 'nav.section.system',
    items: [{ to: '/settings', labelKey: 'nav.settings' }],
  },
]

export function SidebarNav(): JSX.Element {
  const { t } = useI18n()

  return (
    <aside className="app-sidebar">
      <div className="sidebar">
        <div className="sidebar__brand">
          <p className="muted" style={{ margin: 0 }}>{t('app.name')}</p>
          <h1 className="sidebar__title">{t('app.console')}</h1>
          <span className="muted">{t('app.tagline')}</span>
        </div>
        {sections.map((section) => (
          <div key={section.titleKey}>
            <p className="sidebar__section-title">{t(section.titleKey)}</p>
            <nav className="sidebar__nav">
              {section.items.map((item) => (
                <NavLink key={item.to} to={item.to} className="sidebar__link">
                  {t(item.labelKey)}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  )
}
