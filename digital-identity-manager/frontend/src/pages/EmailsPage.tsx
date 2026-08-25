import { IdentifierManagerPage } from './IdentifierManagerPage'

export function EmailsPage(): JSX.Element {
  return (
    <IdentifierManagerPage
      titleKey="identifiers.emails.title"
      descriptionKey="identifiers.emails.description"
      fixedType="email"
    />
  )
}
