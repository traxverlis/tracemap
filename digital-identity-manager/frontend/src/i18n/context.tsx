import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'

import { setActiveLocale } from './active'
import { translate, type Translator } from './translate'
import { isLocale, LOCALES, type Locale } from './types'

interface I18nContextValue {
  locale: Locale
  locales: readonly Locale[]
  setLocale: (locale: Locale) => void
  t: Translator
}

const LOCALE_KEY = 'dim_locale'
const I18nContext = createContext<I18nContextValue | undefined>(undefined)

/** Stored preference first, then the browser language, then English. */
function detectLocale(): Locale {
  const stored = localStorage.getItem(LOCALE_KEY)
  if (isLocale(stored)) return stored
  const preferred = typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language])
  for (const tag of preferred) {
    const base = tag?.split('-')[0]?.toLowerCase()
    if (isLocale(base)) return base
  }
  return 'en'
}

export function I18nProvider({ children }: PropsWithChildren): JSX.Element {
  const [locale, setLocaleState] = useState<Locale>(detectLocale)

  // Keep the module-level mirror in sync *during* render so helpers used by
  // the very first paint (date formatting, error messages) already use it.
  setActiveLocale(locale)

  useEffect(() => {
    localStorage.setItem(LOCALE_KEY, locale)
    document.documentElement.setAttribute('lang', locale)
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    setActiveLocale(next)
    setLocaleState(next)
  }, [])

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      locales: LOCALES,
      setLocale,
      t: (key, values) => translate(locale, key, values),
    }),
    [locale, setLocale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}

/** Convenience hook for components that only need the translator. */
export function useTranslation(): Translator {
  return useI18n().t
}
