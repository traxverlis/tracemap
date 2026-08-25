import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { createIdentity, deleteIdentity, setAuthorization, updateIdentity } from '../api/identities'
import type { Identity } from '../api/types'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Field } from '../components/Field'
import { PageHeader } from '../components/PageHeader'
import { useIdentity } from '../hooks/useIdentity'
import { useToast } from '../hooks/useToast'
import { getErrorDetail, joinLines, maybeNull, splitLines } from '../utils'

interface IdentityFormState {
  label: string
  description: string
  first_name: string
  last_name: string
  birth_date: string
  country: string
  name_variants: string
  known_aliases: string
  cities: string
  notes: string
}

const emptyForm: IdentityFormState = {
  label: '',
  description: '',
  first_name: '',
  last_name: '',
  birth_date: '',
  country: '',
  name_variants: '',
  known_aliases: '',
  cities: '',
  notes: '',
}

const toFormState = (identity: Identity): IdentityFormState => ({
  label: identity.label,
  description: identity.description ?? '',
  first_name: identity.first_name ?? '',
  last_name: identity.last_name ?? '',
  birth_date: identity.birth_date ?? '',
  country: identity.country ?? '',
  name_variants: joinLines(identity.attributes.name_variants ?? []),
  known_aliases: joinLines(identity.attributes.known_aliases ?? []),
  cities: joinLines(identity.attributes.cities ?? []),
  notes: identity.attributes.notes ?? '',
})

export function IdentityPage(): JSX.Element {
  const { selectedIdentity, selectedIdentityId, upsertIdentity, removeIdentity } = useIdentity()
  const { addToast } = useToast()
  const [form, setForm] = useState<IdentityFormState>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deletingBusy, setDeletingBusy] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)

  useEffect(() => {
    if (selectedIdentity) {
      setForm(toFormState(selectedIdentity))
    } else {
      setForm(emptyForm)
    }
  }, [selectedIdentity])

  const saveIdentity = async () => {
    if (!form.label.trim()) {
      addToast({ title: 'Identity label required', tone: 'warning' })
      return
    }

    setSubmitting(true)
    try {
      const payload: Partial<Identity> = {
        label: form.label.trim(),
        description: maybeNull(form.description),
        first_name: maybeNull(form.first_name),
        last_name: maybeNull(form.last_name),
        birth_date: maybeNull(form.birth_date),
        country: maybeNull(form.country),
        attributes: {
          name_variants: splitLines(form.name_variants),
          known_aliases: splitLines(form.known_aliases),
          cities: splitLines(form.cities),
          notes: maybeNull(form.notes) ?? undefined,
        },
      }
      const saved = selectedIdentityId ? await updateIdentity(selectedIdentityId, payload) : await createIdentity(payload)
      upsertIdentity(saved)
      addToast({ title: selectedIdentityId ? 'Identity updated' : 'Identity created', tone: 'success' })
    } catch (errorValue) {
      addToast({ title: 'Unable to save identity', description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setSubmitting(false)
    }
  }

  const toggleAuthorization = async (checked: boolean) => {
    if (!selectedIdentityId) return
    setAuthBusy(true)
    try {
      const updated = await setAuthorization(selectedIdentityId, checked)
      upsertIdentity(updated)
      addToast({
        title: checked ? 'Authorisation acknowledged' : 'Authorisation acknowledgement removed',
        tone: checked ? 'success' : 'warning',
      })
    } catch (errorValue) {
      addToast({ title: 'Unable to update acknowledgement', description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setAuthBusy(false)
    }
  }

  const destroyIdentity = async () => {
    if (!selectedIdentityId) return
    setDeletingBusy(true)
    try {
      await deleteIdentity(selectedIdentityId)
      removeIdentity(selectedIdentityId)
      addToast({ title: 'Identity deleted', tone: 'success' })
    } catch (errorValue) {
      addToast({ title: 'Unable to delete identity', description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setDeletingBusy(false)
      setDeleting(false)
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Identity profile"
        description="Maintain the legal and operational core record for the active identity."
        actions={<Link to="/identity/wizard">Open the 10-step wizard</Link>}
      />

      <Card title={selectedIdentity ? 'Edit active identity' : 'Create an identity'} description="This record anchors all identifiers, scans, and privacy actions.">
        <div className="form-grid">
          <div className="span-6">
            <Field label="Identity label" htmlFor="identity-label" required>
              <input id="identity-label" value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} />
            </Field>
          </div>
          <div className="span-6">
            <Field label="Country" htmlFor="identity-country" hint="ISO country code or country name used by your API.">
              <input id="identity-country" value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} />
            </Field>
          </div>
          <div className="span-6">
            <Field label="First name" htmlFor="identity-first-name">
              <input id="identity-first-name" value={form.first_name} onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))} />
            </Field>
          </div>
          <div className="span-6">
            <Field label="Last name" htmlFor="identity-last-name">
              <input id="identity-last-name" value={form.last_name} onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))} />
            </Field>
          </div>
          <div className="span-6">
            <Field label="Birth date" htmlFor="identity-birth-date">
              <input id="identity-birth-date" type="date" value={form.birth_date} onChange={(event) => setForm((current) => ({ ...current, birth_date: event.target.value }))} />
            </Field>
          </div>
          <div className="span-12">
            <Field label="Description" htmlFor="identity-description">
              <textarea id="identity-description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            </Field>
          </div>
          <div className="span-4">
            <Field label="Name variants" htmlFor="identity-name-variants" hint="One per line">
              <textarea id="identity-name-variants" value={form.name_variants} onChange={(event) => setForm((current) => ({ ...current, name_variants: event.target.value }))} />
            </Field>
          </div>
          <div className="span-4">
            <Field label="Known aliases" htmlFor="identity-known-aliases" hint="One per line">
              <textarea id="identity-known-aliases" value={form.known_aliases} onChange={(event) => setForm((current) => ({ ...current, known_aliases: event.target.value }))} />
            </Field>
          </div>
          <div className="span-4">
            <Field label="Cities" htmlFor="identity-cities" hint="One per line">
              <textarea id="identity-cities" value={form.cities} onChange={(event) => setForm((current) => ({ ...current, cities: event.target.value }))} />
            </Field>
          </div>
          <div className="span-12">
            <Field label="Identity notes" htmlFor="identity-notes">
              <textarea id="identity-notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            </Field>
          </div>
        </div>
        <div className="inline" style={{ marginTop: '1rem' }}>
          <Button onClick={() => void saveIdentity()} isLoading={submitting}>
            {selectedIdentity ? 'Save identity' : 'Create identity'}
          </Button>
          {selectedIdentity ? (
            <Button variant="danger" onClick={() => setDeleting(true)}>
              Delete identity
            </Button>
          ) : null}
        </div>
      </Card>

      <Card title="Authorisation acknowledgement" description="Certain OSINT and privacy workflows require an explicit acknowledgement before scans can run.">
        {selectedIdentity ? (
          <div className="stack stack--sm">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={selectedIdentity.authorization_ack}
                disabled={authBusy}
                onChange={(event) => void toggleAuthorization(event.target.checked)}
              />
              <span>I own this identity or I have explicit written authorisation to audit it.</span>
            </label>
            <span className="muted">Acknowledged at: {selectedIdentity.authorization_ack_at ?? 'Not acknowledged yet'}</span>
          </div>
        ) : (
          <span className="muted">Create an identity first to enable acknowledgement controls.</span>
        )}
      </Card>

      <ConfirmDialog
        open={deleting}
        title="Delete identity"
        description={<p>This permanently removes the currently selected identity and its associated frontend selection.</p>}
        onClose={() => setDeleting(false)}
        onConfirm={() => void destroyIdentity()}
        isLoading={deletingBusy}
      />
    </div>
  )
}
