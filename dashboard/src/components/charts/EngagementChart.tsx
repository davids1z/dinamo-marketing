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
    <div className="card">
      {title && <h3 className="font-headline text-lg mb-4 text-white">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
          <YAxis stroke="#6B7280" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: DINAMO_BRAND.colors.darkCard,
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
            }}
          />
          <Line
            type="monotone"
            dataKey="engagement"
            stroke={DINAMO_BRAND.colors.accent}
            strokeWidth={2}
            dot={false}
            name="Engagement Rate"
          />
          <Line
            type="monotone"
            dataKey="reach"
            stroke={DINAMO_BRAND.colors.primary}
            strokeWidth={2}
            dot={false}
            name="Reach"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
