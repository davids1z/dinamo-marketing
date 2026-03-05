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
    { name: 'Positive', value: positive, color: DINAMO_BRAND.colors.positive },
    { name: 'Neutral', value: neutral, color: DINAMO_BRAND.colors.neutral },
    { name: 'Negative', value: negative, color: DINAMO_BRAND.colors.negative },
  ]

  const total = positive + neutral + negative

  return (
    <div className="card">
      {title && <h3 className="font-headline text-lg mb-4 text-white">{title}</h3>}
      <div className="flex items-center gap-6">
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={70}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: DINAMO_BRAND.colors.darkCard,
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-3">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <div>
                <p className="text-sm text-gray-300">{item.name}</p>
                <p className="font-stats text-lg text-white">
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
