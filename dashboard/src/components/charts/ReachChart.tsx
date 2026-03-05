import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DINAMO_BRAND } from '../../utils/constants'

interface ReachChartProps {
  data: Array<{ date: string; reach: number; impressions: number }>
  title?: string
}

export function ReachChart({ data, title }: ReachChartProps) {
  return (
    <div>
      {title && <h3 className="font-headline text-lg mb-4 text-gray-900">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="reachGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={DINAMO_BRAND.colors.accentDark} stopOpacity={0.3} />
              <stop offset="95%" stopColor={DINAMO_BRAND.colors.accentDark} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="impressionGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={DINAMO_BRAND.colors.blue} stopOpacity={0.3} />
              <stop offset="95%" stopColor={DINAMO_BRAND.colors.blue} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
          <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: DINAMO_BRAND.colors.darkCard,
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
            }}
          />
          <Area type="monotone" dataKey="impressions" stroke={DINAMO_BRAND.colors.blue} fill="url(#impressionGradient)" name="Impressions" />
          <Area type="monotone" dataKey="reach" stroke={DINAMO_BRAND.colors.accentDark} fill="url(#reachGradient)" name="Reach" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
