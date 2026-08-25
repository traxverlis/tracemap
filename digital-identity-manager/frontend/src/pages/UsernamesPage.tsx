import { IdentifierManagerPage } from './IdentifierManagerPage'

export function UsernamesPage(): JSX.Element {
  return (
    <IdentifierManagerPage
      title="Usernames"
      description="Manage handles and launch approved username scans with Maigret, Sherlock, WhatsMyName, and OpenOSINT."
      fixedType="username"
      showUsernameScans
    />
  )
}
