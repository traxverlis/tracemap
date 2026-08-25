import { IdentifierManagerPage } from './IdentifierManagerPage'

export function PhonesPage(): JSX.Element {
  return (
    <IdentifierManagerPage
      title="Phones"
      description="Store phone numbers with masked display, confidence, and validity windows."
      fixedType="phone"
    />
  )
}
