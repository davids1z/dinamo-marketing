import { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from 'recharts'
import { SHIFTONEZERO_BRAND } from '../../utils/constants'
import { ChartTooltip } from './ChartTooltip'
import { CHART_ANIM } from './chartConfig'

interface SentimentDonutProps {
  positive: number
  neutral: number
  negative: number
  title?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Recharts internal type, no public type available
function renderActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 2}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.15))', transition: 'all 0.2s ease-out' }}
      />
    </g>
  )
}

export function SentimentDonut({ positive, neutral, negative, title }: SentimentDonutProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined)

  const data = [
    { name: 'Pozitivno', value: positive, color: SHIFTONEZERO_BRAND.colors.positive },
    { name: 'Neutralno', value: neutral, color: SHIFTONEZERO_BRAND.colors.neutral },
    { name: 'Negativno', value: negative, color: SHIFTONEZERO_BRAND.colors.negative },
  ]

  const total = positive + neutral + negative

  return (
    <div>
      {title && (
        <div className="mb-5">
          <h3 className="font-headline text-base tracking-wider text-studio-text-primary">{title}</h3>
        </div>
      )}
      <div className="flex items-center gap-6">
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={72}
              dataKey="value"
              strokeWidth={0}
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(undefined)}
              animationDuration={CHART_ANIM.pieDuration}
              animationEasing={CHART_ANIM.pieEasing}
              animationBegin={200}
            >
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.color}
                  style={{
                    opacity: activeIndex !== undefined && activeIndex !== index ? 0.4 : 1,
                    transition: 'opacity 0.2s ease-out',
                  }}
                />
              ))}
            </Pie>
            <Tooltip
              content={
                <ChartTooltip
                  formatter={(value: number) =>
                    total > 0 ? `${((value / total) * 100).toFixed(1)}%` : '0%'
                  }
                />
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-4">
          {data.map((item, index) => (
            <div
              key={item.name}
              className="flex items-center gap-3 cursor-default"
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(undefined)}
            >
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform duration-200"
                style={{
                  backgroundColor: item.color,
                  transform: activeIndex === index ? 'scale(1.4)' : 'scale(1)',
                }}
              />
              <div>
                <p className="text-xs text-studio-text-secondary leading-none">{item.name}</p>
                <p className="font-stats text-lg text-studio-text-primary leading-tight mt-0.5">
                  {total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
