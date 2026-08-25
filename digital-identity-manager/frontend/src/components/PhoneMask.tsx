import { useState } from 'react'

import { useI18n } from '../i18n'
import { maskPhone } from '../utils'
import { Button } from './Button'

export function PhoneMask({ value }: { value: string }): JSX.Element {
  const [revealed, setRevealed] = useState(false)
  const { t } = useI18n()

  return (
    <span className="phone-mask">
      <span className="phone-mask__value">{revealed ? value : maskPhone(value)}</span>
      <Button variant="ghost" size="sm" onClick={() => setRevealed((current) => !current)}>
        {revealed ? t('common.hide') : t('common.reveal')}
      </Button>
    </span>
  )
}
