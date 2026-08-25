import { messages, type TranslationKey } from './messages'
import type { Locale, TranslationValues } from './types'

const PLACEHOLDER = /\{(\w+)\}/g

/** Replace every `{placeholder}` with the matching value. */
function interpolate(template: string, values?: TranslationValues): string {
  if (!values) return template
  return template.replace(PLACEHOLDER, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match,
  )
}

/**
 * Translate `key` into `locale`.
 *
 * Falls back to English when a message is somehow missing at runtime (for
 * instance after a hot reload), and to the key itself as a last resort so the
 * UI never renders `undefined`.
 */
export function translate(
  locale: Locale,
  key: TranslationKey,
  values?: TranslationValues,
): string {
  const message = messages[key] as Record<Locale, string> | undefined
  const template = message?.[locale] ?? message?.en ?? key
  return interpolate(template, values)
}

export type Translator = (key: TranslationKey, values?: TranslationValues) => string
