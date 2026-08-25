import { IdentifierManagerPage } from './IdentifierManagerPage'

export function UsernamesPage(): JSX.Element {
  return (
    <IdentifierManagerPage
      titleKey="identifiers.usernames.title"
      descriptionKey="identifiers.usernames.description"
      fixedType="username"
      showUsernameScans
    />
  )
}
