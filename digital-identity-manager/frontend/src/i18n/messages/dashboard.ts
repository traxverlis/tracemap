import type { MessageMap } from '../types'

/** Dashboard overview: completeness, scanning cadence, counters, timeline. */
export const dashboard = {
  'dashboard.title': { en: 'Dashboard', fr: 'Tableau de bord' },
  'dashboard.description': {
    en: 'See completeness, timeline, and operational counts for the active identity.',
    fr: 'Consultez la complétude, la chronologie et les compteurs opérationnels de l’identité active.',
  },
  'dashboard.overviewFor': {
    en: 'Operational overview for {identity}.',
    fr: 'Vue d’ensemble opérationnelle pour {identity}.',
  },
  'dashboard.activeIdentityFallback': { en: 'the active identity', fr: 'l’identité active' },
  'dashboard.loadingIdentities': { en: 'Loading identities…', fr: 'Chargement des identités…' },
  'dashboard.loadingSummary': {
    en: 'Loading dashboard summary…',
    fr: 'Chargement du résumé du tableau de bord…',
  },

  'dashboard.completeness.title': { en: 'Completeness score', fr: 'Score de complétude' },
  'dashboard.completeness.fallbackDescription': {
    en: 'Coverage overview',
    fr: 'Aperçu de la couverture',
  },
  'dashboard.completeness.ringLabel': { en: 'Completeness', fr: 'Complétude' },

  'dashboard.cadence.title': { en: 'Scanning cadence', fr: 'Cadence des analyses' },
  'dashboard.cadence.description': {
    en: 'Latest activity and upcoming scheduled scans.',
    fr: 'Dernière activité et prochaines analyses planifiées.',
  },
  'dashboard.cadence.lastScan': { en: 'Last scan', fr: 'Dernière analyse' },
  'dashboard.cadence.noLastScan': {
    en: 'No completed scan yet.',
    fr: 'Aucune analyse terminée pour le moment.',
  },
  'dashboard.cadence.nextScans': {
    en: 'Next scheduled scans',
    fr: 'Prochaines analyses planifiées',
  },
  'dashboard.cadence.noNextScans': { en: 'No scheduled scans.', fr: 'Aucune analyse planifiée.' },

  'dashboard.stat.identifiers': { en: 'Identifiers', fr: 'Identifiants' },
  'dashboard.stat.emails': { en: 'Emails', fr: 'E-mails' },
  'dashboard.stat.phones': { en: 'Phones', fr: 'Téléphones' },
  'dashboard.stat.usernames': { en: 'Usernames', fr: 'Pseudonymes' },
  'dashboard.stat.addresses': { en: 'Addresses', fr: 'Adresses' },
  'dashboard.stat.profiles': { en: 'Profiles', fr: 'Profils' },
  'dashboard.stat.accountsFound': { en: 'Accounts found', fr: 'Comptes détectés' },
  'dashboard.stat.relationshipsConfirmed': {
    en: 'Relationships confirmed',
    fr: 'Relations confirmées',
  },
  'dashboard.stat.relationshipsToReview': {
    en: 'Relationships to review',
    fr: 'Relations à examiner',
  },
  'dashboard.stat.dataBrokers': { en: 'Data brokers', fr: 'Courtiers en données' },
  'dashboard.stat.deletionsTodo': { en: 'Deletion TODO', fr: 'Suppressions à traiter' },
  'dashboard.stat.deletionsRequested': { en: 'Deletion requested', fr: 'Suppressions demandées' },
  'dashboard.stat.deletionsConfirmed': { en: 'Deletion confirmed', fr: 'Suppressions confirmées' },
  'dashboard.stat.dataReappeared': { en: 'Data reappeared', fr: 'Données réapparues' },
  'dashboard.stat.breaches': { en: 'Breaches', fr: 'Fuites de données' },

  'dashboard.breakdown.title': { en: 'Completeness breakdown', fr: 'Détail de la complétude' },
  'dashboard.breakdown.description': {
    en: 'Category-level completeness and remaining gaps.',
    fr: 'Complétude par catégorie et lacunes restantes.',
  },
  'dashboard.breakdown.known': { en: 'Known', fr: 'Connus' },
  'dashboard.breakdown.expected': { en: 'Expected', fr: 'Attendus' },
  'dashboard.breakdown.missing': { en: 'Missing', fr: 'Manquants' },
  'dashboard.breakdown.weight': { en: 'Weight', fr: 'Poids' },
  'dashboard.breakdown.ratio': { en: 'Ratio', fr: 'Taux' },

  'dashboard.timeline.title': { en: 'Recent timeline', fr: 'Chronologie récente' },
  'dashboard.timeline.description': {
    en: 'The latest events recorded for this identity.',
    fr: 'Les derniers événements enregistrés pour cette identité.',
  },
  'dashboard.timeline.empty': {
    en: 'No timeline entries yet.',
    fr: 'Aucun événement enregistré pour le moment.',
  },
} as const satisfies MessageMap
