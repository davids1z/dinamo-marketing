import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { ChartTooltip } from './ChartTooltip'
import { CHART_ANIM, AXIS_STYLE, GRID_STYLE } from './chartConfig'

interface ReachChartProps {
  data: Array<{ date: string; reach: number; impressions: number }>
  title?: string
}

export function ReachChart({ data, title }: ReachChartProps) {
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
            <linearGradient id="gradReach_reach" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradReach_impressions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="date" {...AXIS_STYLE} dy={8} />
          <YAxis
            {...AXIS_STYLE}
            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
            dx={-4}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="impressions"
            stroke="#0ea5e9"
            strokeWidth={2.5}
            fill="url(#gradReach_impressions)"
            dot={{ r: 3, fill: '#0ea5e9', stroke: '#1e293b', strokeWidth: 2 }}
            activeDot={{ r: 5, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2 }}
            name="Impresije"
            animationDuration={CHART_ANIM.areaDuration}
            animationEasing={CHART_ANIM.areaEasing}
          />
          <Area
            type="monotone"
            dataKey="reach"
            stroke="#22c55e"
            strokeWidth={2.5}
            fill="url(#gradReach_reach)"
            dot={{ r: 3, fill: '#22c55e', stroke: '#1e293b', strokeWidth: 2 }}
            activeDot={{ r: 5, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
            name="Doseg"
            animationDuration={CHART_ANIM.areaDuration}
            animationEasing={CHART_ANIM.areaEasing}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-6 mt-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-sky-500" />
          <span className="text-xs text-studio-text-tertiary">Impresije</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-xs text-studio-text-tertiary">Doseg</span>
        </div>
      </div>
    </div>
  )
}
