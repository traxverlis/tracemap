interface EmptyStateProps {
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps): JSX.Element {
  return (
    <div className="empty-state">
      <div className="stack stack--sm">
        <strong>{title}</strong>
        <span>{description}</span>
        {action}
      </div>
    </div>
  )
}
