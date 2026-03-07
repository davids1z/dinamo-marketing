import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { DINAMO_BRAND } from '../../utils/constants'

interface SentimentDonutProps {
  positive: number
  neutral: number
  negative: number
  title?: string
}

export function SentimentDonut({ positive, neutral, negative, title }: SentimentDonutProps) {
  const data = [
    { name: 'Pozitivno', value: positive, color: DINAMO_BRAND.colors.positive },
    { name: 'Neutralno', value: neutral, color: DINAMO_BRAND.colors.neutral },
    { name: 'Negativno', value: negative, color: DINAMO_BRAND.colors.negative },
  ]

  const total = positive + neutral + negative

  return (
    <div>
      {title && (
        <div className="mb-5">
          <h3 className="font-headline text-base tracking-wider text-gray-900">{title}</h3>
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
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                color: '#111827',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                padding: '8px 12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-4">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <div>
                <p className="text-xs text-gray-500 leading-none">{item.name}</p>
                <p className="font-stats text-lg text-gray-900 leading-tight mt-0.5">
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
