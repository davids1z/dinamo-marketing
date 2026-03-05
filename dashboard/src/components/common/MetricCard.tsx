import { clsx } from 'clsx'
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react'
import { formatNumber, formatPercent, formatCurrency } from '../../utils/formatters'

interface MetricCardProps {
  label: string
  value: number
  previousValue?: number
  format?: 'number' | 'currency' | 'percent'
  icon?: LucideIcon
}

export default function MetricCard({ label, value, previousValue, format = 'number', icon: Icon }: MetricCardProps) {
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
          <p className="text-xs uppercase tracking-wider text-dinamo-muted mb-1">{label}</p>
          <p className="stat-number text-white">{formattedValue}</p>
        </div>
        {Icon && <div className="text-dinamo-accent"><Icon size={20} /></div>}
      </div>
      {trend !== null && (
        <div className={clsx('flex items-center gap-1 mt-2 text-xs font-medium',
          trend >= 0 ? 'text-green-400' : 'text-red-400'
        )}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {trend >= 0 ? '+' : ''}{trend.toFixed(1)}% u odnosu na prošli period
        </div>
      )}
    </div>
  )
}
