import type { MessageMap } from '../types'

/** Data broker catalogue and deletion request workflows. */
export const privacy = {
  'privacy.brokers.title': { en: 'Data brokers', fr: 'Courtiers en données' },
  'privacy.brokers.description': {
    en: 'Catalog data brokers, search URLs, and opt-out workflows without fabricating any URLs or methods.',
    fr: 'Répertoriez les courtiers en données, les URL de recherche et les procédures de désinscription sans inventer d’URL ni de méthode.',
  },
  'privacy.brokers.loading': {
    en: 'Loading data brokers…',
    fr: 'Chargement des courtiers en données…',
  },
  'privacy.brokers.importCatalog': { en: 'Import catalog', fr: 'Importer le catalogue' },
  'privacy.brokers.add': { en: 'Add broker', fr: 'Ajouter un courtier' },

  'privacy.brokers.filters.title': { en: 'Filters', fr: 'Filtres' },
  'privacy.brokers.filters.description': {
    en: 'Search by country, category, or free text.',
    fr: 'Recherchez par pays, catégorie ou texte libre.',
  },
  'privacy.brokers.filters.search': { en: 'Search', fr: 'Recherche' },

  'privacy.brokers.column.optoutUrl': { en: 'Opt-out URL', fr: 'URL de désinscription' },
  'privacy.brokers.column.requires': { en: 'Requires', fr: 'Exigences' },
  'privacy.brokers.column.lastChecked': { en: 'Last checked', fr: 'Dernière vérification' },

  'privacy.brokers.requires.email': { en: 'Email', fr: 'E-mail' },
  'privacy.brokers.requires.phone': { en: 'Phone', fr: 'Téléphone' },
  'privacy.brokers.requires.idDocument': { en: 'ID doc', fr: 'Pièce d’identité' },

  'privacy.brokers.action.createDeletion': { en: 'Create deletion', fr: 'Créer une suppression' },
  'privacy.brokers.action.createDeletionTitle': {
    en: 'Create deletion request',
    fr: 'Créer une demande de suppression',
  },
  'privacy.brokers.action.identityRequiredTitle': {
    en: 'Select an identity first',
    fr: 'Sélectionnez d’abord une identité',
  },

  'privacy.brokers.empty.title': { en: 'No data brokers found', fr: 'Aucun courtier en données trouvé' },
  'privacy.brokers.empty.description': {
    en: 'Create or import the catalog to manage privacy removal workflows.',
    fr: 'Créez ou importez le catalogue pour gérer les procédures de suppression de données.',
  },

  'privacy.brokers.modal.createTitle': { en: 'Add data broker', fr: 'Ajouter un courtier en données' },
  'privacy.brokers.modal.editTitle': {
    en: 'Edit data broker',
    fr: 'Modifier le courtier en données',
  },
  'privacy.brokers.modal.create': { en: 'Create broker', fr: 'Créer le courtier' },

  'privacy.brokers.field.domain': { en: 'Domain', fr: 'Domaine' },
  'privacy.brokers.field.optoutMethod': { en: 'Opt-out method', fr: 'Méthode de désinscription' },
  'privacy.brokers.field.searchUrl': { en: 'Search URL', fr: 'URL de recherche' },
  'privacy.brokers.field.optoutUrl': { en: 'Opt-out URL', fr: 'URL de désinscription' },
  'privacy.brokers.field.optoutUrlHint': {
    en: 'Enter only what is provided by your API or research.',
    fr: 'N’indiquez que ce qui provient de votre API ou de vos recherches.',
  },
  'privacy.brokers.field.requiresEmail': { en: 'Requires email', fr: 'E-mail requis' },
  'privacy.brokers.field.requiresPhone': { en: 'Requires phone', fr: 'Téléphone requis' },
  'privacy.brokers.field.requiresIdDocument': {
    en: 'Requires ID document',
    fr: 'Pièce d’identité requise',
  },
  'privacy.brokers.field.automationPossible': {
    en: 'Automation possible',
    fr: 'Automatisation possible',
  },

  'privacy.brokers.confirmDelete.title': {
    en: 'Delete data broker',
    fr: 'Supprimer le courtier en données',
  },
  'privacy.brokers.confirmDelete.description': {
    en: 'Delete {name} from the catalog?',
    fr: 'Supprimer {name} du catalogue ?',
  },

  'privacy.brokers.toast.nameRequired': { en: 'Broker name required', fr: 'Nom du courtier requis' },
  'privacy.brokers.toast.created': { en: 'Data broker created', fr: 'Courtier en données créé' },
  'privacy.brokers.toast.updated': {
    en: 'Data broker updated',
    fr: 'Courtier en données mis à jour',
  },
  'privacy.brokers.toast.saveFailed': {
    en: 'Unable to save data broker',
    fr: 'Impossible d’enregistrer le courtier en données',
  },
  'privacy.brokers.toast.deleted': { en: 'Data broker deleted', fr: 'Courtier en données supprimé' },
  'privacy.brokers.toast.deleteFailed': {
    en: 'Unable to delete data broker',
    fr: 'Impossible de supprimer le courtier en données',
  },
  'privacy.brokers.toast.identityRequired': {
    en: 'Select an identity first',
    fr: 'Sélectionnez d’abord une identité',
  },
  'privacy.brokers.toast.identityRequiredDescription': {
    en: 'Deletion requests must be associated with an identity.',
    fr: 'Les demandes de suppression doivent être associées à une identité.',
  },
  'privacy.brokers.toast.requestCreated': {
    en: 'Deletion request created',
    fr: 'Demande de suppression créée',
  },
  'privacy.brokers.toast.requestCreatedDescription': {
    en: 'Created a TODO request for {name}.',
    fr: 'Demande créée au statut TODO pour {name}.',
  },
  'privacy.brokers.toast.requestFailed': {
    en: 'Unable to create deletion request',
    fr: 'Impossible de créer la demande de suppression',
  },
  'privacy.brokers.toast.importFinished': {
    en: 'Catalog import finished',
    fr: 'Import du catalogue terminé',
  },
  'privacy.brokers.toast.importFinishedDescription': {
    en: 'Imported {imported}, skipped {skipped}.',
    fr: '{imported} importé(s), {skipped} ignoré(s).',
  },
  'privacy.brokers.toast.importFailed': {
    en: 'Catalog import failed',
    fr: 'Échec de l’import du catalogue',
  },

  'privacy.deletions.title': { en: 'Deletion requests', fr: 'Demandes de suppression' },
  'privacy.deletions.intro': {
    en: 'Track opt-out and erasure workflows by broker and verification status.',
    fr: 'Suivez les procédures de désinscription et d’effacement par courtier et par statut de vérification.',
  },
  'privacy.deletions.description': {
    en: 'Group requests by status and keep confirmation and recheck dates current.',
    fr: 'Regroupez les demandes par statut et tenez à jour les dates de confirmation et de nouvelle vérification.',
  },
  'privacy.deletions.loading': {
    en: 'Loading deletion requests…',
    fr: 'Chargement des demandes de suppression…',
  },
  'privacy.deletions.add': { en: 'Add request', fr: 'Ajouter une demande' },

  'privacy.deletions.filter.title': { en: 'Filter', fr: 'Filtre' },
  'privacy.deletions.filter.description': {
    en: 'Optionally focus on one status.',
    fr: 'Filtrez éventuellement sur un seul statut.',
  },
  'privacy.deletions.filter.allStatuses': { en: 'All statuses', fr: 'Tous les statuts' },

  'privacy.deletions.status.TODO': { en: 'To do', fr: 'À faire' },
  'privacy.deletions.status.REQUESTED': { en: 'Requested', fr: 'Demandée' },
  'privacy.deletions.status.IN_PROGRESS': { en: 'In progress', fr: 'En cours' },
  'privacy.deletions.status.CONFIRMED': { en: 'Confirmed', fr: 'Confirmée' },
  'privacy.deletions.status.REFUSED': { en: 'Refused', fr: 'Refusée' },
  'privacy.deletions.status.REAPPEARED': { en: 'Reappeared', fr: 'Réapparue' },

  'privacy.deletions.empty': { en: 'No items.', fr: 'Aucun élément.' },
  'privacy.deletions.unspecifiedMethod': { en: 'Unspecified method', fr: 'Méthode non précisée' },
  'privacy.deletions.card.requested': { en: 'Requested: {date}', fr: 'Demandée le : {date}' },
  'privacy.deletions.card.verified': { en: 'Verified: {date}', fr: 'Vérifiée le : {date}' },
  'privacy.deletions.card.nextCheck': {
    en: 'Next check: {date}',
    fr: 'Prochaine vérification : {date}',
  },
  'privacy.deletions.card.confirmation': {
    en: 'Confirmation: {value}',
    fr: 'Confirmation : {value}',
  },
  'privacy.deletions.card.confirmationLink': {
    en: 'Confirmation link',
    fr: 'Lien de confirmation',
  },

  'privacy.deletions.modal.createTitle': {
    en: 'Add deletion request',
    fr: 'Ajouter une demande de suppression',
  },
  'privacy.deletions.modal.editTitle': {
    en: 'Edit deletion request',
    fr: 'Modifier la demande de suppression',
  },
  'privacy.deletions.modal.create': { en: 'Create request', fr: 'Créer la demande' },

  'privacy.deletions.field.method': { en: 'Method', fr: 'Méthode' },
  'privacy.deletions.field.brokerId': { en: 'Broker ID', fr: 'Identifiant du courtier' },
  'privacy.deletions.field.findingId': { en: 'Finding ID', fr: 'Identifiant du résultat' },
  'privacy.deletions.field.requestedAt': { en: 'Requested at', fr: 'Date de la demande' },
  'privacy.deletions.field.verifiedAt': { en: 'Verified at', fr: 'Date de vérification' },
  'privacy.deletions.field.nextCheck': { en: 'Next check', fr: 'Prochaine vérification' },
  'privacy.deletions.field.confirmation': { en: 'Confirmation', fr: 'Confirmation' },
  'privacy.deletions.field.confirmationUrl': { en: 'Confirmation URL', fr: 'URL de confirmation' },

  'privacy.deletions.confirmDelete.title': {
    en: 'Delete deletion request',
    fr: 'Supprimer la demande de suppression',
  },
  'privacy.deletions.confirmDelete.description': {
    en: 'Delete this deletion request?',
    fr: 'Supprimer cette demande de suppression ?',
  },

  'privacy.deletions.toast.created': {
    en: 'Deletion request created',
    fr: 'Demande de suppression créée',
  },
  'privacy.deletions.toast.updated': {
    en: 'Deletion request updated',
    fr: 'Demande de suppression mise à jour',
  },
  'privacy.deletions.toast.saveFailed': {
    en: 'Unable to save deletion request',
    fr: 'Impossible d’enregistrer la demande de suppression',
  },
  'privacy.deletions.toast.deleted': {
    en: 'Deletion request deleted',
    fr: 'Demande de suppression supprimée',
  },
  'privacy.deletions.toast.deleteFailed': {
    en: 'Unable to delete deletion request',
    fr: 'Impossible de supprimer la demande de suppression',
  },
} as const satisfies MessageMap
