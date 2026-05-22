import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'

export function AppShell() {
  return (
    <div className="fixed inset-0 flex">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden pb-16 md:pb-0">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
