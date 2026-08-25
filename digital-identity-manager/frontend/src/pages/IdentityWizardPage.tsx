import { useEffect, useMemo, useState } from 'react'

import { createCompany, deleteCompany, listCompanies, updateCompany } from '../api/companies'
import { createDomain, deleteDomain, listDomains, updateDomain } from '../api/domains'
import { createIdentifier, deleteIdentifier, listIdentifiers, updateIdentifier } from '../api/identifiers'
import { createIdentity, updateIdentity } from '../api/identities'
import { deletePhoto, listPhotos, uploadPhoto } from '../api/photos'
import { createProfile, deleteProfile, listProfiles, updateProfile } from '../api/profiles'
import type { Company, Domain, Identifier, Photo, Profile } from '../api/types'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { IdentityRequiredState } from '../components/PageState'
import { PageHeader } from '../components/PageHeader'
import { ProgressBar } from '../components/ProgressBar'
import { useIdentity } from '../hooks/useIdentity'
import { useToast } from '../hooks/useToast'
import { formatDateTime, getErrorDetail, joinLines, maybeNull, splitLines } from '../utils'

interface GeneralStepState {
  label: string
  description: string
  first_name: string
  last_name: string
  birth_date: string
  country: string
  notes: string
}

const defaultGeneral: GeneralStepState = {
  label: '',
  description: '',
  first_name: '',
  last_name: '',
  birth_date: '',
  country: '',
  notes: '',
}

const steps = [
  { title: 'General info', description: 'Create the core identity record.' },
  { title: 'Emails', description: 'List known email addresses, one per line.' },
  { title: 'Phones', description: 'List known phone numbers, one per line.' },
  { title: 'Usernames', description: 'List usernames and handles, one per line.' },
  { title: 'Name variants', description: 'Track alternative names and former identities.' },
  { title: 'Former addresses', description: 'Capture prior home or mailing addresses.' },
  { title: 'Professional history', description: 'One line per role: Company | Position | Website | Domain' },
  { title: 'Domains', description: 'List domains owned or used by the identity.' },
  { title: 'Known profiles', description: 'One line per profile: Platform | Username | URL' },
  { title: 'Photos / avatars', description: 'Upload one or more reference photos.' },
]

function parseDelimitedLines(text: string, columns: number): string[][] {
  return splitLines(text).map((line) => {
    const parts = line.split('|').map((part) => part.trim())
    return Array.from({ length: columns }, (_, index) => parts[index] ?? '')
  })
}

export function IdentityWizardPage(): JSX.Element {
  const { selectedIdentity, selectedIdentityId, upsertIdentity } = useIdentity()
  const { addToast } = useToast()
  const [stepIndex, setStepIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [general, setGeneral] = useState<GeneralStepState>(defaultGeneral)
  const [emails, setEmails] = useState('')
  const [phones, setPhones] = useState('')
  const [usernames, setUsernames] = useState('')
  const [nameVariants, setNameVariants] = useState('')
  const [aliases, setAliases] = useState('')
  const [addresses, setAddresses] = useState('')
  const [companies, setCompanies] = useState('')
  const [domains, setDomains] = useState('')
  const [profiles, setProfiles] = useState('')
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPlatform, setPhotoPlatform] = useState('')
  const [photoSource, setPhotoSource] = useState('')
  const [photoNotes, setPhotoNotes] = useState('')
  const [uploadedPhotos, setUploadedPhotos] = useState<Photo[]>([])

  useEffect(() => {
    if (selectedIdentity) {
      setGeneral({
        label: selectedIdentity.label,
        description: selectedIdentity.description ?? '',
        first_name: selectedIdentity.first_name ?? '',
        last_name: selectedIdentity.last_name ?? '',
        birth_date: selectedIdentity.birth_date ?? '',
        country: selectedIdentity.country ?? '',
        notes: selectedIdentity.attributes.notes ?? '',
      })
      setNameVariants(joinLines(selectedIdentity.attributes.name_variants ?? []))
      setAliases(joinLines(selectedIdentity.attributes.known_aliases ?? []))
    } else {
      setGeneral(defaultGeneral)
      setNameVariants('')
      setAliases('')
    }
  }, [selectedIdentity])

  useEffect(() => {
    let cancelled = false

    const loadStepData = async () => {
      if (!selectedIdentityId) {
        setEmails('')
        setPhones('')
        setUsernames('')
        setAddresses('')
        setCompanies('')
        setDomains('')
        setProfiles('')
        setUploadedPhotos([])
        return
      }

      try {
        const [emailRows, phoneRows, usernameRows, addressRows, companyRows, domainRows, profileRows, photoRows] =
          await Promise.all([
            listIdentifiers({ identity_id: selectedIdentityId, type: 'email' }),
            listIdentifiers({ identity_id: selectedIdentityId, type: 'phone' }),
            listIdentifiers({ identity_id: selectedIdentityId, type: 'username' }),
            listIdentifiers({ identity_id: selectedIdentityId, type: 'address' }),
            listCompanies({ identity_id: selectedIdentityId }),
            listDomains({ identity_id: selectedIdentityId }),
            listProfiles({ identity_id: selectedIdentityId }),
            listPhotos(selectedIdentityId),
          ])

        if (cancelled) return
        setEmails(joinLines(emailRows.map((row) => row.value)))
        setPhones(joinLines(phoneRows.map((row) => row.value)))
        setUsernames(joinLines(usernameRows.map((row) => row.value)))
        setAddresses(joinLines(addressRows.map((row) => row.value)))
        setCompanies(
          companyRows
            .map((row) => [row.name, row.position ?? '', row.website ?? '', row.professional_domain ?? ''].join(' | '))
            .join('\n'),
        )
        setDomains(joinLines(domainRows.map((row) => row.domain)))
        setProfiles(profileRows.map((row) => [row.platform, row.username ?? '', row.url ?? ''].join(' | ')).join('\n'))
        setUploadedPhotos(photoRows)
      } catch {
        // Keep the wizard usable even if one subsection cannot be hydrated.
      }
    }

    void loadStepData()
    return () => {
      cancelled = true
    }
  }, [selectedIdentityId])

  const activeStep = steps[stepIndex]
  const progressValue = ((stepIndex + 1) / steps.length) * 100

  const syncIdentifiers = async (type: Identifier['type'], valuesText: string, extra?: { subtype?: string }) => {
    if (!selectedIdentityId) return
    const desired = splitLines(valuesText)
    const existing = await listIdentifiers({ identity_id: selectedIdentityId, type })

    for (const [index, value] of desired.entries()) {
      const payload: Partial<Identifier> & { identity_id?: string } = {
        identity_id: selectedIdentityId,
        type,
        value,
        subtype: extra?.subtype ?? null,
        is_active: true,
        confidence: 100,
        attributes: {},
      }
      if (existing[index]) {
        await updateIdentifier(existing[index].id, payload)
      } else {
        await createIdentifier(payload)
      }
    }

    for (const stale of existing.slice(desired.length)) {
      await deleteIdentifier(stale.id)
    }
  }

  const syncCompanies = async (valuesText: string) => {
    if (!selectedIdentityId) return
    const desired = parseDelimitedLines(valuesText, 4)
    const existing = await listCompanies({ identity_id: selectedIdentityId })

    for (const [index, row] of desired.entries()) {
      const payload: Partial<Company> = {
        identity_id: selectedIdentityId,
        name: row[0],
        position: maybeNull(row[1]),
        website: maybeNull(row[2]),
        professional_domain: maybeNull(row[3]),
        is_former: true,
        notes: null,
      }
      if (existing[index]) {
        await updateCompany(existing[index].id, payload)
      } else {
        await createCompany(payload)
      }
    }

    for (const stale of existing.slice(desired.length)) {
      await deleteCompany(stale.id)
    }
  }

  const syncDomains = async (valuesText: string) => {
    if (!selectedIdentityId) return
    const desired = splitLines(valuesText)
    const existing = await listDomains({ identity_id: selectedIdentityId })

    for (const [index, value] of desired.entries()) {
      const payload: Partial<Domain> = {
        identity_id: selectedIdentityId,
        domain: value,
      }
      if (existing[index]) {
        await updateDomain(existing[index].id, payload)
      } else {
        await createDomain(payload)
      }
    }

    for (const stale of existing.slice(desired.length)) {
      await deleteDomain(stale.id)
    }
  }

  const syncProfiles = async (valuesText: string) => {
    if (!selectedIdentityId) return
    const desired = parseDelimitedLines(valuesText, 3)
    const existing = await listProfiles({ identity_id: selectedIdentityId })

    for (const [index, row] of desired.entries()) {
      const payload: Partial<Profile> = {
        identity_id: selectedIdentityId,
        platform: row[0],
        username: maybeNull(row[1]),
        url: maybeNull(row[2]),
        is_active: true,
        is_public: true,
      }
      if (existing[index]) {
        await updateProfile(existing[index].id, payload)
      } else {
        await createProfile(payload)
      }
    }

    for (const stale of existing.slice(desired.length)) {
      await deleteProfile(stale.id)
    }
  }

  const uploadSelectedPhotos = async () => {
    if (!selectedIdentityId || photoFiles.length === 0) return
    const uploaded = await Promise.all(
      photoFiles.map((file) =>
        uploadPhoto(selectedIdentityId, file, {
          platform: maybeNull(photoPlatform) ?? undefined,
          source: maybeNull(photoSource) ?? undefined,
          notes: maybeNull(photoNotes) ?? undefined,
        }),
      ),
    )
    setUploadedPhotos((current) => [...uploaded, ...current])
    setPhotoFiles([])
    setPhotoPlatform('')
    setPhotoSource('')
    setPhotoNotes('')
  }

  const saveCurrentStep = async (advance = false) => {
    if (!selectedIdentityId && stepIndex > 0) {
      addToast({ title: 'Create the identity first', tone: 'warning' })
      setStepIndex(0)
      return
    }

    setSaving(true)
    try {
      switch (stepIndex) {
        case 0: {
          if (!general.label.trim()) {
            addToast({ title: 'Identity label required', tone: 'warning' })
            return
          }
          const payload = {
            label: general.label.trim(),
            description: maybeNull(general.description),
            first_name: maybeNull(general.first_name),
            last_name: maybeNull(general.last_name),
            birth_date: maybeNull(general.birth_date),
            country: maybeNull(general.country),
            attributes: {
              name_variants: splitLines(nameVariants),
              known_aliases: splitLines(aliases),
              cities: [],
              notes: maybeNull(general.notes) ?? undefined,
            },
          }
          const saved = selectedIdentityId ? await updateIdentity(selectedIdentityId, payload) : await createIdentity(payload)
          upsertIdentity(saved)
          break
        }
        case 1:
          await syncIdentifiers('email', emails)
          break
        case 2:
          await syncIdentifiers('phone', phones)
          break
        case 3:
          await syncIdentifiers('username', usernames)
          break
        case 4:
          if (!selectedIdentityId) return
          upsertIdentity(
            await updateIdentity(selectedIdentityId, {
              attributes: {
                ...(selectedIdentity?.attributes ?? {}),
                name_variants: splitLines(nameVariants),
                known_aliases: splitLines(aliases),
                notes: maybeNull(general.notes) ?? undefined,
              },
            }),
          )
          break
        case 5:
          await syncIdentifiers('address', addresses, { subtype: 'former' })
          break
        case 6:
          await syncCompanies(companies)
          break
        case 7:
          await syncDomains(domains)
          break
        case 8:
          await syncProfiles(profiles)
          break
        case 9:
          await uploadSelectedPhotos()
          break
        default:
          break
      }
      addToast({ title: `${activeStep.title} saved`, tone: 'success' })
      if (advance) {
        setStepIndex((current) => Math.min(steps.length - 1, current + 1))
      }
    } catch (errorValue) {
      addToast({
        title: `Unable to save ${activeStep.title.toLowerCase()}`,
        description: getErrorDetail(errorValue),
        tone: 'danger',
      })
    } finally {
      setSaving(false)
    }
  }

  const removeUploadedPhoto = async (photo: Photo) => {
    try {
      await deletePhoto(photo.id)
      setUploadedPhotos((current) => current.filter((item) => item.id !== photo.id))
      addToast({ title: 'Photo deleted', tone: 'success' })
    } catch (errorValue) {
      addToast({ title: 'Unable to delete photo', description: getErrorDetail(errorValue), tone: 'danger' })
    }
  }

  const stepBody = useMemo(() => {
    switch (stepIndex) {
      case 0:
        return (
          <div className="form-grid">
            <div className="span-6">
              <Field label="Identity label" htmlFor="wizard-label" required>
                <input id="wizard-label" value={general.label} onChange={(event) => setGeneral((current) => ({ ...current, label: event.target.value }))} />
              </Field>
            </div>
            <div className="span-6">
              <Field label="Country" htmlFor="wizard-country">
                <input id="wizard-country" value={general.country} onChange={(event) => setGeneral((current) => ({ ...current, country: event.target.value }))} />
              </Field>
            </div>
            <div className="span-6">
              <Field label="First name" htmlFor="wizard-first-name">
                <input id="wizard-first-name" value={general.first_name} onChange={(event) => setGeneral((current) => ({ ...current, first_name: event.target.value }))} />
              </Field>
            </div>
            <div className="span-6">
              <Field label="Last name" htmlFor="wizard-last-name">
                <input id="wizard-last-name" value={general.last_name} onChange={(event) => setGeneral((current) => ({ ...current, last_name: event.target.value }))} />
              </Field>
            </div>
            <div className="span-6">
              <Field label="Birth date" htmlFor="wizard-birth-date">
                <input id="wizard-birth-date" type="date" value={general.birth_date} onChange={(event) => setGeneral((current) => ({ ...current, birth_date: event.target.value }))} />
              </Field>
            </div>
            <div className="span-12">
              <Field label="Description" htmlFor="wizard-description">
                <textarea id="wizard-description" value={general.description} onChange={(event) => setGeneral((current) => ({ ...current, description: event.target.value }))} />
              </Field>
            </div>
          </div>
        )
      case 1:
        return (
          <Field label="Emails" htmlFor="wizard-emails" hint="One email address per line.">
            <textarea id="wizard-emails" value={emails} onChange={(event) => setEmails(event.target.value)} />
          </Field>
        )
      case 2:
        return (
          <Field label="Phones" htmlFor="wizard-phones" hint="One phone number per line.">
            <textarea id="wizard-phones" value={phones} onChange={(event) => setPhones(event.target.value)} />
          </Field>
        )
      case 3:
        return (
          <Field label="Usernames" htmlFor="wizard-usernames" hint="One username or handle per line.">
            <textarea id="wizard-usernames" value={usernames} onChange={(event) => setUsernames(event.target.value)} />
          </Field>
        )
      case 4:
        return (
          <div className="form-grid">
            <div className="span-6">
              <Field label="Name variants" htmlFor="wizard-name-variants" hint="One per line">
                <textarea id="wizard-name-variants" value={nameVariants} onChange={(event) => setNameVariants(event.target.value)} />
              </Field>
            </div>
            <div className="span-6">
              <Field label="Former identities / aliases" htmlFor="wizard-aliases" hint="One per line">
                <textarea id="wizard-aliases" value={aliases} onChange={(event) => setAliases(event.target.value)} />
              </Field>
            </div>
          </div>
        )
      case 5:
        return (
          <Field label="Former addresses" htmlFor="wizard-addresses" hint="One address per line.">
            <textarea id="wizard-addresses" value={addresses} onChange={(event) => setAddresses(event.target.value)} />
          </Field>
        )
      case 6:
        return (
          <Field label="Professional history" htmlFor="wizard-companies" hint="Format each line as Company | Position | Website | Domain">
            <textarea id="wizard-companies" value={companies} onChange={(event) => setCompanies(event.target.value)} />
          </Field>
        )
      case 7:
        return (
          <Field label="Domains" htmlFor="wizard-domains" hint="One domain per line.">
            <textarea id="wizard-domains" value={domains} onChange={(event) => setDomains(event.target.value)} />
          </Field>
        )
      case 8:
        return (
          <Field label="Known profiles" htmlFor="wizard-profiles" hint="Format each line as Platform | Username | URL">
            <textarea id="wizard-profiles" value={profiles} onChange={(event) => setProfiles(event.target.value)} />
          </Field>
        )
      case 9:
        return (
          <div className="stack">
            {!selectedIdentityId ? <IdentityRequiredState /> : null}
            <div className="form-grid">
              <div className="span-6">
                <Field label="Photo files" htmlFor="wizard-photos" hint="You can select multiple files.">
                  <input id="wizard-photos" type="file" multiple onChange={(event) => setPhotoFiles(Array.from(event.target.files ?? []))} />
                </Field>
              </div>
              <div className="span-3">
                <Field label="Platform" htmlFor="wizard-photo-platform">
                  <input id="wizard-photo-platform" value={photoPlatform} onChange={(event) => setPhotoPlatform(event.target.value)} />
                </Field>
              </div>
              <div className="span-3">
                <Field label="Source" htmlFor="wizard-photo-source">
                  <input id="wizard-photo-source" value={photoSource} onChange={(event) => setPhotoSource(event.target.value)} />
                </Field>
              </div>
              <div className="span-12">
                <Field label="Notes" htmlFor="wizard-photo-notes">
                  <textarea id="wizard-photo-notes" value={photoNotes} onChange={(event) => setPhotoNotes(event.target.value)} />
                </Field>
              </div>
            </div>
            <div className="stack stack--sm">
              <strong>Uploaded photos</strong>
              <ul className="list-reset list-grid">
                {uploadedPhotos.length === 0 ? <li className="muted">No photos uploaded yet.</li> : null}
                {uploadedPhotos.map((photo) => (
                  <li key={photo.id} className="space-between card" style={{ padding: '1rem' }}>
                    <div>
                      <strong>{photo.filename}</strong>
                      <div className="muted">
                        {formatDateTime(photo.created_at)} · {photo.platform ?? 'Unknown platform'}
                      </div>
                    </div>
                    <Button variant="danger" size="sm" onClick={() => void removeUploadedPhoto(photo)}>
                      Delete
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )
      default:
        return null
    }
  }, [
    addresses,
    aliases,
    companies,
    domains,
    emails,
    general,
    nameVariants,
    photoFiles,
    photoNotes,
    photoPlatform,
    photoSource,
    phones,
    profiles,
    selectedIdentityId,
    stepIndex,
    uploadedPhotos,
    usernames,
  ])

  return (
    <div className="page-stack wizard-grid">
      <PageHeader title="Identity setup wizard" description="A guided 10-step flow for standing up or refining a digital identity record." />
      <Card title={`Step ${stepIndex + 1} of ${steps.length}: ${activeStep.title}`} description={activeStep.description}>
        <div className="stack">
          <ProgressBar value={progressValue} label={`Step ${stepIndex + 1} / ${steps.length}`} />
          {stepBody}
          <div className="inline">
            <Button variant="ghost" disabled={stepIndex === 0} onClick={() => setStepIndex((current) => Math.max(0, current - 1))}>
              Previous
            </Button>
            <Button variant="secondary" onClick={() => void saveCurrentStep(false)} isLoading={saving}>
              Save step
            </Button>
            <Button onClick={() => void saveCurrentStep(stepIndex < steps.length - 1)} isLoading={saving}>
              {stepIndex === steps.length - 1 ? 'Save and finish' : 'Save and continue'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
