import { useState, useEffect, useId } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ChartTooltip } from './ChartTooltip'
import { AXIS_STYLE, GRID_STYLE } from './chartConfig'

interface ComparisonBarProps {
  data: Array<{ name: string; value: number; color?: string }>
  title?: string
  valueLabel?: string
  /** Show gradient bars with rounded corners (default true) */
  gradient?: boolean
  /** Custom tooltip formatter */
  tooltipFormatter?: (value: number, name: string) => string
  /** Custom Y-axis width for long labels */
  yAxisWidth?: number
}

const BAR_COLORS = [
  { from: '#3b82f6', to: '#60a5fa' },
  { from: '#6366f1', to: '#818cf8' },
  { from: '#8b5cf6', to: '#a78bfa' },
  { from: '#a855f7', to: '#c084fc' },
  { from: '#d946ef', to: '#e879f9' },
]

export function ComparisonBar({
  data,
  title,
  valueLabel = 'Vrijednost',
  gradient = true,
  tooltipFormatter,
  yAxisWidth = 100,
}: ComparisonBarProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const gradientId = useId()

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 60)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div>
      {title && (
        <div className="mb-5">
          <h3 className="font-headline text-base tracking-wider text-studio-text-primary">{title}</h3>
        </div>
      )}
      <div
        style={{
          clipPath: revealed ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
          transition: 'clip-path 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            layout="vertical"
            onMouseLeave={() => setActiveIndex(null)}
          >
            {gradient && (
              <defs>
                {data.map((_, index) => {
                  const c = BAR_COLORS[index % BAR_COLORS.length]!
                  return (
                    <linearGradient key={index} id={`bar-grad-${gradientId}-${index}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={c.from} />
                      <stop offset="100%" stopColor={c.to} />
                    </linearGradient>
                  )
                })}
              </defs>
            )}
            <CartesianGrid {...GRID_STYLE} horizontal={false} vertical />
            <XAxis type="number" {...AXIS_STYLE} />
            <YAxis
              dataKey="name"
              type="category"
              {...AXIS_STYLE}
              width={yAxisWidth}
              tick={{ ...AXIS_STYLE, width: yAxisWidth - 10 }}
            />
            <Tooltip
              content={<ChartTooltip formatter={tooltipFormatter} />}
              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            />
            <Bar
              dataKey="value"
              name={valueLabel}
              radius={[0, 8, 8, 0]}
              barSize={28}
              isAnimationActive={false}
              onMouseEnter={(_, index) => setActiveIndex(index)}
            >
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={gradient ? `url(#bar-grad-${gradientId}-${index})` : (entry.color || BAR_COLORS[0]!.from)}
                  style={{
                    opacity: activeIndex !== null && activeIndex !== index ? 0.4 : 1,
                    transition: 'opacity 0.2s ease-out',
                    filter: activeIndex === index ? 'brightness(1.1)' : undefined,
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
