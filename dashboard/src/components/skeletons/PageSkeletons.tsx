/**
 * Page-specific skeleton loading states.
 *
 * These replace the generic spinner with layout-matching placeholders
 * that maintain spatial continuity during route transitions.
 * Studies show skeletons reduce perceived loading time by ~67% vs spinners.
 */

// Reusable building blocks
const Bone = ({ className }: { className: string }) => (
  <div className={`bg-studio-surface-3 rounded-lg animate-pulse ${className}`} />
)

const CardSkeleton = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-studio-surface-0 border border-studio-border rounded-2xl p-6 ${className}`}>
    {children}
  </div>
)

// ---------------------------------------------------------------------------
// Dashboard skeleton — 4 metric cards + chart + activity feed
// ---------------------------------------------------------------------------
export function DashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-200">
      {/* Header area */}
      <div className="flex items-center justify-between">
        <div>
          <Bone className="h-7 w-44 mb-2" />
          <Bone className="h-4 w-28" />
        </div>
        <Bone className="h-9 w-32 rounded-xl" />
      </div>

      {/* Metric cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <CardSkeleton key={i}>
            <Bone className="h-3 w-20 mb-3" />
            <Bone className="h-8 w-24 mb-2" />
            <Bone className="h-3 w-16" />
          </CardSkeleton>
        ))}
      </div>

      {/* Chart area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CardSkeleton className="lg:col-span-2">
          <Bone className="h-4 w-32 mb-4" />
          <Bone className="h-52 w-full rounded-xl" />
        </CardSkeleton>
        <CardSkeleton>
          <Bone className="h-4 w-24 mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Bone className="h-8 w-8 rounded-lg flex-shrink-0" />
                <div className="flex-1">
                  <Bone className="h-3 w-full mb-1.5" />
                  <Bone className="h-2.5 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </CardSkeleton>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Table-based page skeleton (Analytics, Competitors, Campaigns, etc.)
// ---------------------------------------------------------------------------
export function TablePageSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Bone className="h-7 w-40 mb-2" />
          <Bone className="h-4 w-56" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-9 w-24 rounded-xl" />
          <Bone className="h-9 w-9 rounded-xl" />
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex gap-3">
        <Bone className="h-9 w-32 rounded-xl" />
        <Bone className="h-9 w-32 rounded-xl" />
        <Bone className="h-9 w-24 rounded-xl" />
      </div>

      {/* Table */}
      <CardSkeleton>
        <div className="space-y-4">
          {/* Header row */}
          <div className="flex gap-4 pb-3 border-b border-studio-border">
            <Bone className="h-3 w-32" />
            <Bone className="h-3 w-24" />
            <Bone className="h-3 w-20" />
            <Bone className="h-3 w-16 ml-auto" />
          </div>
          {/* Data rows */}
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Bone className="h-8 w-8 rounded-lg flex-shrink-0" />
              <Bone className="h-4 w-40" />
              <Bone className="h-4 w-24" />
              <Bone className="h-4 w-16" />
              <Bone className="h-6 w-16 rounded-full ml-auto" />
            </div>
          ))}
        </div>
      </CardSkeleton>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Form-based page skeleton (BrandProfile, Settings)
// ---------------------------------------------------------------------------
export function FormPageSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Bone className="h-7 w-36 mb-2" />
          <Bone className="h-4 w-48" />
        </div>
        <Bone className="h-9 w-24 rounded-xl" />
      </div>

      {/* Form cards */}
      {[...Array(3)].map((_, i) => (
        <CardSkeleton key={i}>
          <div className="flex items-center gap-3 mb-5">
            <Bone className="h-10 w-10 rounded-xl" />
            <div>
              <Bone className="h-4 w-32 mb-1.5" />
              <Bone className="h-3 w-48" />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <Bone className="h-3 w-20 mb-2" />
              <Bone className="h-10 w-full rounded-xl" />
            </div>
            <div>
              <Bone className="h-3 w-24 mb-2" />
              <Bone className="h-24 w-full rounded-xl" />
            </div>
          </div>
        </CardSkeleton>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Generic skeleton — used as fallback for pages without a custom skeleton
// ---------------------------------------------------------------------------
export function GenericPageSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-200">
      <div>
        <Bone className="h-7 w-44 mb-2" />
        <Bone className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardSkeleton>
          <Bone className="h-4 w-32 mb-4" />
          <Bone className="h-40 w-full rounded-xl" />
        </CardSkeleton>
        <CardSkeleton>
          <Bone className="h-4 w-28 mb-4" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Bone key={i} className="h-10 w-full rounded-xl" />
            ))}
          </div>
        </CardSkeleton>
      </div>
    </div>
  )
}
