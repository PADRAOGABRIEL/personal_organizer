interface StatsStripProps {
  activeProjects: number
  openTasks: number
  dueToday: number
}

export function StatsStrip({ activeProjects, openTasks, dueToday }: StatsStripProps) {
  return (
    <div className="flex gap-2 p-4 absolute top-0 left-0 z-10">
      <Stat value={activeProjects} label="Active Projects" color="text-indigo-400" />
      <Stat value={openTasks} label="Open Tasks" color="text-amber-400" />
      <Stat value={dueToday} label="Due Today" color="text-pink-400" />
    </div>
  )
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="bg-slate-800 rounded-lg px-3 py-2 flex gap-2.5 items-center">
      <span className={`text-xl font-bold ${color}`}>{value}</span>
      <span className="text-slate-500 text-xs leading-tight">{label}</span>
    </div>
  )
}
