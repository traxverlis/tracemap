import type { ReactNode } from 'react'

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
  confirmLabel = 'Confirm',
  tone = 'danger',
  onConfirm,
  onClose,
  isLoading = false,
}: ConfirmDialogProps): JSX.Element {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant={tone} onClick={onConfirm} isLoading={isLoading}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="stack stack--sm">{description}</div>
    </Modal>
  )
}
