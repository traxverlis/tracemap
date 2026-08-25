import type { ReactNode } from 'react'

interface FieldProps {
  label: string
  htmlFor?: string
  hint?: string
  error?: string | null
  required?: boolean
  children: ReactNode
}

export function Field({ label, htmlFor, hint, error, required = false, children }: FieldProps): JSX.Element {
  return (
    <label className="field" htmlFor={htmlFor}>
      <span className="field__label-row">
        <span>
          {label}
          {required ? ' *' : ''}
        </span>
        {hint ? <span className="field__hint">{hint}</span> : null}
      </span>
      {children}
      {error ? <span className="field__error">{error}</span> : null}
    </label>
  )
}
