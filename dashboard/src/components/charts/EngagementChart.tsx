import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { CHART_ANIM } from './chartConfig'

interface DataPoint {
  date: string
  engagement: number
  reach: number
}

interface EngagementChartProps {
  data: DataPoint[]
  title?: string
}

/* Custom tooltip — dark glass style */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Recharts internal type, no public type available
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0f172a]/95 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-[11px] text-white/50 font-medium mb-1.5">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Recharts internal type, no public type available */}
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-xs text-white/70">{entry.name}</span>
          <span className="text-xs text-white font-semibold ml-auto pl-4">
            {entry.value?.toLocaleString('hr-HR')}
          </span>
        </div>
      ))}
    </div>
  )
}

export function EngagementChart({ data, title }: EngagementChartProps) {
  return (
    <div>
      {title && (
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-headline text-base tracking-wider text-studio-text-primary">{title}</h3>
        </div>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="gradEngagement" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradReach" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            dy={8}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
            dx={-4}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="engagement"
            stroke="#3b82f6"
            strokeWidth={2.5}
            fill="url(#gradEngagement)"
            dot={{ r: 3, fill: '#3b82f6', stroke: '#1e293b', strokeWidth: 2 }}
            activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
            name="Angažman"
            animationDuration={CHART_ANIM.areaDuration}
            animationEasing={CHART_ANIM.areaEasing}
          />
          <Area
            type="monotone"
            dataKey="reach"
            stroke="#8b5cf6"
            strokeWidth={2.5}
            fill="url(#gradReach)"
            dot={{ r: 3, fill: '#8b5cf6', stroke: '#1e293b', strokeWidth: 2 }}
            activeDot={{ r: 5, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
            name="Doseg"
            animationDuration={CHART_ANIM.areaDuration}
            animationEasing={CHART_ANIM.areaEasing}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-6 mt-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs text-studio-text-tertiary">Angažman</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-violet-500" />
          <span className="text-xs text-studio-text-tertiary">Doseg</span>
        </div>
      </div>
    </div>
  )
}
