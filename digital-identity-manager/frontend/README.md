# Digital Identity Manager Frontend

React 18 + TypeScript + Vite frontend for the Digital Identity Manager (DIM) application.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run preview`

## Internationalisation (French / English)

The whole interface is available in **English** and **French**. The switcher sits
in the top bar (and on the login / bootstrap screens); the choice is stored in
`localStorage` under `dim_locale` and mirrored on `<html lang>`. Without a stored
preference the browser language is used, falling back to English.

The layer lives in `src/i18n/` and pulls in no runtime dependency:

| File | Role |
| --- | --- |
| `types.ts` | `Locale` union, `MessageMap` shape, `isLocale` guard |
| `messages/*.ts` | Dictionaries split per functional area |
| `messages/index.ts` | Merges the fragments, derives the `TranslationKey` union |
| `translate.ts` | `translate(locale, key, values)` and `{placeholder}` interpolation |
| `context.tsx` | `I18nProvider`, `useI18n()`, `useTranslation()` |
| `active.ts` | Module-level mirror of the locale used by the helpers in `src/utils.ts` |

Every message declares **both** locales next to each other:

```ts
export const scans = {
  'scans.title': { en: 'Scans', fr: 'Analyses' },
  'scans.running': { en: '{count} running', fr: '{count} en cours' },
} as const satisfies MessageMap
```

Because the dictionaries are typed with `satisfies MessageMap` and `t()` only
accepts a `TranslationKey`, a missing translation or a typo in a key is a build
error (`npm run build` runs `tsc --noEmit`).

To add a language: add its code to `LOCALES` in `src/i18n/types.ts`, then let the
compiler point at every message that still needs a translation.
