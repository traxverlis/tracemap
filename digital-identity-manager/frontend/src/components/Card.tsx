import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '../utils'

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}

export function Card({ title, description, actions, children, className, ...props }: CardProps): JSX.Element {
  return (
    <section className={cn('card', className)} {...props}>
      {title || description || actions ? (
        <header className="card__header">
          <div>
            {typeof title === 'string' ? <h2 className="card__title">{title}</h2> : title}
            {description ? <p className="card__description">{description}</p> : null}
          </div>
          {actions ? <div>{actions}</div> : null}
        </header>
      ) : null}
      <div className="card__body">{children}</div>
    </section>
  )
}
