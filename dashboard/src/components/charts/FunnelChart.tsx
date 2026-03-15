import { formatNumber } from '../../utils/formatters'

interface FunnelStep {
  label: string
  value: number
  color: string
}

interface FunnelChartProps {
  steps: FunnelStep[]
  title?: string
}

export function FunnelChart({ steps, title }: FunnelChartProps) {
  const maxValue = Math.max(...steps.map(s => s.value), 1)

  return (
    <div>
      {title && (
        <div className="mb-5">
          <h3 className="font-headline text-base tracking-wider text-studio-text-primary">{title}</h3>
        </div>
      )}
      <div className="space-y-3">
        {steps.map((step, idx) => {
          const widthPct = Math.min((step.value / maxValue) * 100, 100)
          const conversionRate = idx > 0 && steps[idx - 1]!.value > 0
            ? ((step.value / steps[idx - 1]!.value) * 100).toFixed(1)
            : '100'

          return (
            <div
              key={step.label}
              className="animate-chart-in group"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-studio-text-secondary">{step.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-stats text-studio-text-primary">{formatNumber(step.value)}</span>
                  {idx > 0 && (
                    <span className="text-xs text-studio-text-tertiary">({conversionRate}%)</span>
                  )}
                </div>
              </div>
              <div className="w-full bg-white/5 rounded-lg h-7 overflow-hidden">
                <div
                  className="h-7 rounded-lg transition-all duration-300 flex items-center justify-end pr-2
                    group-hover:scale-x-[1.02] group-hover:brightness-110 origin-left"
                  style={{
                    width: `${widthPct}%`,
                    background: `linear-gradient(90deg, ${step.color}cc, ${step.color})`,
                  }}
                >
                  {widthPct > 15 && (
                    <span className="text-[10px] font-bold text-white drop-shadow-sm">
                      {widthPct.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
