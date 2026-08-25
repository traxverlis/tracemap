import { auth } from './auth'
import { common } from './common'
import { dashboard } from './dashboard'
import { findings } from './findings'
import { identifiers } from './identifiers'
import { identity } from './identity'
import { inventory } from './inventory'
import { nav } from './nav'
import { privacy } from './privacy'
import { scans } from './scans'
import { settings } from './settings'

/**
 * The complete catalogue of translatable messages.
 *
 * Fragments are split per functional area so they stay readable; each entry
 * carries every supported locale, which makes an untranslated string a
 * compile-time error.
 */
export const messages = {
  ...common,
  ...nav,
  ...auth,
  ...dashboard,
  ...identity,
  ...identifiers,
  ...inventory,
  ...findings,
  ...privacy,
  ...scans,
  ...settings,
}

export type TranslationKey = keyof typeof messages
