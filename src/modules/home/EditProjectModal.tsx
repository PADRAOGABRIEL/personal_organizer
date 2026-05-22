import { useState } from 'react'
import type { Project } from '../../types'
import { useUpdateProject, useDeleteProject } from '../../hooks/useProjects'

const PRESET_COLORS = [
  '#6366f1', '#f59e0b', '#22c55e', '#06b6d4',
  '#ec4899', '#f97316', '#8b5cf6', '#14b8a6',
]

interface EditProjectModalProps {
  project: Project
  onClose: () => void
}

export function EditProjectModal({ project, onClose }: EditProjectModalProps) {
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description ?? '')
  const [color, setColor] = useState(project.color)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await updateProject.mutateAsync({
      id: project.id,
      name: name.trim(),
      description: description || null,
      color,
    })
    onClose()
  }

  const handleDelete = async () => {
    await deleteProject.mutateAsync(project.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-slate-100 font-semibold text-lg">Editar Área</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional description"
              className="w-full bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600 resize-none"
            />
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-2 block">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-white/50' : 'hover:scale-110'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-between mt-1">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="px-3 py-2 text-sm text-red-500 hover:text-red-400 transition-colors"
              >
                Excluir área
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs">Are you sure?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteProject.isPending}
                  className="px-3 py-1.5 text-xs bg-red-700 hover:bg-red-600 text-white rounded-lg disabled:opacity-50 transition-colors"
                >
                  {deleteProject.isPending ? 'Deleting...' : 'Yes, delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || updateProject.isPending}
                className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {updateProject.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
