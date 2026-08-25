import { NavLink } from 'react-router-dom'

interface NavSection {
  title: string
  items: Array<{ to: string; label: string }>
}

const sections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/identity', label: 'Identity' },
      { to: '/identity/wizard', label: 'Identity wizard' },
    ],
  },
  {
    title: 'Core data',
    items: [
      { to: '/identifiers', label: 'All identifiers' },
      { to: '/emails', label: 'Emails' },
      { to: '/phones', label: 'Phones' },
      { to: '/usernames', label: 'Usernames' },
      { to: '/addresses', label: 'Addresses' },
      { to: '/professional', label: 'Professional history' },
      { to: '/domains', label: 'Domains' },
      { to: '/profiles', label: 'Profiles' },
      { to: '/photos', label: 'Photos' },
    ],
  },
  {
    title: 'Investigations',
    items: [
      { to: '/findings', label: 'Findings' },
      { to: '/relationships', label: 'Relationships' },
      { to: '/data-brokers', label: 'Data brokers' },
      { to: '/deletions', label: 'Deletion requests' },
      { to: '/scans', label: 'Scans' },
      { to: '/evidence', label: 'Evidence' },
    ],
  },
  {
    title: 'System',
    items: [{ to: '/settings', label: 'Settings' }],
  },
]

export function SidebarNav(): JSX.Element {
  return (
    <aside className="app-sidebar">
      <div className="sidebar">
        <div className="sidebar__brand">
          <p className="muted" style={{ margin: 0 }}>Digital Identity Manager</p>
          <h1 className="sidebar__title">DIM Console</h1>
          <span className="muted">OSINT, correlation, privacy, deletion workflows.</span>
        </div>
        {sections.map((section) => (
          <div key={section.title}>
            <p className="sidebar__section-title">{section.title}</p>
            <nav className="sidebar__nav">
              {section.items.map((item) => (
                <NavLink key={item.to} to={item.to} className="sidebar__link">
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  )
}
