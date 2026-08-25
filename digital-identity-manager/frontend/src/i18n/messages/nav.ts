import type { MessageMap } from '../types'

/** Sidebar navigation and top bar. */
export const nav = {
  'nav.section.overview': { en: 'Overview', fr: 'Vue d’ensemble' },
  'nav.section.coreData': { en: 'Core data', fr: 'Données de base' },
  'nav.section.investigations': { en: 'Investigations', fr: 'Investigations' },
  'nav.section.system': { en: 'System', fr: 'Système' },

  'nav.dashboard': { en: 'Dashboard', fr: 'Tableau de bord' },
  'nav.identity': { en: 'Identity', fr: 'Identité' },
  'nav.identityWizard': { en: 'Identity wizard', fr: 'Assistant d’identité' },
  'nav.identifiers': { en: 'All identifiers', fr: 'Tous les identifiants' },
  'nav.emails': { en: 'Emails', fr: 'E-mails' },
  'nav.phones': { en: 'Phones', fr: 'Téléphones' },
  'nav.usernames': { en: 'Usernames', fr: 'Pseudonymes' },
  'nav.addresses': { en: 'Addresses', fr: 'Adresses' },
  'nav.professional': { en: 'Professional history', fr: 'Parcours professionnel' },
  'nav.domains': { en: 'Domains', fr: 'Domaines' },
  'nav.profiles': { en: 'Profiles', fr: 'Profils' },
  'nav.photos': { en: 'Photos', fr: 'Photos' },
  'nav.findings': { en: 'Findings', fr: 'Résultats' },
  'nav.relationships': { en: 'Relationships', fr: 'Relations' },
  'nav.dataBrokers': { en: 'Data brokers', fr: 'Courtiers en données' },
  'nav.deletions': { en: 'Deletion requests', fr: 'Demandes de suppression' },
  'nav.scans': { en: 'Scans', fr: 'Analyses' },
  'nav.evidence': { en: 'Evidence', fr: 'Preuves' },
  'nav.settings': { en: 'Settings', fr: 'Paramètres' },

  'topbar.selectIdentity': { en: 'Select active identity', fr: 'Sélectionner l’identité active' },
  'topbar.noIdentities': { en: 'No identities yet', fr: 'Aucune identité' },
  'topbar.refreshIdentities': { en: 'Refresh identities', fr: 'Actualiser les identités' },
  'topbar.newIdentity': { en: 'New identity', fr: 'Nouvelle identité' },
  'topbar.theme': { en: 'Theme: {theme}', fr: 'Thème : {theme}' },
  'topbar.theme.dark': { en: 'dark', fr: 'sombre' },
  'topbar.theme.light': { en: 'light', fr: 'clair' },
  'topbar.logout': { en: 'Log out', fr: 'Se déconnecter' },

  'language.label': { en: 'Language', fr: 'Langue' },
  'language.en': { en: 'English', fr: 'Anglais' },
  'language.fr': { en: 'French', fr: 'Français' },
} as const satisfies MessageMap
