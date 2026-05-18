import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Task } from '../../types'

export interface TaskGroups {
  overdue: Task[]
  today: Task[]
  thisWeek: Task[]
  later: Task[]
  noDueDate: Task[]
}

export function groupTasksByHorizon(tasks: Task[]): TaskGroups {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const in7Days = new Date(now)
  in7Days.setDate(now.getDate() + 7)
  const in7Str = in7Days.toISOString().split('T')[0]

  const open = tasks.filter(t => t.status !== 'done')

  return {
    overdue: open.filter(t => t.due_date !== null && t.due_date < todayStr),
    today: open.filter(t => t.due_date === todayStr),
    thisWeek: open.filter(t => t.due_date !== null && t.due_date > todayStr && t.due_date <= in7Str),
    later: open.filter(t => t.due_date !== null && t.due_date > in7Str),
    noDueDate: open.filter(t => t.due_date === null),
  }
}

export function useTasks(projectId?: string | null) {
  return useQuery({
    queryKey: ['tasks', projectId ?? 'all'],
    queryFn: async () => {
      let query = supabase.from('tasks').select('*').order('created_at', { ascending: true })
      if (projectId) query = query.eq('project_id', projectId)
      const { data, error } = await query
      if (error) throw error
      return data as Task[]
    },
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Pick<Task, 'title' | 'due_date' | 'priority' | 'project_id'>) => {
      const { data, error } = await supabase.from('tasks').insert(input).select().single()
      if (error) throw error
      return data as Task
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data as Task
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previous = queryClient.getQueriesData({ queryKey: ['tasks'] })
      queryClient.setQueriesData({ queryKey: ['tasks'] }, (old: Task[] | undefined) =>
        old?.map(t => (t.id === id ? { ...t, ...updates } : t))
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        context.previous.forEach(([key, data]) =>
          queryClient.setQueryData(key, data)
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
