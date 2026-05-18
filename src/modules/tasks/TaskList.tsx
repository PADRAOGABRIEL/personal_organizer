import type { Task, Project } from '../../types'
import type { TaskGroups } from './useTasks'
import type { TaskFilter } from './TaskFilterBar'
import { TaskRow } from './TaskRow'
import { QuickAddTask } from './QuickAddTask'

interface TaskListProps {
  groups: TaskGroups
  allTasks: Task[]
  projects: Project[]
  filter: TaskFilter
  onToggle: (id: string) => void
  onSelect: (task: Task) => void
  projectId?: string | null
}

export function TaskList({ groups, allTasks: _allTasks, projects, filter, onToggle, onSelect, projectId }: TaskListProps) {
  const visibleGroups = getVisibleGroups(groups, filter)

  if (visibleGroups.every(g => g.tasks.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-slate-500 text-sm gap-2">
        <p>No tasks here.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-5 overflow-y-auto flex-1">
      {visibleGroups.map(({ label, tasks, dueDate }) => (
        tasks.length > 0 || filter === 'all' ? (
          <section key={label}>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              {label} · {tasks.length}
            </h2>
            <div className="flex flex-col gap-1.5">
              {tasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  projects={projects}
                  onToggle={onToggle}
                  onSelect={onSelect}
                />
              ))}
              <QuickAddTask defaultDueDate={dueDate} projectId={projectId} />
            </div>
          </section>
        ) : null
      ))}
    </div>
  )
}

function getVisibleGroups(groups: TaskGroups, filter: TaskFilter) {
  const today = new Date().toISOString().split('T')[0]
  const allGroups = [
    { label: 'Overdue', tasks: groups.overdue, dueDate: null },
    { label: 'Today', tasks: groups.today, dueDate: today },
    { label: 'This Week', tasks: groups.thisWeek, dueDate: null },
    { label: 'Later', tasks: groups.later, dueDate: null },
    { label: 'No Due Date', tasks: groups.noDueDate, dueDate: null },
  ]
  if (filter === 'all') return allGroups
  if (filter === 'today') return [allGroups[0], allGroups[1]]
  if (filter === 'this-week') return [allGroups[0], allGroups[1], allGroups[2]]
  return allGroups
}
