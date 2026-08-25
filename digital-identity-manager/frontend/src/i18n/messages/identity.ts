import type { MessageMap } from '../types'

/** Identity profile page and the 10-step identity setup wizard. */
export const identity = {
  'identity.title': { en: 'Identity profile', fr: 'Profil d’identité' },
  'identity.description': {
    en: 'Maintain the legal and operational core record for the active identity.',
    fr: 'Gérez la fiche de référence, juridique et opérationnelle, de l’identité active.',
  },
  'identity.openWizardLink': {
    en: 'Open the 10-step wizard',
    fr: 'Ouvrir l’assistant en 10 étapes',
  },

  'identity.card.editTitle': { en: 'Edit active identity', fr: 'Modifier l’identité active' },
  'identity.card.createTitle': { en: 'Create an identity', fr: 'Créer une identité' },
  'identity.card.description': {
    en: 'This record anchors all identifiers, scans, and privacy actions.',
    fr: 'Cette fiche sert de socle à tous les identifiants, analyses et actions de confidentialité.',
  },

  'identity.field.label': { en: 'Identity label', fr: 'Libellé de l’identité' },
  'identity.field.countryHint': {
    en: 'ISO country code or country name used by your API.',
    fr: 'Code pays ISO ou nom de pays utilisé par votre API.',
  },
  'identity.field.firstName': { en: 'First name', fr: 'Prénom' },
  'identity.field.lastName': { en: 'Last name', fr: 'Nom' },
  'identity.field.birthDate': { en: 'Birth date', fr: 'Date de naissance' },
  'identity.field.nameVariants': { en: 'Name variants', fr: 'Variantes du nom' },
  'identity.field.knownAliases': { en: 'Known aliases', fr: 'Alias connus' },
  'identity.field.cities': { en: 'Cities', fr: 'Villes' },
  'identity.field.notes': { en: 'Identity notes', fr: 'Notes sur l’identité' },
  'identity.field.onePerLine': { en: 'One per line', fr: 'Un par ligne' },

  'identity.action.save': { en: 'Save identity', fr: 'Enregistrer l’identité' },
  'identity.action.create': { en: 'Create identity', fr: 'Créer l’identité' },
  'identity.action.delete': { en: 'Delete identity', fr: 'Supprimer l’identité' },

  'identity.auth.title': { en: 'Authorisation acknowledgement', fr: 'Attestation d’autorisation' },
  'identity.auth.description': {
    en: 'Certain OSINT and privacy workflows require an explicit acknowledgement before scans can run.',
    fr: 'Certaines opérations OSINT et de confidentialité exigent une attestation explicite avant de lancer des analyses.',
  },
  'identity.auth.checkbox': {
    en: 'I own this identity or I have explicit written authorisation to audit it.',
    fr: 'Je suis titulaire de cette identité ou je dispose d’une autorisation écrite explicite pour l’auditer.',
  },
  'identity.auth.acknowledgedAt': {
    en: 'Acknowledged at: {value}',
    fr: 'Attestée le : {value}',
  },
  'identity.auth.notAcknowledged': { en: 'Not acknowledged yet', fr: 'Pas encore attestée' },
  'identity.auth.createFirst': {
    en: 'Create an identity first to enable acknowledgement controls.',
    fr: 'Créez d’abord une identité pour activer les options d’attestation.',
  },

  'identity.delete.description': {
    en: 'This permanently removes the currently selected identity and its associated frontend selection.',
    fr: 'Cette action supprime définitivement l’identité sélectionnée ainsi que la sélection associée dans l’interface.',
  },

  'identity.toast.labelRequired': {
    en: 'Identity label required',
    fr: 'Libellé de l’identité obligatoire',
  },
  'identity.toast.updated': { en: 'Identity updated', fr: 'Identité mise à jour' },
  'identity.toast.created': { en: 'Identity created', fr: 'Identité créée' },
  'identity.toast.saveFailed': {
    en: 'Unable to save identity',
    fr: 'Impossible d’enregistrer l’identité',
  },
  'identity.toast.authAcknowledged': {
    en: 'Authorisation acknowledged',
    fr: 'Autorisation attestée',
  },
  'identity.toast.authRemoved': {
    en: 'Authorisation acknowledgement removed',
    fr: 'Attestation d’autorisation retirée',
  },
  'identity.toast.authFailed': {
    en: 'Unable to update acknowledgement',
    fr: 'Impossible de mettre à jour l’attestation',
  },
  'identity.toast.deleted': { en: 'Identity deleted', fr: 'Identité supprimée' },
  'identity.toast.deleteFailed': {
    en: 'Unable to delete identity',
    fr: 'Impossible de supprimer l’identité',
  },

  'identity.wizard.title': {
    en: 'Identity setup wizard',
    fr: 'Assistant de configuration d’identité',
  },
  'identity.wizard.description': {
    en: 'A guided 10-step flow for standing up or refining a digital identity record.',
    fr: 'Un parcours guidé en 10 étapes pour créer ou affiner une fiche d’identité numérique.',
  },
  'identity.wizard.stepHeading': {
    en: 'Step {current} of {total}: {step}',
    fr: 'Étape {current} sur {total} : {step}',
  },
  'identity.wizard.progress': { en: 'Step {current} / {total}', fr: 'Étape {current} / {total}' },
  'identity.wizard.saveStep': { en: 'Save step', fr: 'Enregistrer l’étape' },
  'identity.wizard.saveAndFinish': { en: 'Save and finish', fr: 'Enregistrer et terminer' },
  'identity.wizard.saveAndContinue': { en: 'Save and continue', fr: 'Enregistrer et continuer' },

  'identity.wizard.step.general.title': { en: 'General info', fr: 'Informations générales' },
  'identity.wizard.step.general.description': {
    en: 'Create the core identity record.',
    fr: 'Créez la fiche d’identité principale.',
  },
  'identity.wizard.step.emails.title': { en: 'Emails', fr: 'E-mails' },
  'identity.wizard.step.emails.description': {
    en: 'List known email addresses, one per line.',
    fr: 'Listez les adresses e-mail connues, une par ligne.',
  },
  'identity.wizard.step.phones.title': { en: 'Phones', fr: 'Téléphones' },
  'identity.wizard.step.phones.description': {
    en: 'List known phone numbers, one per line.',
    fr: 'Listez les numéros de téléphone connus, un par ligne.',
  },
  'identity.wizard.step.usernames.title': { en: 'Usernames', fr: 'Pseudonymes' },
  'identity.wizard.step.usernames.description': {
    en: 'List usernames and handles, one per line.',
    fr: 'Listez les pseudonymes et identifiants publics, un par ligne.',
  },
  'identity.wizard.step.nameVariants.title': { en: 'Name variants', fr: 'Variantes du nom' },
  'identity.wizard.step.nameVariants.description': {
    en: 'Track alternative names and former identities.',
    fr: 'Suivez les noms alternatifs et les anciennes identités.',
  },
  'identity.wizard.step.addresses.title': { en: 'Former addresses', fr: 'Anciennes adresses' },
  'identity.wizard.step.addresses.description': {
    en: 'Capture prior home or mailing addresses.',
    fr: 'Renseignez les anciennes adresses de domicile ou postales.',
  },
  'identity.wizard.step.companies.title': {
    en: 'Professional history',
    fr: 'Parcours professionnel',
  },
  'identity.wizard.step.companies.description': {
    en: 'One line per role: Company | Position | Website | Domain',
    fr: 'Une ligne par poste : Entreprise | Fonction | Site web | Domaine',
  },
  'identity.wizard.step.domains.title': { en: 'Domains', fr: 'Domaines' },
  'identity.wizard.step.domains.description': {
    en: 'List domains owned or used by the identity.',
    fr: 'Listez les domaines détenus ou utilisés par l’identité.',
  },
  'identity.wizard.step.profiles.title': { en: 'Known profiles', fr: 'Profils connus' },
  'identity.wizard.step.profiles.description': {
    en: 'One line per profile: Platform | Username | URL',
    fr: 'Une ligne par profil : Plateforme | Pseudonyme | URL',
  },
  'identity.wizard.step.photos.title': { en: 'Photos / avatars', fr: 'Photos / avatars' },
  'identity.wizard.step.photos.description': {
    en: 'Upload one or more reference photos.',
    fr: 'Téléversez une ou plusieurs photos de référence.',
  },

  'identity.wizard.field.emails': { en: 'Emails', fr: 'E-mails' },
  'identity.wizard.field.emailsHint': {
    en: 'One email address per line.',
    fr: 'Une adresse e-mail par ligne.',
  },
  'identity.wizard.field.phones': { en: 'Phones', fr: 'Téléphones' },
  'identity.wizard.field.phonesHint': {
    en: 'One phone number per line.',
    fr: 'Un numéro de téléphone par ligne.',
  },
  'identity.wizard.field.usernames': { en: 'Usernames', fr: 'Pseudonymes' },
  'identity.wizard.field.usernamesHint': {
    en: 'One username or handle per line.',
    fr: 'Un pseudonyme ou identifiant public par ligne.',
  },
  'identity.wizard.field.aliases': {
    en: 'Former identities / aliases',
    fr: 'Anciennes identités / alias',
  },
  'identity.wizard.field.addresses': { en: 'Former addresses', fr: 'Anciennes adresses' },
  'identity.wizard.field.addressesHint': {
    en: 'One address per line.',
    fr: 'Une adresse par ligne.',
  },
  'identity.wizard.field.companies': { en: 'Professional history', fr: 'Parcours professionnel' },
  'identity.wizard.field.companiesHint': {
    en: 'Format each line as Company | Position | Website | Domain',
    fr: 'Formatez chaque ligne ainsi : Entreprise | Fonction | Site web | Domaine',
  },
  'identity.wizard.field.domains': { en: 'Domains', fr: 'Domaines' },
  'identity.wizard.field.domainsHint': { en: 'One domain per line.', fr: 'Un domaine par ligne.' },
  'identity.wizard.field.profiles': { en: 'Known profiles', fr: 'Profils connus' },
  'identity.wizard.field.profilesHint': {
    en: 'Format each line as Platform | Username | URL',
    fr: 'Formatez chaque ligne ainsi : Plateforme | Pseudonyme | URL',
  },
  'identity.wizard.field.photoFiles': { en: 'Photo files', fr: 'Fichiers photo' },
  'identity.wizard.field.photoFilesHint': {
    en: 'You can select multiple files.',
    fr: 'Vous pouvez sélectionner plusieurs fichiers.',
  },
  'identity.wizard.field.platform': { en: 'Platform', fr: 'Plateforme' },

  'identity.wizard.uploadedPhotos': { en: 'Uploaded photos', fr: 'Photos téléversées' },
  'identity.wizard.noPhotos': {
    en: 'No photos uploaded yet.',
    fr: 'Aucune photo téléversée pour le moment.',
  },
  'identity.wizard.unknownPlatform': { en: 'Unknown platform', fr: 'Plateforme inconnue' },

  'identity.wizard.toast.createIdentityFirst': {
    en: 'Create the identity first',
    fr: 'Créez d’abord l’identité',
  },
  'identity.wizard.toast.stepSaved': {
    en: 'Step saved: {step}',
    fr: 'Étape enregistrée : {step}',
  },
  'identity.wizard.toast.stepFailed': {
    en: 'Unable to save step: {step}',
    fr: 'Impossible d’enregistrer l’étape : {step}',
  },
  'identity.wizard.toast.photoDeleted': { en: 'Photo deleted', fr: 'Photo supprimée' },
  'identity.wizard.toast.photoDeleteFailed': {
    en: 'Unable to delete photo',
    fr: 'Impossible de supprimer la photo',
  },
} as const satisfies MessageMap
