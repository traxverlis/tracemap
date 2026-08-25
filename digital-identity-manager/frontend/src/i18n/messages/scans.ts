import type { MessageMap } from '../types'

/** Scan launcher, history, and raw result promotion. */
export const scans = {
  'scans.title': { en: 'Scans', fr: 'Analyses' },
  'scans.intro': {
    en: 'Launch scans, inspect raw results, and promote selected findings or accounts.',
    fr: 'Lancez des analyses, examinez les résultats bruts et promouvez les résultats ou comptes sélectionnés.',
  },
  'scans.description': {
    en: 'Launch scans against configured tools, inspect raw output, and promote selected results.',
    fr: 'Lancez des analyses avec les outils configurés, examinez la sortie brute et promouvez les résultats sélectionnés.',
  },
  'scans.loading': {
    en: 'Loading scan history…',
    fr: 'Chargement de l’historique des analyses…',
  },

  'scans.launch.title': { en: 'Launch a scan', fr: 'Lancer une analyse' },
  'scans.launch.description': {
    en: 'Choose an enabled tool, scan type, target, and optional JSON parameters.',
    fr: 'Choisissez un outil activé, un type d’analyse, une cible et, si besoin, des paramètres JSON.',
  },
  'scans.launch.submit': { en: 'Launch scan', fr: 'Lancer l’analyse' },

  'scans.field.tool': { en: 'Tool', fr: 'Outil' },
  'scans.field.scanType': { en: 'Scan type', fr: 'Type d’analyse' },
  'scans.field.target': { en: 'Target', fr: 'Cible' },
  'scans.field.parameters': { en: 'Parameters JSON', fr: 'Paramètres JSON' },

  'scans.tool.placeholder': { en: 'Select a tool', fr: 'Sélectionnez un outil' },
  'scans.tool.disabledSuffix': { en: ' (disabled)', fr: ' (désactivé)' },

  'scans.scanType.username': { en: 'Username', fr: 'Pseudonyme' },
  'scans.scanType.email': { en: 'Email', fr: 'E-mail' },
  'scans.scanType.domain': { en: 'Domain', fr: 'Domaine' },
  'scans.scanType.breach': { en: 'Breach', fr: 'Fuite de données' },

  'scans.status.PENDING': { en: 'Pending', fr: 'En attente' },
  'scans.status.RUNNING': { en: 'Running', fr: 'En cours' },
  'scans.status.COMPLETED': { en: 'Completed', fr: 'Terminée' },
  'scans.status.FAILED': { en: 'Failed', fr: 'Échouée' },
  'scans.status.CANCELLED': { en: 'Cancelled', fr: 'Annulée' },

  'scans.history.title': { en: 'Scan history', fr: 'Historique des analyses' },
  'scans.history.description': {
    en: 'Click a scan to inspect its raw results.',
    fr: 'Cliquez sur une analyse pour consulter ses résultats bruts.',
  },
  'scans.history.empty': { en: 'No scans yet.', fr: 'Aucune analyse pour l’instant.' },

  'scans.details.title': { en: 'Scan details', fr: 'Détails de l’analyse' },
  'scans.details.resultsTitle': { en: '{tool} results', fr: 'Résultats de {tool}' },
  'scans.details.placeholder': {
    en: 'Select a scan from the history list.',
    fr: 'Sélectionnez une analyse dans l’historique.',
  },
  'scans.details.empty': {
    en: 'Select a scan to inspect details.',
    fr: 'Sélectionnez une analyse pour afficher ses détails.',
  },
  'scans.details.started': { en: 'Started {date}', fr: 'Démarrée le {date}' },
  'scans.details.finished': { en: 'Finished {date}', fr: 'Terminée le {date}' },

  'scans.results.loading': {
    en: 'Loading scan results…',
    fr: 'Chargement des résultats de l’analyse…',
  },
  'scans.results.refresh': { en: 'Refresh results', fr: 'Actualiser les résultats' },
  'scans.results.promote': {
    en: 'Promote selected results',
    fr: 'Promouvoir les résultats sélectionnés',
  },
  'scans.results.select': { en: 'Select', fr: 'Sélection' },
  'scans.results.url': { en: 'URL', fr: 'URL' },
  'scans.results.empty': { en: 'No raw results yet.', fr: 'Aucun résultat brut pour l’instant.' },

  'scans.toast.targetRequired': {
    en: 'Tool and target are required',
    fr: 'L’outil et la cible sont obligatoires',
  },
  'scans.toast.queued': { en: 'Scan queued', fr: 'Analyse mise en file d’attente' },
  'scans.toast.queuedDescription': {
    en: '{tool} {scanType} scan queued.',
    fr: 'Analyse {scanType} avec {tool} mise en file d’attente.',
  },
  'scans.toast.launchFailed': {
    en: 'Unable to launch scan',
    fr: 'Impossible de lancer l’analyse',
  },
  'scans.toast.selectResult': {
    en: 'Select at least one result',
    fr: 'Sélectionnez au moins un résultat',
  },
  'scans.toast.promoted': { en: 'Results promoted', fr: 'Résultats promus' },
  'scans.toast.promotedDescription': {
    en: 'Accounts: {accounts}, findings: {findings}.',
    fr: 'Comptes : {accounts}, résultats : {findings}.',
  },
  'scans.toast.promoteFailed': {
    en: 'Unable to promote results',
    fr: 'Impossible de promouvoir les résultats',
  },
  'scans.toast.cancelled': { en: 'Scan cancelled', fr: 'Analyse annulée' },
  'scans.toast.cancelFailed': {
    en: 'Unable to cancel scan',
    fr: 'Impossible d’annuler l’analyse',
  },
} as const satisfies MessageMap
