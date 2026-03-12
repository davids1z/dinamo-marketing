import { ALL_TEMPLATES, type StudioTemplate } from './templates'

interface TemplateSelectorProps {
  onSelect: (template: StudioTemplate) => void
}

export default function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Predlošci</h3>
      <div className="grid grid-cols-2 gap-2">
        {ALL_TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t)}
            className="text-left p-3 rounded-xl border border-gray-200 hover:border-brand-blue/30 hover:bg-blue-50/50 transition-all group"
          >
            <div className="text-2xl mb-1.5">{t.icon}</div>
            <p className="text-[11px] font-semibold text-gray-700 group-hover:text-brand-blue leading-tight">
              {t.name}
            </p>
            <p className="text-[9px] text-gray-400 mt-0.5 leading-snug">{t.description}</p>
            <div className="flex items-center gap-1 mt-1.5">
              <span className="text-[8px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                {t.scenes.length} {t.scenes.length === 1 ? 'scena' : 'scena'}
              </span>
              <span className="text-[8px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                {t.aspectRatio}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
