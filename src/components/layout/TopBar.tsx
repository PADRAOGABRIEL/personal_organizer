interface TopBarProps {
  action?: React.ReactNode
}

export function TopBar({ action }: TopBarProps) {
  const greeting = getGreeting()
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-end px-5 pb-3 gap-3 shrink-0">
      <div>
        <span className="text-slate-100 font-semibold">{greeting}, Padrao</span>
      </div>
      <span className="ml-auto text-slate-500 text-sm">{dateStr}</span>
      {action && <div className="ml-3">{action}</div>}
    </header>
  )
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}
