import type { Locale } from './types'

/**
 * The locale currently rendered by the application.
 *
 * React components read it through {@link useI18n}; this module-level mirror
 * exists so that plain helper functions (date formatting, error messages)
 * stay locale-aware without threading the locale through every call site.
 * ``I18nProvider`` keeps it in sync, and because a locale change re-renders
 * the whole tree, formatting helpers always run with the up-to-date value.
 */
let activeLocale: Locale = 'en'

export function getActiveLocale(): Locale {
  return activeLocale
}

export function setActiveLocale(locale: Locale): void {
  activeLocale = locale
}
