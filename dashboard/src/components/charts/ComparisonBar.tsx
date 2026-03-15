import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ChartTooltip } from './ChartTooltip'
import { AXIS_STYLE, GRID_STYLE } from './chartConfig'

interface ComparisonBarProps {
  data: Array<{ name: string; value: number; color?: string }>
  title?: string
  valueLabel?: string
}

const BAR_COLOR = '#3b82f6'

export function ComparisonBar({ data, title, valueLabel = 'Vrijednost' }: ComparisonBarProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)

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
            <CartesianGrid {...GRID_STYLE} horizontal={false} vertical />
            <XAxis type="number" {...AXIS_STYLE} />
            <YAxis
              dataKey="name"
              type="category"
              {...AXIS_STYLE}
              width={100}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
            <Bar
              dataKey="value"
              name={valueLabel}
              radius={[0, 6, 6, 0]}
              isAnimationActive={false}
              onMouseEnter={(_, index) => setActiveIndex(index)}
            >
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.color || BAR_COLOR}
                  style={{
                    opacity: activeIndex !== null && activeIndex !== index ? 0.4 : 1,
                    transition: 'opacity 0.2s ease-out',
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
