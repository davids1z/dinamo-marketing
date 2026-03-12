import { clsx } from 'clsx'

interface Column<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  align?: 'left' | 'center' | 'right'
  width?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (item: T) => void
  emptyMessage?: string
}

export type { Column }

export default function DataTable<T extends object>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'Nema dostupnih podataka',
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-brand-muted">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-studio-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={clsx(
                  'px-4 py-3 text-xs uppercase tracking-wider text-brand-muted font-medium',
                  col.align === 'right' ? 'text-right' :
                  col.align === 'center' ? 'text-center' : 'text-left'
                )}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr
              key={idx}
              onClick={() => onRowClick?.(item)}
              className={clsx(
                'border-b border-studio-border transition-colors',
                onRowClick && 'cursor-pointer hover:bg-studio-surface-1'
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={clsx(
                    'px-4 py-3 text-sm',
                    col.align === 'right' ? 'text-right' :
                    col.align === 'center' ? 'text-center' : 'text-left'
                  )}
                >
                  {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
