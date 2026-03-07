import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DINAMO_BRAND } from '../../utils/constants'

interface ComparisonBarProps {
  data: Array<{ name: string; value: number; color?: string }>
  title?: string
  valueLabel?: string
}

export function ComparisonBar({ data, title, valueLabel = 'Vrijednost' }: ComparisonBarProps) {
  return (
    <div>
      {title && <h3 className="font-headline text-lg mb-4 text-gray-900">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
          <XAxis type="number" stroke="#6B7280" fontSize={12} />
          <YAxis dataKey="name" type="category" stroke="#6B7280" fontSize={11} width={100} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              color: '#111827',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          />
          <Bar dataKey="value" name={valueLabel} fill={DINAMO_BRAND.colors.blue} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
