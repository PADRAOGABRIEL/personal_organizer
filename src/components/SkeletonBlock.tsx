export function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-lg bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-[length:200%_100%] animate-shimmer ${className}`}
    />
  )
}
