import { useState } from 'react'
import { TopBar } from '../../components/layout/TopBar'
import { BubbleChart } from './BubbleChart'
import { StatsStrip } from './StatsStrip'
import { NewProjectModal } from './NewProjectModal'
import { useHomeData } from './useHomeData'

export function HomePage() {
  const [showModal, setShowModal] = useState(false)
  const { projectsWithCounts, openTaskCount, dueTodayCount, isLoading } = useHomeData()

  const action = (
    <button
      onClick={() => setShowModal(true)}
      className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm px-3 py-1.5 rounded-lg transition-colors"
    >
      + New Project
    </button>
  )

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-900">
      <TopBar action={action} />

      <div className="relative flex-1 min-h-0">
        <StatsStrip
          activeProjects={projectsWithCounts.length}
          openTasks={openTaskCount}
          dueToday={dueTodayCount}
        />

        {isLoading ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            Loading...
          </div>
        ) : projectsWithCounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500">
            <p className="text-sm">No projects yet.</p>
            <button
              onClick={() => setShowModal(true)}
              className="text-indigo-400 hover:text-indigo-300 text-sm"
            >
              Create your first project →
            </button>
          </div>
        ) : (
          <BubbleChart projects={projectsWithCounts} />
        )}
      </div>

      {showModal && <NewProjectModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
