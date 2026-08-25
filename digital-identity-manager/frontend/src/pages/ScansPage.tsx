import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'

import { getSettings } from '../api/settings'
import { cancelScan, createScan, getScanResults, listScans, promoteScanResults } from '../api/scans'
import type { ScanResult } from '../api/types'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { ErrorState, IdentityRequiredState, LoadingState } from '../components/PageState'
import { PageHeader } from '../components/PageHeader'
import { useFetch } from '../hooks/useFetch'
import { useIdentity } from '../hooks/useIdentity'
import { useToast } from '../hooks/useToast'
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

export function ScansPage(): JSX.Element {
  const { selectedIdentityId } = useIdentity()
  const { addToast } = useToast()
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

  const launch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedIdentityId || !launchForm.tool || !launchForm.target.trim()) {
      addToast({ title: 'Tool and target are required', tone: 'warning' })
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
      addToast({ title: 'Scan queued', description: `${scan.tool} ${scan.scan_type} scan queued.`, tone: 'success' })
      setLaunchForm((current) => ({ ...current, target: '', parametersText: '{}' }))
      setSelectedScanId(scan.id)
      await refetch()
    } catch (errorValue) {
      addToast({ title: 'Unable to launch scan', description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setLaunching(false)
    }
  }

  const promote = async () => {
    if (!selectedScan || selectedResults.length === 0) {
      addToast({ title: 'Select at least one result', tone: 'warning' })
      return
    }
    setPromoting(true)
    try {
      const response = await promoteScanResults(selectedScan.id, selectedResults)
      addToast({ title: 'Results promoted', description: `Accounts: ${response.accounts_created}, findings: ${response.findings_created}.`, tone: 'success' })
      setSelectedResults([])
      await Promise.all([refetch(), resultsQuery.refetch()])
    } catch (errorValue) {
      addToast({ title: 'Unable to promote results', description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setPromoting(false)
    }
  }

  const cancelSelectedScan = async () => {
    if (!selectedScan) return
    setCancelling(true)
    try {
      await cancelScan(selectedScan.id)
      addToast({ title: 'Scan cancelled', tone: 'success' })
      await refetch()
    } catch (errorValue) {
      addToast({ title: 'Unable to cancel scan', description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setCancelling(false)
    }
  }

  if (!selectedIdentityId) {
    return (
      <div className="page-stack">
        <PageHeader title="Scans" description="Launch scans, inspect raw results, and promote selected findings or accounts." />
        <IdentityRequiredState />
      </div>
    )
  }

  if (loading && !data) return <LoadingState message="Loading scan history…" />
  if (error && !data) return <ErrorState message={error} onRetry={() => void refetch()} />

  return (
    <div className="page-stack">
      <PageHeader title="Scans" description="Launch scans against configured tools, inspect raw output, and promote selected results." actions={<Button variant="secondary" onClick={() => void refetch()}>Refresh</Button>} />
      <Card title="Launch a scan" description="Choose an enabled tool, scan type, target, and optional JSON parameters.">
        <form className="form-grid" onSubmit={launch}>
          <div className="span-4">
            <Field label="Tool" htmlFor="scan-tool">
              <select id="scan-tool" value={launchForm.tool} onChange={(event) => {
                const nextTool = data?.settings.tools.find((tool) => tool.tool === event.target.value)
                setLaunchForm((current) => ({ ...current, tool: event.target.value, scan_type: nextTool?.scan_types[0] ?? current.scan_type }))
              }}>
                <option value="">Select a tool</option>
                {(data?.settings.tools ?? []).map((tool) => (
                  <option key={tool.tool} value={tool.tool} disabled={!tool.enabled}>
                    {tool.tool}{tool.enabled ? '' : ' (disabled)'}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="span-4">
            <Field label="Scan type" htmlFor="scan-type">
              <select id="scan-type" value={launchForm.scan_type} onChange={(event) => setLaunchForm((current) => ({ ...current, scan_type: event.target.value }))}>
                {(data?.settings.tools.find((tool) => tool.tool === launchForm.tool)?.scan_types ?? ['username', 'email', 'domain']).map((scanType) => (
                  <option key={scanType} value={scanType}>{scanType}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="span-4"><Field label="Target" htmlFor="scan-target" required><input id="scan-target" value={launchForm.target} onChange={(event) => setLaunchForm((current) => ({ ...current, target: event.target.value }))} /></Field></div>
          <div className="span-12"><Field label="Parameters JSON" htmlFor="scan-parameters"><textarea id="scan-parameters" value={launchForm.parametersText} onChange={(event) => setLaunchForm((current) => ({ ...current, parametersText: event.target.value }))} /></Field></div>
          <div className="span-12"><Button type="submit" isLoading={launching}>Launch scan</Button></div>
        </form>
      </Card>
      {error && data ? <ErrorState message={error} onRetry={() => void refetch()} /> : null}
      <div className="split-grid">
        <Card title="Scan history" description="Click a scan to inspect its raw results.">
          <ul className="list-reset list-grid">
            {(data?.scans ?? []).length === 0 ? <li className="muted">No scans yet.</li> : null}
            {(data?.scans ?? []).map((scan) => (
              <li key={scan.id}>
                <button type="button" className="button button--secondary button--full" onClick={() => setSelectedScanId(scan.id)}>
                  <span>{scan.tool} · {scan.scan_type} · {scan.target}</span>
                  <Badge tone={scan.status === 'COMPLETED' ? 'success' : scan.status === 'FAILED' ? 'danger' : 'warning'}>{scan.status}</Badge>
                </button>
                <div className="muted" style={{ marginTop: '0.35rem' }}>{formatDateTime(scan.created_at)}</div>
              </li>
            ))}
          </ul>
        </Card>
        <Card title={selectedScan ? `${selectedScan.tool} results` : 'Scan details'} description={selectedScan ? `${selectedScan.scan_type} · ${selectedScan.target}` : 'Select a scan from the history list.'} actions={selectedScan?.status === 'RUNNING' ? <Button variant="danger" size="sm" onClick={() => void cancelSelectedScan()} isLoading={cancelling}>Cancel</Button> : undefined}>
          {!selectedScan ? (
            <div className="muted">Select a scan to inspect details.</div>
          ) : (
            <div className="stack">
              <div className="inline">
                <Badge tone={selectedScan.status === 'COMPLETED' ? 'success' : selectedScan.status === 'FAILED' ? 'danger' : 'warning'}>{selectedScan.status}</Badge>
                <span className="muted">Started {formatDateTime(selectedScan.started_at ?? selectedScan.created_at)}</span>
                <span className="muted">Finished {formatDateTime(selectedScan.finished_at)}</span>
              </div>
              {selectedScan.error ? <div className="warning-banner">{selectedScan.error}</div> : null}
              <pre className="preformatted">{prettyJson(selectedScan.parameters_json)}</pre>
              {resultsQuery.loading ? <LoadingState message="Loading scan results…" /> : null}
              {resultsQuery.error ? <ErrorState message={resultsQuery.error} onRetry={() => void resultsQuery.refetch()} /> : null}
              <div className="inline">
                <Button variant="secondary" onClick={() => void resultsQuery.refetch()}>Refresh results</Button>
                <Button onClick={() => void promote()} isLoading={promoting}>Promote selected results</Button>
              </div>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Select</th>
                      <th>Type</th>
                      <th>Value</th>
                      <th>URL</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(resultsQuery.data ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="muted">No raw results yet.</td>
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
                        <td>{result.url ? <a href={result.url} target="_blank" rel="noreferrer">Open</a> : '—'}</td>
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
