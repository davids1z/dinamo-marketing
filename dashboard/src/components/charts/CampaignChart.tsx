import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { DINAMO_BRAND, CHART_COLORS } from '../../utils/constants'

interface CampaignChartProps {
  data: Array<Record<string, unknown>>
  bars: Array<{ key: string; name: string; color?: string }>
  title?: string
}

export function CampaignChart({ data, bars, title }: CampaignChartProps) {
  return (
    <div className="card">
      {title && <h3 className="font-headline text-lg mb-4 text-white">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
          <YAxis stroke="#6B7280" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: DINAMO_BRAND.colors.darkCard,
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
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
