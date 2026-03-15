import { useState, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { CHART_COLORS } from '../../utils/constants'
import { ChartTooltip } from './ChartTooltip'
import { CHART_ANIM, AXIS_STYLE, GRID_STYLE } from './chartConfig'

interface CampaignChartProps {
  data: Array<Record<string, unknown>>
  bars: Array<{ key: string; name: string; color?: string }>
  title?: string
}

export function CampaignChart({ data, bars, title }: CampaignChartProps) {
  const [activeBarKey, setActiveBarKey] = useState<string | null>(null)

  const handleMouseEnter = useCallback((barKey: string) => {
    setActiveBarKey(barKey)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setActiveBarKey(null)
  }, [])

  return (
    <div>
      {title && (
        <div className="mb-5">
          <h3 className="font-headline text-base tracking-wider text-studio-text-primary">{title}</h3>
        </div>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} onMouseLeave={handleMouseLeave}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="name" {...AXIS_STYLE} dy={8} />
          <YAxis {...AXIS_STYLE} dx={-4} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          {bars.map((bar, idx) => {
            const color = bar.color || CHART_COLORS[idx % CHART_COLORS.length]
            const dimmed = activeBarKey !== null && activeBarKey !== bar.key
            return (
              <Bar
                key={bar.key}
                dataKey={bar.key}
                name={bar.name}
                radius={[6, 6, 0, 0]}
                animationDuration={CHART_ANIM.barDuration}
                animationEasing={CHART_ANIM.barEasing}
                animationBegin={idx * 100}
                onMouseEnter={() => handleMouseEnter(bar.key)}
              >
                {data.map((_, i) => (
                  <Cell
                    key={i}
                    fill={color}
                    style={{
                      opacity: dimmed ? 0.35 : 1,
                      transition: 'opacity 0.2s ease-out',
                    }}
                  />
                ))}
              </Bar>
            )
          })}
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-5 mt-3">
        {bars.map((bar, idx) => (
          <div key={bar.key} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: bar.color || CHART_COLORS[idx % CHART_COLORS.length] }}
            />
            <span className="text-xs text-studio-text-tertiary">{bar.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
