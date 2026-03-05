import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DINAMO_BRAND } from '../../utils/constants'

interface ComparisonBarProps {
  data: Array<{ name: string; value: number; color?: string }>
  title?: string
  valueLabel?: string
}

export function ComparisonBar({ data, title, valueLabel = 'Vrijednost' }: ComparisonBarProps) {
  return (
    <div className="card">
      {title && <h3 className="font-headline text-lg mb-4 text-white">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
          <XAxis type="number" stroke="#7298BE" fontSize={12} />
          <YAxis dataKey="name" type="category" stroke="#7298BE" fontSize={11} width={100} />
          <Tooltip
            contentStyle={{
              backgroundColor: DINAMO_BRAND.colors.darkCard,
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
            }}
          />
          <Bar dataKey="value" name={valueLabel} fill={DINAMO_BRAND.colors.accent} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
