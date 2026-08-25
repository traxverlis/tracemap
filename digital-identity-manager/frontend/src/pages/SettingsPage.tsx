import { useState, type FormEvent } from 'react'

import { changePassword } from '../api/auth'
import { eraseData, exportData, getSettings } from '../api/settings'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { ErrorState, LoadingState } from '../components/PageState'
import { PageHeader } from '../components/PageHeader'
import { useFetch } from '../hooks/useFetch'
import { useIdentity } from '../hooks/useIdentity'
import { useTheme } from '../hooks/useTheme'
import { useToast } from '../hooks/useToast'
import { useI18n, type TranslationKey } from '../i18n'
import { downloadBlob, getErrorDetail } from '../utils'

const scanTypeLabelKeys: Record<string, TranslationKey> = {
  username: 'scans.scanType.username',
  email: 'scans.scanType.email',
  domain: 'scans.scanType.domain',
  breach: 'scans.scanType.breach',
}

export function SettingsPage(): JSX.Element {
  const { selectedIdentityId } = useIdentity()
  const { theme, toggleTheme } = useTheme()
  const { addToast } = useToast()
  const { t } = useI18n()
  const { data, loading, error, refetch } = useFetch(getSettings, [])
  const [exporting, setExporting] = useState(false)
  const [eraseConfirm, setEraseConfirm] = useState('')
  const [erasing, setErasing] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  const scanTypeLabel = (scanType: string): string => {
    const key = scanTypeLabelKeys[scanType]
    return key ? t(key) : scanType
  }

  const exportSelected = async () => {
    setExporting(true)
    try {
      const blob = await exportData(selectedIdentityId ?? undefined)
      downloadBlob(selectedIdentityId ? `dim-${selectedIdentityId}.json` : 'dim-export.json', blob)
      addToast({ title: t('settings.toast.exportReady'), tone: 'success' })
    } catch (errorValue) {
      addToast({ title: t('settings.toast.exportFailed'), description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setExporting(false)
    }
  }

  const eraseSelected = async () => {
    setErasing(true)
    try {
      await eraseData({ identity_id: selectedIdentityId ?? undefined, confirm: eraseConfirm })
      addToast({ title: t('settings.toast.eraseCompleted'), tone: 'success' })
      setEraseConfirm('')
    } catch (errorValue) {
      addToast({ title: t('settings.toast.eraseFailed'), description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setErasing(false)
    }
  }

  const submitPasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setChangingPassword(true)
    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword })
      addToast({ title: t('settings.toast.passwordChanged'), tone: 'success' })
      setCurrentPassword('')
      setNewPassword('')
    } catch (errorValue) {
      addToast({ title: t('settings.toast.passwordFailed'), description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading && !data) return <LoadingState message={t('settings.loading')} />
  if (error && !data) return <ErrorState message={error} onRetry={() => void refetch()} />

  return (
    <div className="page-stack">
      <PageHeader title={t('settings.title')} description={t('settings.description')} />
      <div className="warning-banner">{t('settings.aiWarning')}</div>
      {error && data ? <ErrorState message={error} onRetry={() => void refetch()} /> : null}
      <div className="split-grid">
        <Card title={t('settings.environment.title')} description={t('settings.environment.description', { environment: data?.environment ?? t('settings.unknown') })}>
          <div className="stack stack--sm">
            <div className="inline"><strong>{t('settings.ai.provider')}</strong><Badge tone={data?.ai.enabled ? 'success' : 'warning'}>{data?.ai.provider ?? t('settings.unknown')}</Badge></div>
            <div className="muted">{t('settings.ai.model', { model: data?.ai.model ?? t('settings.ai.modelNone') })}</div>
            <div className="muted">{t('settings.ai.capabilities', { capabilities: (data?.ai.capabilities ?? []).join(', ') || t('settings.ai.capabilitiesNone') })}</div>
            <div className="stack stack--sm">
              <label className="checkbox-row"><input type="checkbox" checked={Boolean(data?.ai.minimization.allow_addresses)} disabled readOnly /><span>{t('settings.ai.allowAddresses')}</span></label>
              <label className="checkbox-row"><input type="checkbox" checked={Boolean(data?.ai.minimization.allow_phone_numbers)} disabled readOnly /><span>{t('settings.ai.allowPhoneNumbers')}</span></label>
              <label className="checkbox-row"><input type="checkbox" checked={Boolean(data?.ai.minimization.allow_full_emails)} disabled readOnly /><span>{t('settings.ai.allowFullEmails')}</span></label>
            </div>
            <div className="inline"><Button variant="secondary" onClick={toggleTheme}>{t('settings.theme.button', { theme: theme === 'dark' ? t('settings.theme.dark') : t('settings.theme.light') })}</Button><Button onClick={() => void exportSelected()} isLoading={exporting}>{t('settings.export.button')}</Button></div>
          </div>
        </Card>
        <Card title={t('settings.tools.title')} description={t('settings.tools.description', { evidenceDir: data?.storage.evidence_dir ?? '—', reportsDir: data?.storage.reports_dir ?? '—' })}>
          <ul className="list-reset list-grid">
            {(data?.tools ?? []).map((tool) => (
              <li key={tool.tool} className="card" style={{ padding: '1rem' }}>
                <div className="space-between"><strong>{tool.tool}</strong><Badge tone={tool.enabled ? 'success' : 'warning'}>{tool.enabled ? t('settings.tools.enabled') : t('settings.tools.disabled')}</Badge></div>
                <p className="muted">{tool.description}</p>
                <div className="muted">{t('settings.tools.scanTypes', { scanTypes: tool.scan_types.map(scanTypeLabel).join(', ') || t('settings.tools.scanTypesNone') })}</div>
                <div className="muted">{t('settings.tools.requires', { requires: tool.requires.join(', ') || t('settings.tools.requiresNone') })}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card title={t('settings.password.title')} description={t('settings.password.description')}>
        <form className="form-grid" onSubmit={submitPasswordChange}>
          <div className="span-6"><Field label={t('settings.password.current')} htmlFor="settings-current-password"><input id="settings-current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></Field></div>
          <div className="span-6"><Field label={t('settings.password.new')} htmlFor="settings-new-password"><input id="settings-new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></Field></div>
          <div className="span-12"><Button type="submit" isLoading={changingPassword}>{t('settings.password.submit')}</Button></div>
        </form>
      </Card>
      <Card title={t('settings.danger.title')} description={t('settings.danger.description')}>
        <div className="stack">
          <Field label={t('settings.danger.confirmLabel')} htmlFor="settings-erase-confirm" hint={t('settings.danger.confirmHint')}>
            <input id="settings-erase-confirm" value={eraseConfirm} onChange={(event) => setEraseConfirm(event.target.value)} />
          </Field>
          <Button variant="danger" onClick={() => void eraseSelected()} isLoading={erasing} disabled={eraseConfirm !== 'ERASE'}>
            {t('settings.danger.erase')}
          </Button>
        </div>
      </Card>
    </div>
  )
}
