import type { MessageMap } from '../types'

/** Domains, profiles, photos, and evidence inventory screens. */
export const inventory = {
  'inventory.domains.title': { en: 'Domains', fr: 'Domaines' },
  'inventory.domains.description': {
    en: 'Track domain ownership, validity windows, registrars, and notes.',
    fr: 'Suivez la propriété des domaines, les périodes de validité, les bureaux d’enregistrement et les notes.',
  },
  'inventory.domains.identityDescription': {
    en: 'Track owned or associated domains for the active identity.',
    fr: 'Suivez les domaines détenus ou associés à l’identité active.',
  },
  'inventory.domains.add': { en: 'Add domain', fr: 'Ajouter un domaine' },
  'inventory.domains.create': { en: 'Create domain', fr: 'Créer le domaine' },
  'inventory.domains.edit': { en: 'Edit domain', fr: 'Modifier le domaine' },
  'inventory.domains.loading': { en: 'Loading domains…', fr: 'Chargement des domaines…' },
  'inventory.domains.emptyTitle': { en: 'No domains yet', fr: 'Aucun domaine' },
  'inventory.domains.emptyDescription': {
    en: 'Add domains owned or used by the identity.',
    fr: 'Ajoutez les domaines détenus ou utilisés par l’identité.',
  },
  'inventory.domains.domain': { en: 'Domain', fr: 'Domaine' },
  'inventory.domains.owner': { en: 'Owner', fr: 'Propriétaire' },
  'inventory.domains.knownOwner': { en: 'Known owner', fr: 'Propriétaire connu' },
  'inventory.domains.registrar': { en: 'Registrar', fr: 'Bureau d’enregistrement' },
  'inventory.domains.validity': { en: 'Validity', fr: 'Validité' },
  'inventory.domains.validFrom': { en: 'Valid from', fr: 'Valide à partir du' },
  'inventory.domains.validTo': { en: 'Valid to', fr: 'Valide jusqu’au' },
  'inventory.domains.domainRequired': { en: 'Domain is required', fr: 'Le domaine est obligatoire' },
  'inventory.domains.created': { en: 'Domain created', fr: 'Domaine créé' },
  'inventory.domains.updated': { en: 'Domain updated', fr: 'Domaine mis à jour' },
  'inventory.domains.saveFailed': {
    en: 'Unable to save domain',
    fr: 'Impossible d’enregistrer le domaine',
  },
  'inventory.domains.deleted': { en: 'Domain deleted', fr: 'Domaine supprimé' },
  'inventory.domains.deleteFailed': {
    en: 'Unable to delete domain',
    fr: 'Impossible de supprimer le domaine',
  },
  'inventory.domains.deleteTitle': { en: 'Delete domain', fr: 'Supprimer le domaine' },
  'inventory.domains.deleteConfirm': {
    en: 'Delete this domain record?',
    fr: 'Supprimer cet enregistrement de domaine ?',
  },

  'inventory.profiles.title': { en: 'Profiles', fr: 'Profils' },
  'inventory.profiles.description': {
    en: 'Record known public or private profiles tied to the active identity.',
    fr: 'Recensez les profils publics ou privés connus, liés à l’identité active.',
  },
  'inventory.profiles.identityDescription': {
    en: 'Track platform profiles and visibility for the active identity.',
    fr: 'Suivez les profils de plateformes et leur visibilité pour l’identité active.',
  },
  'inventory.profiles.add': { en: 'Add profile', fr: 'Ajouter un profil' },
  'inventory.profiles.create': { en: 'Create profile', fr: 'Créer le profil' },
  'inventory.profiles.edit': { en: 'Edit profile', fr: 'Modifier le profil' },
  'inventory.profiles.loading': { en: 'Loading profiles…', fr: 'Chargement des profils…' },
  'inventory.profiles.emptyTitle': { en: 'No profiles yet', fr: 'Aucun profil' },
  'inventory.profiles.emptyDescription': {
    en: 'Create a profile record to track public handles and URLs.',
    fr: 'Créez un profil pour suivre les identifiants publics et les URL.',
  },
  'inventory.profiles.platform': { en: 'Platform', fr: 'Plateforme' },
  'inventory.profiles.username': { en: 'Username', fr: 'Nom d’utilisateur' },
  'inventory.profiles.url': { en: 'URL', fr: 'URL' },
  'inventory.profiles.public': { en: 'Public', fr: 'Public' },
  'inventory.profiles.private': { en: 'Private', fr: 'Privé' },
  'inventory.profiles.platformRequired': {
    en: 'Platform is required',
    fr: 'La plateforme est obligatoire',
  },
  'inventory.profiles.created': { en: 'Profile created', fr: 'Profil créé' },
  'inventory.profiles.updated': { en: 'Profile updated', fr: 'Profil mis à jour' },
  'inventory.profiles.saveFailed': {
    en: 'Unable to save profile',
    fr: 'Impossible d’enregistrer le profil',
  },
  'inventory.profiles.deleted': { en: 'Profile deleted', fr: 'Profil supprimé' },
  'inventory.profiles.deleteFailed': {
    en: 'Unable to delete profile',
    fr: 'Impossible de supprimer le profil',
  },
  'inventory.profiles.deleteTitle': { en: 'Delete profile', fr: 'Supprimer le profil' },
  'inventory.profiles.deleteConfirm': {
    en: 'Delete this profile record?',
    fr: 'Supprimer cet enregistrement de profil ?',
  },

  'inventory.photos.title': { en: 'Photos and avatars', fr: 'Photos et avatars' },
  'inventory.photos.description': {
    en: 'Upload files and track metadata like source, platform, and hashes.',
    fr: 'Téléversez des fichiers et suivez leurs métadonnées : source, plateforme et empreintes.',
  },
  'inventory.photos.identityDescription': {
    en: 'Upload reference photos, avatars, and metadata for the active identity.',
    fr: 'Téléversez des photos de référence, des avatars et leurs métadonnées pour l’identité active.',
  },
  'inventory.photos.uploadTitle': { en: 'Upload photos', fr: 'Téléverser des photos' },
  'inventory.photos.uploadDescription': {
    en: 'Attach one or more files with optional platform and source metadata.',
    fr: 'Joignez un ou plusieurs fichiers avec, si besoin, la plateforme et la source.',
  },
  'inventory.photos.files': { en: 'Files', fr: 'Fichiers' },
  'inventory.photos.platform': { en: 'Platform', fr: 'Plateforme' },
  'inventory.photos.uploadSelected': {
    en: 'Upload selected photos',
    fr: 'Téléverser les photos sélectionnées',
  },
  'inventory.photos.loading': { en: 'Loading photos…', fr: 'Chargement des photos…' },
  'inventory.photos.emptyTitle': { en: 'No photos yet', fr: 'Aucune photo' },
  'inventory.photos.emptyDescription': {
    en: 'Upload reference images or avatars to document this identity.',
    fr: 'Téléversez des images de référence ou des avatars pour documenter cette identité.',
  },
  'inventory.photos.filename': { en: 'Filename', fr: 'Nom du fichier' },
  'inventory.photos.size': { en: 'Size', fr: 'Taille' },
  'inventory.photos.bytes': { en: '{size} bytes', fr: '{size} octets' },
  'inventory.photos.selectFiles': {
    en: 'Select one or more files first',
    fr: 'Sélectionnez d’abord un ou plusieurs fichiers',
  },
  'inventory.photos.uploadComplete': {
    en: 'Photo upload complete',
    fr: 'Téléversement des photos terminé',
  },
  'inventory.photos.uploadFailed': {
    en: 'Unable to upload photos',
    fr: 'Impossible de téléverser les photos',
  },
  'inventory.photos.deleted': { en: 'Photo deleted', fr: 'Photo supprimée' },
  'inventory.photos.deleteFailed': {
    en: 'Unable to delete photo',
    fr: 'Impossible de supprimer la photo',
  },
  'inventory.photos.deleteTitle': { en: 'Delete photo', fr: 'Supprimer la photo' },
  'inventory.photos.deleteConfirm': { en: 'Delete {filename}?', fr: 'Supprimer {filename} ?' },

  'inventory.evidence.title': { en: 'Evidence', fr: 'Preuves' },
  'inventory.evidence.description': {
    en: 'Browse findings and inspect associated screenshots, HTML captures, hashes, and metadata.',
    fr: 'Parcourez les résultats et examinez les captures d’écran, les captures HTML, les empreintes et les métadonnées associées.',
  },
  'inventory.evidence.identityDescription': {
    en: 'Inspect evidence captured for findings associated with the active identity.',
    fr: 'Examinez les preuves collectées pour les résultats liés à l’identité active.',
  },
  'inventory.evidence.findingsTitle': { en: 'Findings', fr: 'Résultats' },
  'inventory.evidence.findingsDescription': {
    en: 'Choose a finding to inspect evidence.',
    fr: 'Choisissez un résultat pour examiner ses preuves.',
  },
  'inventory.evidence.noFindings': { en: 'No findings available.', fr: 'Aucun résultat disponible.' },
  'inventory.evidence.loadingFindings': {
    en: 'Loading findings…',
    fr: 'Chargement des résultats…',
  },
  'inventory.evidence.forFinding': { en: 'Evidence for {title}', fr: 'Preuves pour {title}' },
  'inventory.evidence.detailsTitle': { en: 'Evidence details', fr: 'Détail des preuves' },
  'inventory.evidence.selectFinding': {
    en: 'Select a finding first.',
    fr: 'Sélectionnez d’abord un résultat.',
  },
  'inventory.evidence.loadingEvidence': { en: 'Loading evidence…', fr: 'Chargement des preuves…' },
  'inventory.evidence.noEvidence': {
    en: 'No evidence recorded for this finding.',
    fr: 'Aucune preuve enregistrée pour ce résultat.',
  },
  'inventory.evidence.record': { en: 'Evidence record', fr: 'Enregistrement de preuve' },
  'inventory.evidence.screenshotPath': {
    en: 'Screenshot path: {value}',
    fr: 'Chemin de la capture d’écran : {value}',
  },
  'inventory.evidence.htmlPath': { en: 'HTML path: {value}', fr: 'Chemin du fichier HTML : {value}' },
  'inventory.evidence.contentHash': {
    en: 'Content hash: {value}',
    fr: 'Empreinte du contenu : {value}',
  },
} as const satisfies MessageMap
