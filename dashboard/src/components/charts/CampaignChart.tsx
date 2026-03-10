import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { CHART_COLORS } from '../../utils/constants'

interface CampaignChartProps {
  data: Array<Record<string, unknown>>
  bars: Array<{ key: string; name: string; color?: string }>
  title?: string
}

export function CampaignChart({ data, bars, title }: CampaignChartProps) {
  return (
    <div>
      {title && <h3 className="font-headline text-lg mb-4 text-studio-text-primary">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="name" stroke="#8B8FA3" fontSize={12} />
          <YAxis stroke="#8B8FA3" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1A1D2E',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              color: '#E8E9F0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          />
          <Legend />
          {bars.map((bar, idx) => (
            <Bar
              key={bar.key}
              dataKey={bar.key}
              name={bar.name}
              fill={bar.color || CHART_COLORS[idx % CHART_COLORS.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
