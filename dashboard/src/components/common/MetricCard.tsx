import { clsx } from 'clsx'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatNumber, formatPercent, formatCurrency } from '../../utils/formatters'

interface MetricCardProps {
  label: string
  value: number
  previousValue?: number
  format?: 'number' | 'currency' | 'percent'
  icon?: React.ReactNode
}

export default function MetricCard({ label, value, previousValue, format = 'number', icon }: MetricCardProps) {
  const formattedValue =
    format === 'currency' ? formatCurrency(value) :
    format === 'percent' ? formatPercent(value) :
    formatNumber(value)

  const trend = previousValue !== undefined && previousValue > 0
    ? ((value - previousValue) / previousValue) * 100
    : null

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">{label}</p>
          <p className="stat-number text-white">{formattedValue}</p>
        </div>
        {icon && <div className="text-dinamo-accent">{icon}</div>}
      </div>
      {trend !== null && (
        <div className={clsx('flex items-center gap-1 mt-2 text-xs font-medium',
          trend >= 0 ? 'text-green-400' : 'text-red-400'
        )}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {trend >= 0 ? '+' : ''}{trend.toFixed(1)}% vs prethodni period
        </div>
      )}
    </div>
  )
}
