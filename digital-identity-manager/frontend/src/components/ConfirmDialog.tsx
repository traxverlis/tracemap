import type { ReactNode } from 'react'

import { useI18n } from '../i18n'
import { Button } from './Button'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel?: string
  tone?: 'primary' | 'danger'
  onConfirm: () => void
  onClose: () => void
  isLoading?: boolean
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = 'danger',
  onConfirm,
  onClose,
  isLoading = false,
}: ConfirmDialogProps): JSX.Element {
  const { t } = useI18n()

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant={tone} onClick={onConfirm} isLoading={isLoading}>
            {confirmLabel ?? t('common.confirm')}
          </Button>
        </>
      }
    >
      <div className="stack stack--sm">{description}</div>
    </Modal>
  )
}
