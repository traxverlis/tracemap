import type { MessageMap } from '../types'

/** Identifier inventory screens: emails, phones, usernames, addresses, professional history. */
export const identifiers = {
  'identifiers.all.title': { en: 'All identifiers', fr: 'Tous les identifiants' },
  'identifiers.all.description': {
    en: 'Manage the full identifier inventory for the active identity across email, phone, username, address, and domain records.',
    fr: 'Gérez l’inventaire complet des identifiants de l’identité active : e-mails, téléphones, pseudonymes, adresses et domaines.',
  },
  'identifiers.emails.title': { en: 'Emails', fr: 'E-mails' },
  'identifiers.emails.description': {
    en: 'Track primary, secondary, and historical email addresses used by the active identity.',
    fr: 'Suivez les adresses e-mail principales, secondaires et historiques utilisées par l’identité active.',
  },
  'identifiers.phones.title': { en: 'Phones', fr: 'Téléphones' },
  'identifiers.phones.description': {
    en: 'Store phone numbers with masked display, confidence, and validity windows.',
    fr: 'Conservez les numéros de téléphone avec affichage masqué, niveau de confiance et périodes de validité.',
  },
  'identifiers.usernames.title': { en: 'Usernames', fr: 'Pseudonymes' },
  'identifiers.usernames.description': {
    en: 'Manage handles and launch approved username scans with Maigret, Sherlock, WhatsMyName, and OpenOSINT.',
    fr: 'Gérez les pseudonymes et lancez les analyses autorisées avec Maigret, Sherlock, WhatsMyName et OpenOSINT.',
  },
  'identifiers.addresses.title': { en: 'Addresses', fr: 'Adresses' },
  'identifiers.addresses.description': {
    en: 'Capture residential or mailing addresses only when necessary for authorised privacy workflows.',
    fr: 'N’enregistrez des adresses postales ou de résidence que lorsque cela est nécessaire à des démarches autorisées de protection de la vie privée.',
  },

  'identifiers.type.email': { en: 'Email', fr: 'E-mail' },
  'identifiers.type.phone': { en: 'Phone', fr: 'Téléphone' },
  'identifiers.type.username': { en: 'Username', fr: 'Pseudonyme' },
  'identifiers.type.name': { en: 'Name', fr: 'Nom' },
  'identifiers.type.address': { en: 'Address', fr: 'Adresse' },
  'identifiers.type.domain': { en: 'Domain', fr: 'Domaine' },

  'identifiers.add.all': { en: 'Add identifier', fr: 'Ajouter un identifiant' },
  'identifiers.add.email': { en: 'Add email', fr: 'Ajouter un e-mail' },
  'identifiers.add.phone': { en: 'Add phone', fr: 'Ajouter un téléphone' },
  'identifiers.add.username': { en: 'Add username', fr: 'Ajouter un pseudonyme' },
  'identifiers.add.name': { en: 'Add name', fr: 'Ajouter un nom' },
  'identifiers.add.address': { en: 'Add address', fr: 'Ajouter une adresse' },
  'identifiers.add.domain': { en: 'Add domain', fr: 'Ajouter un domaine' },

  'identifiers.edit.email': { en: 'Edit email', fr: 'Modifier l’e-mail' },
  'identifiers.edit.phone': { en: 'Edit phone', fr: 'Modifier le téléphone' },
  'identifiers.edit.username': { en: 'Edit username', fr: 'Modifier le pseudonyme' },
  'identifiers.edit.name': { en: 'Edit name', fr: 'Modifier le nom' },
  'identifiers.edit.address': { en: 'Edit address', fr: 'Modifier l’adresse' },
  'identifiers.edit.domain': { en: 'Edit domain', fr: 'Modifier le domaine' },

  'identifiers.loading.all': { en: 'Loading identifiers…', fr: 'Chargement des identifiants…' },
  'identifiers.loading.email': { en: 'Loading emails…', fr: 'Chargement des e-mails…' },
  'identifiers.loading.phone': { en: 'Loading phones…', fr: 'Chargement des téléphones…' },
  'identifiers.loading.username': { en: 'Loading usernames…', fr: 'Chargement des pseudonymes…' },
  'identifiers.loading.name': { en: 'Loading names…', fr: 'Chargement des noms…' },
  'identifiers.loading.address': { en: 'Loading addresses…', fr: 'Chargement des adresses…' },
  'identifiers.loading.domain': { en: 'Loading domains…', fr: 'Chargement des domaines…' },

  'identifiers.empty.all': { en: 'No identifiers yet', fr: 'Aucun identifiant pour le moment' },
  'identifiers.empty.email': { en: 'No emails yet', fr: 'Aucun e-mail pour le moment' },
  'identifiers.empty.phone': { en: 'No phones yet', fr: 'Aucun téléphone pour le moment' },
  'identifiers.empty.username': { en: 'No usernames yet', fr: 'Aucun pseudonyme pour le moment' },
  'identifiers.empty.name': { en: 'No names yet', fr: 'Aucun nom pour le moment' },
  'identifiers.empty.address': { en: 'No addresses yet', fr: 'Aucune adresse pour le moment' },
  'identifiers.empty.domain': { en: 'No domains yet', fr: 'Aucun domaine pour le moment' },
  'identifiers.emptyDescription': {
    en: 'Create your first record to begin tracking this identity.',
    fr: 'Créez un premier enregistrement pour commencer le suivi de cette identité.',
  },

  'identifiers.highlySensitive': { en: 'Highly Sensitive', fr: 'Très sensible' },
  'identifiers.banner.authorizationRequired': {
    en: 'I own this identity or I have explicit written authorisation to audit it must be acknowledged before running username scans.',
    fr: 'La mention « Je suis propriétaire de cette identité ou je dispose d’une autorisation écrite explicite pour l’auditer » doit être validée avant de lancer des analyses de pseudonymes.',
  },
  'identifiers.banner.sensitiveAddresses': {
    en: 'Address data is highly sensitive. Record only what is necessary and verify authorisation before storing it.',
    fr: 'Les données d’adresse sont très sensibles. N’enregistrez que le strict nécessaire et vérifiez l’autorisation avant toute conservation.',
  },

  'identifiers.scan.launch': { en: 'Launch {tool}', fr: 'Lancer {tool}' },
  'identifiers.scan.authorizationRequired': {
    en: 'Authorization acknowledgement is required before running username scans.',
    fr: 'La reconnaissance d’autorisation est requise avant de lancer des analyses de pseudonymes.',
  },

  'identifiers.field.subtype': { en: 'Subtype', fr: 'Sous-type' },
  'identifiers.field.countryHint': { en: 'Country hint', fr: 'Indication de pays' },
  'identifiers.field.countryHintHelp': { en: 'ISO country code', fr: 'Code pays ISO' },
  'identifiers.field.validFrom': { en: 'Valid from', fr: 'Valide à partir du' },
  'identifiers.field.validTo': { en: 'Valid to', fr: 'Valide jusqu’au' },
  'identifiers.field.attributes': { en: 'Attributes JSON', fr: 'JSON d’attributs' },
  'identifiers.field.attributesHint': {
    en: 'Optional extra metadata as a JSON object.',
    fr: 'Métadonnées supplémentaires facultatives, sous forme d’objet JSON.',
  },

  'identifiers.toast.valueRequired.title': { en: 'Value required', fr: 'Valeur requise' },
  'identifiers.toast.valueRequired.description': {
    en: 'Enter a non-empty identifier value.',
    fr: 'Saisissez une valeur d’identifiant non vide.',
  },
  'identifiers.toast.invalidEmail.title': { en: 'Invalid email format', fr: 'Format d’e-mail invalide' },
  'identifiers.toast.invalidEmail.description': {
    en: 'Use a valid email address before saving.',
    fr: 'Utilisez une adresse e-mail valide avant d’enregistrer.',
  },
  'identifiers.toast.updated': { en: 'Identifier updated', fr: 'Identifiant mis à jour' },
  'identifiers.toast.created': { en: 'Identifier created', fr: 'Identifiant créé' },
  'identifiers.toast.saveFailed': { en: 'Unable to save identifier', fr: 'Impossible d’enregistrer l’identifiant' },
  'identifiers.toast.deleted': { en: 'Identifier deleted', fr: 'Identifiant supprimé' },
  'identifiers.toast.deleteFailed': { en: 'Unable to delete identifier', fr: 'Impossible de supprimer l’identifiant' },
  'identifiers.toast.scanQueued.title': { en: '{tool} scan queued', fr: 'Analyse {tool} mise en file d’attente' },
  'identifiers.toast.scanQueued.description': {
    en: 'Queued a username scan for {target}.',
    fr: 'Analyse de pseudonyme mise en file d’attente pour {target}.',
  },
  'identifiers.toast.scanFailed': { en: 'Unable to queue scan', fr: 'Impossible de mettre l’analyse en file d’attente' },

  'identifiers.delete.title': { en: 'Delete identifier', fr: 'Supprimer l’identifiant' },
  'identifiers.delete.description': {
    en: 'Remove {value} from this identity?',
    fr: 'Retirer {value} de cette identité ?',
  },

  'identifiers.professional.title': { en: 'Professional history', fr: 'Parcours professionnel' },
  'identifiers.professional.descriptionFull': {
    en: 'Track companies, roles, domains, and professional profiles tied to the active identity.',
    fr: 'Suivez les entreprises, les postes, les domaines et les profils professionnels liés à l’identité active.',
  },
  'identifiers.professional.description': {
    en: 'Track employers, roles, websites, and professional domains.',
    fr: 'Suivez les employeurs, les postes, les sites web et les domaines professionnels.',
  },
  'identifiers.professional.add': { en: 'Add role', fr: 'Ajouter un poste' },
  'identifiers.professional.loading': {
    en: 'Loading professional history…',
    fr: 'Chargement du parcours professionnel…',
  },
  'identifiers.professional.emptyTitle': {
    en: 'No professional history yet',
    fr: 'Aucun parcours professionnel pour le moment',
  },
  'identifiers.professional.emptyDescription': {
    en: 'Add the first company or role to enrich the identity profile.',
    fr: 'Ajoutez une première entreprise ou un premier poste pour enrichir le profil d’identité.',
  },
  'identifiers.professional.company': { en: 'Company', fr: 'Entreprise' },
  'identifiers.professional.position': { en: 'Position', fr: 'Poste' },
  'identifiers.professional.domain': { en: 'Domain', fr: 'Domaine' },
  'identifiers.professional.timeline': { en: 'Timeline', fr: 'Période' },
  'identifiers.professional.dates': { en: 'Dates', fr: 'Dates' },
  'identifiers.professional.former': { en: 'Former', fr: 'Ancien' },
  'identifiers.professional.current': { en: 'Current', fr: 'Actuel' },
  'identifiers.professional.editRole': { en: 'Edit professional role', fr: 'Modifier le poste professionnel' },
  'identifiers.professional.addRole': { en: 'Add professional role', fr: 'Ajouter un poste professionnel' },
  'identifiers.professional.createRole': { en: 'Create role', fr: 'Créer le poste' },
  'identifiers.professional.field.website': { en: 'Website', fr: 'Site web' },
  'identifiers.professional.field.profileUrl': {
    en: 'Professional profile URL',
    fr: 'URL du profil professionnel',
  },
  'identifiers.professional.field.domain': { en: 'Professional domain', fr: 'Domaine professionnel' },
  'identifiers.professional.field.formerRole': { en: 'Former role', fr: 'Poste précédent' },
  'identifiers.professional.toast.nameRequired': {
    en: 'Company name required',
    fr: 'Nom de l’entreprise requis',
  },
  'identifiers.professional.toast.updated': { en: 'Company updated', fr: 'Entreprise mise à jour' },
  'identifiers.professional.toast.created': { en: 'Company created', fr: 'Entreprise créée' },
  'identifiers.professional.toast.saveFailed': {
    en: 'Unable to save company',
    fr: 'Impossible d’enregistrer l’entreprise',
  },
  'identifiers.professional.toast.removed': { en: 'Company removed', fr: 'Entreprise supprimée' },
  'identifiers.professional.toast.deleteFailed': {
    en: 'Unable to delete company',
    fr: 'Impossible de supprimer l’entreprise',
  },
  'identifiers.professional.delete.title': {
    en: 'Delete professional role',
    fr: 'Supprimer le poste professionnel',
  },
  'identifiers.professional.delete.description': {
    en: 'Remove this company record from the identity?',
    fr: 'Retirer cet enregistrement d’entreprise de l’identité ?',
  },
} as const satisfies MessageMap
