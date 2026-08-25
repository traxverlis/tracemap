import { cn } from '../utils'

interface SpinnerProps {
  large?: boolean
  inline?: boolean
}

export function Spinner({ large = false, inline = false }: SpinnerProps): JSX.Element {
  return <span aria-hidden="true" className={cn('spinner', large && 'spinner--lg', inline && 'spinner--inline')} />
}
