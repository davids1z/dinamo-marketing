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

  const isPositive = trend !== null && trend >= 0

  return (
    <div className="bg-studio-surface-1 border border-studio-border rounded-2xl p-5 shadow-studio-panel hover:shadow-card-hover hover:border-studio-border-hover hover:-translate-y-0.5 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs uppercase tracking-wider text-studio-text-secondary font-medium">{label}</p>
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-dinamo-accent/10 flex items-center justify-center group-hover:bg-dinamo-accent/15 transition-colors">
            <Icon size={17} className="text-dinamo-accent" />
          </div>
        )}
      </div>
      <p className="stat-number">{formattedValue}</p>
      {trend !== null && (
        <div className="flex items-center gap-2 mt-3">
          <div className={clsx(
            'flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold',
            isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          )}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isPositive ? '+' : ''}{trend.toFixed(1)}%
          </div>
          <span className="text-[11px] text-studio-text-tertiary">u odnosu na prošli period</span>
        </div>
      )}
    </div>
  )
}
