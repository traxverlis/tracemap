import { IdentifierManagerPage } from './IdentifierManagerPage'

export function PhonesPage(): JSX.Element {
  return (
    <IdentifierManagerPage
      titleKey="identifiers.phones.title"
      descriptionKey="identifiers.phones.description"
      fixedType="phone"
    />
  )
}
