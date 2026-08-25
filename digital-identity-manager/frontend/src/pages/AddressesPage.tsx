import { IdentifierManagerPage } from './IdentifierManagerPage'

export function AddressesPage(): JSX.Element {
  return (
    <IdentifierManagerPage
      title="Addresses"
      description="Capture residential or mailing addresses only when necessary for authorised privacy workflows."
      fixedType="address"
      showSensitiveNotice
    />
  )
}
