import { useState } from 'react'
import { TopBar } from '../../components/layout/TopBar'
import { BubbleChart } from './BubbleChart'
import { StatsStrip } from './StatsStrip'
import { NewProjectModal } from './NewProjectModal'
import { ProjectsModal } from './ProjectsModal'
import { useHomeData } from './useHomeData'

export function HomePage() {
  const [showNewModal, setShowNewModal] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)
  const { projectsWithCounts, openTaskCount, dueTodayCount, isLoading } = useHomeData()

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-900">
      <TopBar />

      <div className="relative flex-1 min-h-0">
        <StatsStrip
          activeProjects={projectsWithCounts.length}
          openTasks={openTaskCount}
          dueToday={dueTodayCount}
        />

        {/* Action buttons overlaid on canvas */}
        <div className="absolute top-3 right-4 flex items-center gap-2 z-10">
          {projectsWithCounts.length > 0 && (
            <button
              onClick={() => setShowManageModal(true)}
              className="bg-slate-700/80 hover:bg-slate-600 text-slate-400 text-sm px-3 py-1.5 rounded-lg transition-colors backdrop-blur-sm"
            >
              Manage
            </button>
          )}
          <button
            onClick={() => setShowNewModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
          >
            + New Project
          </button>
        </div>

        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
            Loading...
          </div>
        ) : projectsWithCounts.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500">
            <p className="text-sm">No projects yet.</p>
            <button
              onClick={() => setShowNewModal(true)}
              className="text-indigo-400 hover:text-indigo-300 text-sm"
            >
              Create your first project →
            </button>
          </div>
        ) : (
          <BubbleChart projects={projectsWithCounts} />
        )}
      </div>

      {showNewModal && <NewProjectModal onClose={() => setShowNewModal(false)} />}
      {showManageModal && <ProjectsModal onClose={() => setShowManageModal(false)} />}
    </div>
  )
}
