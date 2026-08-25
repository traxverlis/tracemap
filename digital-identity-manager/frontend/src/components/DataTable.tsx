import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { Button } from './Button'
import { EmptyState } from './EmptyState'

type SortDirection = 'asc' | 'desc'

export interface DataTableColumn<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  sortValue?: (row: T) => string | number | boolean | null | undefined
  filterValue?: (row: T) => string | number | boolean | null | undefined
  filterable?: boolean
  width?: string
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  pageSize?: number
  emptyTitle?: string
  emptyDescription?: string
  showFilters?: boolean
  onRowClick?: (row: T) => void
}

function compareValues(
  a: string | number | boolean | null | undefined,
  b: string | number | boolean | null | undefined,
  direction: SortDirection,
): number {
  const first = a ?? ''
  const second = b ?? ''
  const comparison = typeof first === 'number' && typeof second === 'number'
    ? first - second
    : String(first).localeCompare(String(second), undefined, { numeric: true, sensitivity: 'base' })
  return direction === 'asc' ? comparison : comparison * -1
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  pageSize = 10,
  emptyTitle = 'No records yet',
  emptyDescription = 'Create a new record to populate this table.',
  showFilters = false,
  onRowClick,
}: DataTableProps<T>): JSX.Element {
  const [sortKey, setSortKey] = useState<string | null>(columns.find((column) => column.sortValue)?.key ?? null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<Record<string, string>>({})

  useEffect(() => {
    setPage(1)
  }, [rows.length, sortDirection, sortKey, filters])

  const processedRows = useMemo(() => {
    const filtered = rows.filter((row) =>
      columns.every((column) => {
        const query = filters[column.key]?.trim().toLowerCase()
        if (!query) return true
        const rawValue = column.filterValue?.(row) ?? column.sortValue?.(row) ?? ''
        return String(rawValue ?? '').toLowerCase().includes(query)
      }),
    )

    if (!sortKey) return filtered
    const column = columns.find((item) => item.key == sortKey)
    if (!column?.sortValue) return filtered

    return [...filtered].sort((left, right) =>
      compareValues(column.sortValue?.(left), column.sortValue?.(right), sortDirection),
    )
  }, [columns, filters, rows, sortDirection, sortKey])

  const totalPages = Math.max(1, Math.ceil(processedRows.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pagedRows = processedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const toggleSort = (columnKey: string) => {
    if (sortKey === columnKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(columnKey)
      setSortDirection('asc')
    }
  }

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} style={{ width: column.width }}>
                  {column.sortValue ? (
                    <button type="button" className="data-table__sort" onClick={() => toggleSort(column.key)}>
                      {column.header}
                      {sortKey === column.key ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
            {showFilters ? (
              <tr>
                {columns.map((column) => (
                  <th key={`${column.key}-filter`} className="data-table__filter">
                    {column.filterable === false ? null : (
                      <input
                        aria-label={`Filter ${column.header}`}
                        placeholder={`Filter ${column.header}`}
                        value={filters[column.key] ?? ''}
                        onChange={(event) =>
                          setFilters((current) => ({ ...current, [column.key]: event.target.value }))
                        }
                      />
                    )}
                  </th>
                ))}
              </tr>
            ) : null}
          </thead>
          <tbody>
            {pagedRows.map((row) => (
              <tr
                key={rowKey(row)}
                className={onRowClick ? 'data-table__row--clickable' : undefined}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td key={column.key}>{column.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="data-table__pagination">
        <span className="muted">
          Showing {pagedRows.length} of {processedRows.length}
        </span>
        <div className="inline">
          <Button variant="ghost" size="sm" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            Previous
          </Button>
          <span className="muted">Page {currentPage} / {totalPages}</span>
          <Button variant="ghost" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
