export function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0f172a]/95 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      {label && <p className="text-[11px] text-white/50 font-medium mb-1.5">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.payload?.color }} />
          <span className="text-xs text-white/70">{entry.name}</span>
          <span className="text-xs text-white font-semibold ml-auto pl-4">
            {formatter
              ? formatter(entry.value, entry.name)
              : typeof entry.value === 'number'
                ? entry.value.toLocaleString('hr-HR')
                : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}
