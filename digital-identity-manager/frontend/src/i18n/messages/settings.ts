import type { MessageMap } from '../types'

/** Environment settings, tool inventory, password change, and destructive actions. */
export const settings = {
  'settings.title': { en: 'Settings', fr: 'Paramètres' },
  'settings.description': {
    en: 'Inspect DIM environment settings, AI status, theme preferences, exports, and destructive actions.',
    fr: 'Consultez les paramètres d’environnement de DIM, l’état de l’IA, les préférences de thème, les exports et les actions destructrices.',
  },
  'settings.loading': { en: 'Loading settings…', fr: 'Chargement des paramètres…' },
  'settings.aiWarning': {
    en: 'AI is optional and disabled by default. Review minimisation controls before enabling any provider-backed workflows.',
    fr: 'L’IA est facultative et désactivée par défaut. Vérifiez les contrôles de minimisation avant d’activer un traitement reposant sur un fournisseur.',
  },
  'settings.unknown': { en: 'unknown', fr: 'inconnu' },

  'settings.environment.title': { en: 'Environment', fr: 'Environnement' },
  'settings.environment.description': {
    en: 'Current environment: {environment}',
    fr: 'Environnement actuel : {environment}',
  },

  'settings.ai.provider': { en: 'AI provider', fr: 'Fournisseur d’IA' },
  'settings.ai.model': { en: 'Model: {model}', fr: 'Modèle : {model}' },
  'settings.ai.modelNone': { en: 'None configured', fr: 'Aucun configuré' },
  'settings.ai.capabilities': {
    en: 'Capabilities: {capabilities}',
    fr: 'Capacités : {capabilities}',
  },
  'settings.ai.capabilitiesNone': { en: 'None', fr: 'Aucune' },
  'settings.ai.allowAddresses': { en: 'Allow addresses', fr: 'Autoriser les adresses' },
  'settings.ai.allowPhoneNumbers': {
    en: 'Allow phone numbers',
    fr: 'Autoriser les numéros de téléphone',
  },
  'settings.ai.allowFullEmails': {
    en: 'Allow full emails',
    fr: 'Autoriser les adresses e-mail complètes',
  },

  'settings.theme.button': { en: 'Theme: {theme}', fr: 'Thème : {theme}' },
  'settings.theme.dark': { en: 'dark', fr: 'sombre' },
  'settings.theme.light': { en: 'light', fr: 'clair' },
  'settings.export.button': { en: 'Export data', fr: 'Exporter les données' },

  'settings.tools.title': { en: 'Configured tools', fr: 'Outils configurés' },
  'settings.tools.description': {
    en: 'Evidence directory: {evidenceDir} · Reports directory: {reportsDir}',
    fr: 'Répertoire des preuves : {evidenceDir} · Répertoire des rapports : {reportsDir}',
  },
  'settings.tools.enabled': { en: 'Enabled', fr: 'Activé' },
  'settings.tools.disabled': { en: 'Disabled', fr: 'Désactivé' },
  'settings.tools.scanTypes': {
    en: 'Scan types: {scanTypes}',
    fr: 'Types d’analyse : {scanTypes}',
  },
  'settings.tools.scanTypesNone': { en: 'None', fr: 'Aucun' },
  'settings.tools.requires': { en: 'Requires: {requires}', fr: 'Prérequis : {requires}' },
  'settings.tools.requiresNone': {
    en: 'No extra requirements',
    fr: 'Aucun prérequis supplémentaire',
  },

  'settings.password.title': { en: 'Change password', fr: 'Changer le mot de passe' },
  'settings.password.description': {
    en: 'Local authentication only. New passwords must satisfy backend policy.',
    fr: 'Authentification locale uniquement. Les nouveaux mots de passe doivent respecter la politique du backend.',
  },
  'settings.password.current': { en: 'Current password', fr: 'Mot de passe actuel' },
  'settings.password.new': { en: 'New password', fr: 'Nouveau mot de passe' },
  'settings.password.submit': { en: 'Change password', fr: 'Changer le mot de passe' },

  'settings.danger.title': { en: 'Danger zone', fr: 'Zone dangereuse' },
  'settings.danger.description': {
    en: 'Type ERASE to confirm a destructive delete request for the active identity or the full account scope if none is selected.',
    fr: 'Saisissez ERASE pour confirmer une suppression définitive portant sur l’identité active, ou sur l’ensemble du compte si aucune identité n’est sélectionnée.',
  },
  'settings.danger.confirmLabel': { en: 'Confirmation text', fr: 'Texte de confirmation' },
  'settings.danger.confirmHint': {
    en: 'Must exactly match ERASE.',
    fr: 'Doit correspondre exactement à ERASE.',
  },
  'settings.danger.erase': { en: 'Erase all my data', fr: 'Effacer toutes mes données' },

  'settings.toast.exportReady': { en: 'Export ready', fr: 'Export prêt' },
  'settings.toast.exportFailed': { en: 'Export failed', fr: 'Échec de l’export' },
  'settings.toast.eraseCompleted': {
    en: 'Erase request completed',
    fr: 'Demande d’effacement traitée',
  },
  'settings.toast.eraseFailed': {
    en: 'Erase request failed',
    fr: 'Échec de la demande d’effacement',
  },
  'settings.toast.passwordChanged': { en: 'Password changed', fr: 'Mot de passe modifié' },
  'settings.toast.passwordFailed': {
    en: 'Password change failed',
    fr: 'Échec du changement de mot de passe',
  },
} as const satisfies MessageMap
