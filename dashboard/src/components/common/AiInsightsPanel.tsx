import React from 'react'
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, RefreshCw, Clock } from 'lucide-react'
import { useAiInsights } from '../../hooks/useAiInsights'
import { AiInsight } from '../../api/aiInsights'

interface AiInsightsPanelProps {
  pageKey: string
  pageData: Record<string, unknown>
}

const typeConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  trend: { icon: TrendingUp, label: 'Trend', color: 'text-blue-400' },
  anomaly: { icon: AlertTriangle, label: 'Anomalija', color: 'text-amber-400' },
  recommendation: { icon: Lightbulb, label: 'Preporuka', color: 'text-emerald-400' },
}

const impactBadge: Record<string, string> = {
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  low: 'bg-gray-500/20 text-studio-text-tertiary border-gray-500/30',
}

const impactLabel: Record<string, string> = {
  high: 'Visok',
  medium: 'Srednji',
  low: 'Nizak',
}

function InsightCard({ insight }: { insight: AiInsight }) {
  const config = typeConfig[insight.type] ?? typeConfig.recommendation!
  const Icon = config!.icon
  const badge = impactBadge[insight.impact] || impactBadge.low

  return (
    <div className="bg-[#0d2137] border border-[#1a3a5c] rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${config!.color}`}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-white">{insight.title}</h4>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${badge}`}>
              {impactLabel[insight.impact] || insight.impact}
            </span>
          </div>
          <p className="text-xs text-studio-text-tertiary mb-2">{insight.description}</p>
          {insight.action && (
            <p className="text-xs text-[#0EA5E9]">
              → {insight.action}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AiInsightsPanel({ pageKey, pageData }: AiInsightsPanelProps) {
  const { insights, loading, error, cached, generate } = useAiInsights(pageKey)

  const handleGenerate = () => {
    generate(pageData)
  }

  return (
    <div className="bg-brand-dark border border-white/10 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[#0EA5E9]" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">AI Uvidi</h3>
        </div>
        <div className="flex items-center gap-2">
          {cached && (
            <span className="text-[10px] text-studio-text-secondary flex items-center gap-1">
              <Clock size={10} />
              iz cache-a
            </span>
          )}
          {insights && (
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-[#1a3a5c] text-studio-text-tertiary hover:text-white transition-colors disabled:opacity-50"
              title="Osvježi uvide"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {!insights && !loading && !error && (
        <button
          onClick={handleGenerate}
          className="w-full py-3 px-4 bg-[#1a3a5c] hover:bg-[#234d73] border border-[#2a5a8c] rounded-lg text-sm text-white flex items-center justify-center gap-2 transition-colors"
        >
          <Sparkles size={16} className="text-[#0EA5E9]" />
          Generiraj uvide
        </button>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-3 py-6">
          <div className="w-5 h-5 border-2 border-[#0EA5E9] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-studio-text-tertiary">AI analizira podatke...</span>
        </div>
      )}

      {error && (
        <div className="text-center py-4">
          <p className="text-sm text-red-400 mb-2">{error}</p>
          <button
            onClick={handleGenerate}
            className="text-xs text-[#0EA5E9] hover:underline"
          >
            Pokušaj ponovo
          </button>
        </div>
      )}

      {insights && !loading && (
        <div className="space-y-3">
          {/* Summary */}
          {insights.summary && (
            <p className="text-sm text-studio-text-disabled bg-[#0d2137] rounded-lg p-3 border border-[#1a3a5c]">
              {insights.summary}
            </p>
          )}

          {/* Insight cards */}
          {insights.insights?.map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}

          {/* Timestamp */}
          {insights.generated_at && (
            <p className="text-[10px] text-studio-text-secondary text-right">
              Generirano: {new Date(insights.generated_at).toLocaleString('hr-HR')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
