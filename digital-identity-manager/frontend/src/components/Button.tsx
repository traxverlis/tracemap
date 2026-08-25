import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '../utils'
import { Spinner } from './Spinner'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'md' | 'sm'
  isLoading?: boolean
  fullWidth?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps): JSX.Element {
  return (
    <button
      className={cn(
        'button',
        `button--${variant}`,
        `button--${size}`,
        fullWidth && 'button--full',
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Spinner inline /> : null}
      {children}
    </button>
  )
}
