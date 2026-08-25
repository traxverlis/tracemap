import type { ReactNode } from 'react'

import { cn } from '../utils'

interface BadgeProps {
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  children: ReactNode
  className?: string
}

export function Badge({ tone = 'neutral', children, className }: BadgeProps): JSX.Element {
  return <span className={cn('badge', `badge--${tone}`, className)}>{children}</span>
}
