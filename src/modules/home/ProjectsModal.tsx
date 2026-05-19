import { useProjects, useDeleteProject } from '../../hooks/useProjects'

interface ProjectsModalProps {
  onClose: () => void
}

export function ProjectsModal({ onClose }: ProjectsModalProps) {
  const { data: projects = [] } = useProjects()
  const deleteProject = useDeleteProject()

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-slate-100 font-semibold text-lg">Manage Projects</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 text-xl leading-none">×</button>
        </div>
        {projects.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">No projects yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {projects.map(project => (
              <div key={project.id} className="flex items-center gap-3 bg-slate-900 rounded-xl px-4 py-3">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: project.color }}
                />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-slate-200 text-sm">{project.name}</span>
                  {project.description && (
                    <span className="text-slate-500 text-xs truncate">{project.description}</span>
                  )}
                </div>
                <button
                  onClick={() => deleteProject.mutate(project.id)}
                  disabled={deleteProject.isPending}
                  className="text-red-500 hover:text-red-400 text-xs disabled:opacity-40 shrink-0"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
