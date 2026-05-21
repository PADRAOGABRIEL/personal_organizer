import { useProjects } from '../../hooks/useProjects'

interface ProjectsModalProps {
  onClose: () => void
  onEdit: (id: string) => void
}

export function ProjectsModal({ onClose, onEdit }: ProjectsModalProps) {
  const { data: projects = [] } = useProjects()

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
                  onClick={() => onEdit(project.id)}
                  className="text-slate-400 hover:text-slate-200 text-xs shrink-0 px-2 py-1 rounded hover:bg-slate-700 transition-colors"
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
