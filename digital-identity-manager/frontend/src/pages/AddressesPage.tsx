import { IdentifierManagerPage } from './IdentifierManagerPage'

export function AddressesPage(): JSX.Element {
  return (
    <IdentifierManagerPage
      titleKey="identifiers.addresses.title"
      descriptionKey="identifiers.addresses.description"
      fixedType="address"
      showSensitiveNotice
    />
  )
}
