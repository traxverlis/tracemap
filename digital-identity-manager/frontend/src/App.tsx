import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { LoadingState } from './components/PageState'
import { SidebarNav } from './components/SidebarNav'
import { ToastViewport } from './components/Toast'
import { TopBar } from './components/TopBar'
import { useAuth } from './hooks/useAuth'
import { useI18n } from './i18n'
import { AddressesPage } from './pages/AddressesPage'
import { BootstrapPage } from './pages/BootstrapPage'
import { DashboardPage } from './pages/DashboardPage'
import { DataBrokersPage } from './pages/DataBrokersPage'
import { DeletionsPage } from './pages/DeletionsPage'
import { DomainsPage } from './pages/DomainsPage'
import { EmailsPage } from './pages/EmailsPage'
import { EvidencePage } from './pages/EvidencePage'
import { FindingsPage } from './pages/FindingsPage'
import { IdentityPage } from './pages/IdentityPage'
import { IdentityWizardPage } from './pages/IdentityWizardPage'
import { IdentifiersPage } from './pages/IdentifiersPage'
import { LoginPage } from './pages/LoginPage'
import { PhonesPage } from './pages/PhonesPage'
import { PhotosPage } from './pages/PhotosPage'
import { ProfessionalPage } from './pages/ProfessionalPage'
import { ProfilesPage } from './pages/ProfilesPage'
import { RelationshipsPage } from './pages/RelationshipsPage'
import { ScansPage } from './pages/ScansPage'
import { SettingsPage } from './pages/SettingsPage'
import { UsernamesPage } from './pages/UsernamesPage'

function AuthenticatedApp(): JSX.Element {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <SidebarNav />
        <div className="app-main">
          <TopBar />
          <main className="content-shell">
            <Routes>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/identity" element={<IdentityPage />} />
              <Route path="/identity/wizard" element={<IdentityWizardPage />} />
              <Route path="/identifiers" element={<IdentifiersPage />} />
              <Route path="/emails" element={<EmailsPage />} />
              <Route path="/phones" element={<PhonesPage />} />
              <Route path="/usernames" element={<UsernamesPage />} />
              <Route path="/addresses" element={<AddressesPage />} />
              <Route path="/professional" element={<ProfessionalPage />} />
              <Route path="/domains" element={<DomainsPage />} />
              <Route path="/profiles" element={<ProfilesPage />} />
              <Route path="/photos" element={<PhotosPage />} />
              <Route path="/findings" element={<FindingsPage />} />
              <Route path="/relationships" element={<RelationshipsPage />} />
              <Route path="/data-brokers" element={<DataBrokersPage />} />
              <Route path="/deletions" element={<DeletionsPage />} />
              <Route path="/scans" element={<ScansPage />} />
              <Route path="/evidence" element={<EvidencePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default function App(): JSX.Element {
  const { loading, user, needsBootstrap } = useAuth()
  const { t } = useI18n()

  return (
    <>
      {loading ? (
        <div className="full-screen-shell">
          <LoadingState message={t('app.checkingSession')} />
        </div>
      ) : needsBootstrap && !user ? (
        <BootstrapPage />
      ) : !user ? (
        <LoginPage />
      ) : (
        <AuthenticatedApp />
      )}
      <ToastViewport />
    </>
  )
}
