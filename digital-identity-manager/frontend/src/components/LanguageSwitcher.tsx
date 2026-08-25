import { useI18n } from '../i18n'
import type { Locale, TranslationKey } from '../i18n'
import { cn } from '../utils'

/** Adding a locale to `LOCALES` without its label here is a compile error. */
const LOCALE_LABEL_KEYS: Record<Locale, TranslationKey> = {
  en: 'language.en',
  fr: 'language.fr',
}

/** French / English switcher, available before and after authentication. */
export function LanguageSwitcher({ className }: { className?: string }): JSX.Element {
  const { locale, locales, setLocale, t } = useI18n()

  return (
    <select
      className={cn('language-switcher', className)}
      aria-label={t('language.label')}
      value={locale}
      onChange={(event) => setLocale(event.target.value as Locale)}
    >
      {locales.map((item) => (
        <option key={item} value={item}>
          {t(LOCALE_LABEL_KEYS[item])}
        </option>
      ))}
    </select>
  )
}
