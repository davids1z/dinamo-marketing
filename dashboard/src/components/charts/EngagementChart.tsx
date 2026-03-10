import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { SHIFTONEZERO_BRAND } from '../../utils/constants'

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
          <h3 className="font-headline text-base tracking-wider text-studio-text-primary">{title}</h3>
        </div>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
          <XAxis dataKey="date" stroke="#6B6B6B" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#6B6B6B" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1A1A1A',
              border: '1px solid #2A2A2A',
              borderRadius: '12px',
              color: '#111827',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              padding: '10px 14px',
            }}
          />
          <Line
            type="monotone"
            dataKey="engagement"
            stroke={SHIFTONEZERO_BRAND.colors.accentDark}
            strokeWidth={2.5}
            dot={false}
            name="Angažman"
          />
          <Line
            type="monotone"
            dataKey="reach"
            stroke={SHIFTONEZERO_BRAND.colors.blue}
            strokeWidth={2.5}
            dot={false}
            name="Doseg"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
