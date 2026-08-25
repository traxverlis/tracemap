interface TabItem {
  id: string
  label: string
  disabled?: boolean
}

interface TabsProps {
  items: TabItem[]
  value: string
  onChange: (id: string) => void
}

export function Tabs({ items, value, onChange }: TabsProps): JSX.Element {
  return (
    <div className="tabs" role="tablist">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={item.id === value}
          className={item.id === value ? 'tabs__button is-active' : 'tabs__button'}
          onClick={() => onChange(item.id)}
          disabled={item.disabled}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
