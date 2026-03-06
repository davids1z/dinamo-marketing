import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DINAMO_BRAND } from '../../utils/constants'

interface DataPoint {
  date: string
  engagement: number
  reach: number
}

interface EngagementChartProps {
  data: DataPoint[]
  title?: string
}

export function EngagementChart({ data, title }: EngagementChartProps) {
  return (
    <div>
      {title && (
        <div className="mb-5">
          <h3 className="font-headline text-base tracking-wider text-gray-900">{title}</h3>
        </div>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
          <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              color: '#1e293b',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              padding: '10px 14px',
            }}
          />
          <Line
            type="monotone"
            dataKey="engagement"
            stroke={DINAMO_BRAND.colors.accentDark}
            strokeWidth={2.5}
            dot={false}
            name="Angažman"
          />
          <Line
            type="monotone"
            dataKey="reach"
            stroke={DINAMO_BRAND.colors.blue}
            strokeWidth={2.5}
            dot={false}
            name="Doseg"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
