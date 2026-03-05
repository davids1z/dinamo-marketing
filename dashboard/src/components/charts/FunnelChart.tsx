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
  const maxValue = steps[0]?.value || 1

  return (
    <div className="card">
      {title && <h3 className="font-headline text-lg mb-4 text-white">{title}</h3>}
      <div className="space-y-3">
        {steps.map((step, idx) => {
          const widthPct = (step.value / maxValue) * 100
          const conversionRate = idx > 0 ? ((step.value / steps[idx - 1]!.value) * 100).toFixed(1) : '100'

          return (
            <div key={step.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-300">{step.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-stats text-white">{formatNumber(step.value)}</span>
                  {idx > 0 && (
                    <span className="text-xs text-gray-500">({conversionRate}%)</span>
                  )}
                </div>
              </div>
              <div className="w-full bg-white/5 rounded-full h-6">
                <div
                  className="h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                  style={{ width: `${widthPct}%`, backgroundColor: step.color }}
                >
                  {widthPct > 15 && (
                    <span className="text-[10px] font-bold text-white">{widthPct.toFixed(0)}%</span>
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
