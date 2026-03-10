import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { SHIFTONEZERO_BRAND } from '../../utils/constants'

interface ComparisonBarProps {
  data: Array<{ name: string; value: number; color?: string }>
  title?: string
  valueLabel?: string
}

export function ComparisonBar({ data, title, valueLabel = 'Vrijednost' }: ComparisonBarProps) {
  return (
    <div>
      {title && <h3 className="font-headline text-lg mb-4 text-studio-text-primary">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" horizontal={false} />
          <XAxis type="number" stroke="#6B6B6B" fontSize={12} />
          <YAxis dataKey="name" type="category" stroke="#6B6B6B" fontSize={11} width={100} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1A1A1A',
              border: '1px solid #2A2A2A',
              borderRadius: '8px',
              color: '#111827',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          />
          <Bar dataKey="value" name={valueLabel} fill={SHIFTONEZERO_BRAND.colors.blue} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
