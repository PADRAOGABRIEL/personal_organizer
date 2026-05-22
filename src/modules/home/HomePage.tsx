import { useState } from 'react'
import { TopBar } from '../../components/layout/TopBar'
import { BubbleChart } from './BubbleChart'
import { StatsStrip } from './StatsStrip'
import { NewProjectModal } from './NewProjectModal'
import { ProjectsModal } from './ProjectsModal'
import { EditProjectModal } from './EditProjectModal'
import { useHomeData } from './useHomeData'
import { SkeletonBlock } from '../../components/SkeletonBlock'

export function HomePage() {
  const [showNewModal, setShowNewModal] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const { projectsWithCounts, openTaskCount, dueTodayCount, isLoading } = useHomeData()

  const editingProject = projectsWithCounts.find(p => p.id === editingProjectId) ?? null

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-900">
      <TopBar />

      <div className="flex flex-col md:relative flex-1 min-h-0">
        {/* Stats — static on mobile, absolute on desktop */}
        <StatsStrip
          activeProjects={projectsWithCounts.length}
          openTasks={openTaskCount}
          dueToday={dueTodayCount}
        />

        {/* Action buttons — right-aligned on mobile, absolute on desktop */}
        <div className="flex items-center gap-2 justify-end px-4 py-2 md:absolute md:top-3 md:right-4 md:px-0 md:py-0 z-10">
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
            + Nova Área
          </button>
        </div>

        {/* BubbleChart area */}
        <div className="relative flex-1 min-h-0">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center gap-6 pointer-events-none">
              <SkeletonBlock className="w-32 h-32 rounded-full" />
              <SkeletonBlock className="w-20 h-20 rounded-full" />
              <SkeletonBlock className="w-28 h-28 rounded-full" />
              <SkeletonBlock className="w-16 h-16 rounded-full" />
            </div>
          ) : projectsWithCounts.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-8">
              <div className="text-4xl mb-1 text-slate-600">◎</div>
              <p className="text-slate-300 text-lg font-medium">Organize sua vida por áreas</p>
              <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
                Áreas são grandes campos da sua vida — como <em>Trabalho</em>, <em>Estudos</em>,{' '}
                <em>Saúde</em> ou <em>Pessoal</em>. Agrupe suas tarefas e eventos dentro de cada
                área para ter uma visão clara das suas prioridades.
              </p>
              <button
                onClick={() => setShowNewModal(true)}
                className="mt-2 text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
              >
                Criar minha primeira área →
              </button>
            </div>
          ) : (
            <BubbleChart
              projects={projectsWithCounts}
              onEdit={setEditingProjectId}
            />
          )}

          {projectsWithCounts.length > 0 && (
            <p className="hidden md:block absolute bottom-3 left-0 right-0 text-center text-slate-600 text-xs pointer-events-none">
              Right-click a bubble to edit
            </p>
          )}
        </div>
      </div>

      {showNewModal && <NewProjectModal onClose={() => setShowNewModal(false)} />}
      {showManageModal && (
        <ProjectsModal
          onClose={() => setShowManageModal(false)}
          onEdit={id => { setShowManageModal(false); setEditingProjectId(id) }}
        />
      )}
      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingProjectId(null)}
        />
      )}
    </div>
  )
}
