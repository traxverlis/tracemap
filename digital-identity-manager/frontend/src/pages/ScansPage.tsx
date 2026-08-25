import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'

import { getSettings } from '../api/settings'
import { cancelScan, createScan, getScanResults, listScans, promoteScanResults } from '../api/scans'
import type { Scan, ScanResult } from '../api/types'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { ErrorState, IdentityRequiredState, LoadingState } from '../components/PageState'
import { PageHeader } from '../components/PageHeader'
import { useFetch } from '../hooks/useFetch'
import { useIdentity } from '../hooks/useIdentity'
import { useToast } from '../hooks/useToast'
import { useI18n, type TranslationKey } from '../i18n'
import { formatDateTime, getErrorDetail, prettyJson, safeParseJson } from '../utils'

interface LaunchFormState {
  tool: string
  scan_type: string
  target: string
  parametersText: string
}

const emptyForm: LaunchFormState = {
  tool: '',
  scan_type: 'username',
  target: '',
  parametersText: '{}',
}

const scanTypeLabelKeys: Record<string, TranslationKey> = {
  username: 'scans.scanType.username',
  email: 'scans.scanType.email',
  domain: 'scans.scanType.domain',
  breach: 'scans.scanType.breach',
}

const scanStatusLabelKeys: Record<Scan['status'], TranslationKey> = {
  PENDING: 'scans.status.PENDING',
  RUNNING: 'scans.status.RUNNING',
  COMPLETED: 'scans.status.COMPLETED',
  FAILED: 'scans.status.FAILED',
  CANCELLED: 'scans.status.CANCELLED',
}

export function ScansPage(): JSX.Element {
  const { selectedIdentityId } = useIdentity()
  const { addToast } = useToast()
  const { t } = useI18n()
  const [launchForm, setLaunchForm] = useState<LaunchFormState>(emptyForm)
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null)
  const [selectedResults, setSelectedResults] = useState<string[]>([])
  const [launching, setLaunching] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const fetchScansPage = useCallback(async () => {
    if (!selectedIdentityId) return null
    const [settings, scans] = await Promise.all([getSettings(), listScans({ identity_id: selectedIdentityId })])
    return { settings, scans }
  }, [selectedIdentityId])

  const { data, loading, error, refetch } = useFetch(selectedIdentityId ? fetchScansPage : null, [fetchScansPage])
  const selectedScan = useMemo(
    () => data?.scans.find((scan) => scan.id === selectedScanId) ?? data?.scans[0] ?? null,
    [data?.scans, selectedScanId],
  )

  useEffect(() => {
    if (!selectedScanId && data?.scans[0]) {
      setSelectedScanId(data.scans[0].id)
    }
  }, [data?.scans, selectedScanId])

  useEffect(() => {
    if (!launchForm.tool && data?.settings.tools[0]) {
      setLaunchForm((current) => ({
        ...current,
        tool: data.settings.tools[0].tool,
        scan_type: data.settings.tools[0].scan_types[0] ?? current.scan_type,
      }))
    }
  }, [data?.settings.tools, launchForm.tool])

  const resultsQuery = useFetch<ScanResult[]>(selectedScan ? () => getScanResults(selectedScan.id) : null, [selectedScan?.id])

  const scanTypeLabel = useCallback(
    (scanType: string) => {
      const key = scanTypeLabelKeys[scanType]
      return key ? t(key) : scanType
    },
    [t],
  )

  const launch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedIdentityId || !launchForm.tool || !launchForm.target.trim()) {
      addToast({ title: t('scans.toast.targetRequired'), tone: 'warning' })
      return
    }
    setLaunching(true)
    try {
      const scan = await createScan({
        identity_id: selectedIdentityId,
        tool: launchForm.tool,
        scan_type: launchForm.scan_type,
        target: launchForm.target.trim(),
        parameters_json: safeParseJson(launchForm.parametersText),
      })
      addToast({ title: t('scans.toast.queued'), description: t('scans.toast.queuedDescription', { tool: scan.tool, scanType: scanTypeLabel(scan.scan_type) }), tone: 'success' })
      setLaunchForm((current) => ({ ...current, target: '', parametersText: '{}' }))
      setSelectedScanId(scan.id)
      await refetch()
    } catch (errorValue) {
      addToast({ title: t('scans.toast.launchFailed'), description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setLaunching(false)
    }
  }

  const promote = async () => {
    if (!selectedScan || selectedResults.length === 0) {
      addToast({ title: t('scans.toast.selectResult'), tone: 'warning' })
      return
    }
    setPromoting(true)
    try {
      const response = await promoteScanResults(selectedScan.id, selectedResults)
      addToast({ title: t('scans.toast.promoted'), description: t('scans.toast.promotedDescription', { accounts: response.accounts_created, findings: response.findings_created }), tone: 'success' })
      setSelectedResults([])
      await Promise.all([refetch(), resultsQuery.refetch()])
    } catch (errorValue) {
      addToast({ title: t('scans.toast.promoteFailed'), description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setPromoting(false)
    }
  }

  const cancelSelectedScan = async () => {
    if (!selectedScan) return
    setCancelling(true)
    try {
      await cancelScan(selectedScan.id)
      addToast({ title: t('scans.toast.cancelled'), tone: 'success' })
      await refetch()
    } catch (errorValue) {
      addToast({ title: t('scans.toast.cancelFailed'), description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setCancelling(false)
    }
  }

  if (!selectedIdentityId) {
    return (
      <div className="page-stack">
        <PageHeader title={t('scans.title')} description={t('scans.intro')} />
        <IdentityRequiredState />
      </div>
    )
  }

  if (loading && !data) return <LoadingState message={t('scans.loading')} />
  if (error && !data) return <ErrorState message={error} onRetry={() => void refetch()} />

  return (
    <div className="page-stack">
      <PageHeader title={t('scans.title')} description={t('scans.description')} actions={<Button variant="secondary" onClick={() => void refetch()}>{t('common.refresh')}</Button>} />
      <Card title={t('scans.launch.title')} description={t('scans.launch.description')}>
        <form className="form-grid" onSubmit={launch}>
          <div className="span-4">
            <Field label={t('scans.field.tool')} htmlFor="scan-tool">
              <select id="scan-tool" value={launchForm.tool} onChange={(event) => {
                const nextTool = data?.settings.tools.find((tool) => tool.tool === event.target.value)
                setLaunchForm((current) => ({ ...current, tool: event.target.value, scan_type: nextTool?.scan_types[0] ?? current.scan_type }))
              }}>
                <option value="">{t('scans.tool.placeholder')}</option>
                {(data?.settings.tools ?? []).map((tool) => (
                  <option key={tool.tool} value={tool.tool} disabled={!tool.enabled}>
                    {tool.tool}{tool.enabled ? '' : t('scans.tool.disabledSuffix')}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="span-4">
            <Field label={t('scans.field.scanType')} htmlFor="scan-type">
              <select id="scan-type" value={launchForm.scan_type} onChange={(event) => setLaunchForm((current) => ({ ...current, scan_type: event.target.value }))}>
                {(data?.settings.tools.find((tool) => tool.tool === launchForm.tool)?.scan_types ?? ['username', 'email', 'domain']).map((scanType) => (
                  <option key={scanType} value={scanType}>{scanTypeLabel(scanType)}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="span-4"><Field label={t('scans.field.target')} htmlFor="scan-target" required><input id="scan-target" value={launchForm.target} onChange={(event) => setLaunchForm((current) => ({ ...current, target: event.target.value }))} /></Field></div>
          <div className="span-12"><Field label={t('scans.field.parameters')} htmlFor="scan-parameters"><textarea id="scan-parameters" value={launchForm.parametersText} onChange={(event) => setLaunchForm((current) => ({ ...current, parametersText: event.target.value }))} /></Field></div>
          <div className="span-12"><Button type="submit" isLoading={launching}>{t('scans.launch.submit')}</Button></div>
        </form>
      </Card>
      {error && data ? <ErrorState message={error} onRetry={() => void refetch()} /> : null}
      <div className="split-grid">
        <Card title={t('scans.history.title')} description={t('scans.history.description')}>
          <ul className="list-reset list-grid">
            {(data?.scans ?? []).length === 0 ? <li className="muted">{t('scans.history.empty')}</li> : null}
            {(data?.scans ?? []).map((scan) => (
              <li key={scan.id}>
                <button type="button" className="button button--secondary button--full" onClick={() => setSelectedScanId(scan.id)}>
                  <span>{scan.tool} · {scanTypeLabel(scan.scan_type)} · {scan.target}</span>
                  <Badge tone={scan.status === 'COMPLETED' ? 'success' : scan.status === 'FAILED' ? 'danger' : 'warning'}>{t(scanStatusLabelKeys[scan.status])}</Badge>
                </button>
                <div className="muted" style={{ marginTop: '0.35rem' }}>{formatDateTime(scan.created_at)}</div>
              </li>
            ))}
          </ul>
        </Card>
        <Card title={selectedScan ? t('scans.details.resultsTitle', { tool: selectedScan.tool }) : t('scans.details.title')} description={selectedScan ? `${scanTypeLabel(selectedScan.scan_type)} · ${selectedScan.target}` : t('scans.details.placeholder')} actions={selectedScan?.status === 'RUNNING' ? <Button variant="danger" size="sm" onClick={() => void cancelSelectedScan()} isLoading={cancelling}>{t('common.cancel')}</Button> : undefined}>
          {!selectedScan ? (
            <div className="muted">{t('scans.details.empty')}</div>
          ) : (
            <div className="stack">
              <div className="inline">
                <Badge tone={selectedScan.status === 'COMPLETED' ? 'success' : selectedScan.status === 'FAILED' ? 'danger' : 'warning'}>{t(scanStatusLabelKeys[selectedScan.status])}</Badge>
                <span className="muted">{t('scans.details.started', { date: formatDateTime(selectedScan.started_at ?? selectedScan.created_at) })}</span>
                <span className="muted">{t('scans.details.finished', { date: formatDateTime(selectedScan.finished_at) })}</span>
              </div>
              {selectedScan.error ? <div className="warning-banner">{selectedScan.error}</div> : null}
              <pre className="preformatted">{prettyJson(selectedScan.parameters_json)}</pre>
              {resultsQuery.loading ? <LoadingState message={t('scans.results.loading')} /> : null}
              {resultsQuery.error ? <ErrorState message={resultsQuery.error} onRetry={() => void resultsQuery.refetch()} /> : null}
              <div className="inline">
                <Button variant="secondary" onClick={() => void resultsQuery.refetch()}>{t('scans.results.refresh')}</Button>
                <Button onClick={() => void promote()} isLoading={promoting}>{t('scans.results.promote')}</Button>
              </div>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('scans.results.select')}</th>
                      <th>{t('common.type')}</th>
                      <th>{t('common.value')}</th>
                      <th>{t('scans.results.url')}</th>
                      <th>{t('common.confidence')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(resultsQuery.data ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="muted">{t('scans.results.empty')}</td>
                      </tr>
                    ) : null}
                    {(resultsQuery.data ?? []).map((result) => (
                      <tr key={result.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedResults.includes(result.id)}
                            onChange={(event) => setSelectedResults((current) => event.target.checked ? [...current, result.id] : current.filter((id) => id !== result.id))}
                          />
                        </td>
                        <td>{result.result_type}</td>
                        <td>{result.value ?? '—'}</td>
                        <td>{result.url ? <a href={result.url} target="_blank" rel="noreferrer">{t('common.open')}</a> : '—'}</td>
                        <td>{result.confidence}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
