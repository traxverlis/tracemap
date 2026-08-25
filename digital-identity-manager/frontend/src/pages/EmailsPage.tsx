import { IdentifierManagerPage } from './IdentifierManagerPage'

export function EmailsPage(): JSX.Element {
  return (
    <IdentifierManagerPage
      title="Emails"
      description="Track primary, secondary, and historical email addresses used by the active identity."
      fixedType="email"
    />
  )
}
