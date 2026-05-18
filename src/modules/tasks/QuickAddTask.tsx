import { useState } from 'react'
import { useCreateTask } from './useTasks'

interface QuickAddTaskProps {
  defaultDueDate?: string | null
  projectId?: string | null
}

export function QuickAddTask({ defaultDueDate, projectId }: QuickAddTaskProps) {
  const [value, setValue] = useState('')
  const create = useCreateTask()

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || !value.trim()) return
    await create.mutateAsync({
      title: value.trim(),
      due_date: defaultDueDate ?? null,
      priority: 'medium',
      project_id: projectId ?? null,
    })
    setValue('')
  }

  return (
    <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-3 py-2 border border-dashed border-slate-700 hover:border-slate-600 transition-colors">
      <span className="text-slate-600 text-lg leading-none">+</span>
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add a task…"
        className="flex-1 bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none"
      />
    </div>
  )
}
