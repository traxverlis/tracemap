/**
 * Shared types for the (dependency-free) internationalisation layer.
 *
 * Every message is declared once, with its English **and** French wording side
 * by side, so a missing translation is a TypeScript error instead of an
 * English string leaking into the French UI.
 */

export const LOCALES = ['en', 'fr'] as const

export type Locale = (typeof LOCALES)[number]

/** A single message, expressed in every supported locale. */
export type Message = Record<Locale, string>

/** A dictionary fragment: message key -> translations. */
export type MessageMap = Record<string, Message>

/** Values that can be interpolated into a message via `{placeholder}`. */
export type TranslationValues = Record<string, string | number>

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}
