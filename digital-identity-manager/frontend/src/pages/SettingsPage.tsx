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
import { downloadBlob, getErrorDetail } from '../utils'

export function SettingsPage(): JSX.Element {
  const { selectedIdentityId } = useIdentity()
  const { theme, toggleTheme } = useTheme()
  const { addToast } = useToast()
  const { data, loading, error, refetch } = useFetch(getSettings, [])
  const [exporting, setExporting] = useState(false)
  const [eraseConfirm, setEraseConfirm] = useState('')
  const [erasing, setErasing] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  const exportSelected = async () => {
    setExporting(true)
    try {
      const blob = await exportData(selectedIdentityId ?? undefined)
      downloadBlob(selectedIdentityId ? `dim-${selectedIdentityId}.json` : 'dim-export.json', blob)
      addToast({ title: 'Export ready', tone: 'success' })
    } catch (errorValue) {
      addToast({ title: 'Export failed', description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setExporting(false)
    }
  }

  const eraseSelected = async () => {
    setErasing(true)
    try {
      await eraseData({ identity_id: selectedIdentityId ?? undefined, confirm: eraseConfirm })
      addToast({ title: 'Erase request completed', tone: 'success' })
      setEraseConfirm('')
    } catch (errorValue) {
      addToast({ title: 'Erase request failed', description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setErasing(false)
    }
  }

  const submitPasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setChangingPassword(true)
    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword })
      addToast({ title: 'Password changed', tone: 'success' })
      setCurrentPassword('')
      setNewPassword('')
    } catch (errorValue) {
      addToast({ title: 'Password change failed', description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading && !data) return <LoadingState message="Loading settings…" />
  if (error && !data) return <ErrorState message={error} onRetry={() => void refetch()} />

  return (
    <div className="page-stack">
      <PageHeader title="Settings" description="Inspect DIM environment settings, AI status, theme preferences, exports, and destructive actions." />
      <div className="warning-banner">AI is optional and disabled by default. Review minimisation controls before enabling any provider-backed workflows.</div>
      {error && data ? <ErrorState message={error} onRetry={() => void refetch()} /> : null}
      <div className="split-grid">
        <Card title="Environment" description={`Current environment: ${data?.environment ?? 'unknown'}`}>
          <div className="stack stack--sm">
            <div className="inline"><strong>AI provider</strong><Badge tone={data?.ai.enabled ? 'success' : 'warning'}>{data?.ai.provider ?? 'unknown'}</Badge></div>
            <div className="muted">Model: {data?.ai.model ?? 'None configured'}</div>
            <div className="muted">Capabilities: {(data?.ai.capabilities ?? []).join(', ') || 'None'}</div>
            <div className="stack stack--sm">
              <label className="checkbox-row"><input type="checkbox" checked={Boolean(data?.ai.minimization.allow_addresses)} disabled readOnly /><span>Allow addresses</span></label>
              <label className="checkbox-row"><input type="checkbox" checked={Boolean(data?.ai.minimization.allow_phone_numbers)} disabled readOnly /><span>Allow phone numbers</span></label>
              <label className="checkbox-row"><input type="checkbox" checked={Boolean(data?.ai.minimization.allow_full_emails)} disabled readOnly /><span>Allow full emails</span></label>
            </div>
            <div className="inline"><Button variant="secondary" onClick={toggleTheme}>Theme: {theme}</Button><Button onClick={() => void exportSelected()} isLoading={exporting}>Export data</Button></div>
          </div>
        </Card>
        <Card title="Configured tools" description={`Evidence directory: ${data?.storage.evidence_dir ?? '—'} · Reports directory: ${data?.storage.reports_dir ?? '—'}`}>
          <ul className="list-reset list-grid">
            {(data?.tools ?? []).map((tool) => (
              <li key={tool.tool} className="card" style={{ padding: '1rem' }}>
                <div className="space-between"><strong>{tool.tool}</strong><Badge tone={tool.enabled ? 'success' : 'warning'}>{tool.enabled ? 'Enabled' : 'Disabled'}</Badge></div>
                <p className="muted">{tool.description}</p>
                <div className="muted">Scan types: {tool.scan_types.join(', ') || 'None'}</div>
                <div className="muted">Requires: {tool.requires.join(', ') || 'No extra requirements'}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card title="Change password" description="Local authentication only. New passwords must satisfy backend policy.">
        <form className="form-grid" onSubmit={submitPasswordChange}>
          <div className="span-6"><Field label="Current password" htmlFor="settings-current-password"><input id="settings-current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></Field></div>
          <div className="span-6"><Field label="New password" htmlFor="settings-new-password"><input id="settings-new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></Field></div>
          <div className="span-12"><Button type="submit" isLoading={changingPassword}>Change password</Button></div>
        </form>
      </Card>
      <Card title="Danger zone" description="Type ERASE to confirm a destructive delete request for the active identity or the full account scope if none is selected.">
        <div className="stack">
          <Field label="Confirmation text" htmlFor="settings-erase-confirm" hint="Must exactly match ERASE.">
            <input id="settings-erase-confirm" value={eraseConfirm} onChange={(event) => setEraseConfirm(event.target.value)} />
          </Field>
          <Button variant="danger" onClick={() => void eraseSelected()} isLoading={erasing} disabled={eraseConfirm !== 'ERASE'}>
            Erase all my data
          </Button>
        </div>
      </Card>
    </div>
  )
}
