export type ProjectStatus = 'active' | 'archived'
export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type Priority = 'low' | 'medium' | 'high'
export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'

export interface Project {
  id: string
  name: string
  description: string | null
  color: string
  status: ProjectStatus
  created_at: string
}

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  due_date: string | null
  due_time: string | null
  duration_minutes: number | null
  project_id: string | null
  recurrence_rule: string | null
  google_event_id: string | null
  created_at: string
}

export interface CalendarEvent {
  id: string
  title: string
  description: string | null
  start_time: string        // ISO timestamptz
  end_time: string | null
  all_day: boolean
  location: string | null
  recurrence_rule: string | null
  recurrence_parent_id: string | null
  google_event_id: string | null
  project_id: string | null
  created_at: string
}

export interface ParsedRecurrence {
  frequency: RecurrenceFrequency
  interval: number
  weekdays?: string[]  // e.g. ['MO', 'WE', 'FR']
}

// Derived type used on the home page bubble chart
export interface ProjectWithTaskCount extends Project {
  open_task_count: number
  total_task_count: number
}
