import { useState } from 'react'

import { Button } from './Button'
import { maskPhone } from '../utils'

export function PhoneMask({ value }: { value: string }): JSX.Element {
  const [revealed, setRevealed] = useState(false)

  return (
    <span className="phone-mask">
      <span className="phone-mask__value">{revealed ? value : maskPhone(value)}</span>
      <Button variant="ghost" size="sm" onClick={() => setRevealed((current) => !current)}>
        {revealed ? 'Hide' : 'Reveal'}
      </Button>
    </span>
  )
}
