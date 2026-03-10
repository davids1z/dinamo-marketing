import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { SHIFTONEZERO_BRAND } from '../../utils/constants'

interface ReachChartProps {
  data: Array<{ date: string; reach: number; impressions: number }>
  title?: string
}

export function ReachChart({ data, title }: ReachChartProps) {
  return (
    <div>
      {title && <h3 className="font-headline text-lg mb-4 text-studio-text-primary">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="reachGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={SHIFTONEZERO_BRAND.colors.accentDark} stopOpacity={0.3} />
              <stop offset="95%" stopColor={SHIFTONEZERO_BRAND.colors.accentDark} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="impressionGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={SHIFTONEZERO_BRAND.colors.blue} stopOpacity={0.3} />
              <stop offset="95%" stopColor={SHIFTONEZERO_BRAND.colors.blue} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
          <XAxis dataKey="date" stroke="#6B6B6B" fontSize={12} />
          <YAxis stroke="#6B6B6B" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1A1A1A',
              border: '1px solid #2A2A2A',
              borderRadius: '8px',
              color: '#111827',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          />
          <Area type="monotone" dataKey="impressions" stroke={SHIFTONEZERO_BRAND.colors.blue} fill="url(#impressionGradient)" name="Impressions" />
          <Area type="monotone" dataKey="reach" stroke={SHIFTONEZERO_BRAND.colors.accentDark} fill="url(#reachGradient)" name="Reach" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
