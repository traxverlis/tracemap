import type { MessageMap } from '../types'

/** Login and first-run bootstrap screens. */
export const auth = {
  'login.title': {
    en: 'Sign in to Digital Identity Manager',
    fr: 'Connexion à Digital Identity Manager',
  },
  'login.description': {
    en: 'Authenticate with your local DIM credentials to manage identities, scans, and privacy workflows.',
    fr: 'Authentifiez-vous avec vos identifiants DIM locaux pour gérer vos identités, vos analyses et vos démarches de confidentialité.',
  },
  'login.email': { en: 'Email', fr: 'E-mail' },
  'login.password': { en: 'Password', fr: 'Mot de passe' },
  'login.submit': { en: 'Sign in', fr: 'Se connecter' },
  'login.apiHealth': { en: 'API health: {status}', fr: 'État de l’API : {status}' },
  'login.apiHealthChecking': { en: 'checking…', fr: 'vérification…' },
  'login.welcomeBack': { en: 'Welcome back', fr: 'Content de vous revoir' },
  'login.failed': { en: 'Login failed', fr: 'Échec de la connexion' },

  'bootstrap.title': { en: 'Initial bootstrap required', fr: 'Initialisation requise' },
  'bootstrap.description': {
    en: 'Create the first DIM administrator account. Local passwords must be at least 12 characters long.',
    fr: 'Créez le premier compte administrateur DIM. Les mots de passe locaux doivent comporter au moins 12 caractères.',
  },
  'bootstrap.displayName': { en: 'Display name', fr: 'Nom affiché' },
  'bootstrap.confirmPassword': { en: 'Confirm password', fr: 'Confirmer le mot de passe' },
  'bootstrap.passwordHint': { en: 'At least 12 characters', fr: 'Au moins 12 caractères' },
  'bootstrap.submit': { en: 'Create administrator', fr: 'Créer l’administrateur' },
  'bootstrap.passwordsMustMatch': {
    en: 'Passwords must match.',
    fr: 'Les mots de passe doivent être identiques.',
  },
  'bootstrap.passwordTooShort': {
    en: 'Password must be at least 12 characters long.',
    fr: 'Le mot de passe doit comporter au moins 12 caractères.',
  },
  'bootstrap.complete': { en: 'Bootstrap complete', fr: 'Initialisation terminée' },
  'bootstrap.completeDescription': {
    en: 'Your administrator account is ready.',
    fr: 'Votre compte administrateur est prêt.',
  },
  'bootstrap.failed': { en: 'Bootstrap failed', fr: 'Échec de l’initialisation' },
} as const satisfies MessageMap
