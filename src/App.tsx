import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './modules/auth/LoginPage'
import { AuthCallback } from './modules/auth/AuthCallback'
import { HomePage } from './modules/home/HomePage'
import { TasksPage } from './modules/tasks/TasksPage'
import { CalendarPage } from './modules/calendar/CalendarPage'
import { SettingsPage } from './modules/settings/SettingsPage'

function buildQueryClient() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60_000 },
    },
  })

  // Restore persisted cache entries that are less than 10 minutes old
  try {
    const raw = localStorage.getItem('_rq_cache')
    if (raw) {
      const { ts, entries } = JSON.parse(raw) as { ts: number; entries: [unknown[], unknown][] }
      if (Date.now() - ts < 10 * 60_000) {
        entries.forEach(([key, data]) => qc.setQueryData(key, data))
      }
    }
  } catch { /* corrupt storage — ignore */ }

  // Persist successful queries to localStorage (debounced 1s)
  let tid: ReturnType<typeof setTimeout>
  qc.getQueryCache().subscribe(() => {
    clearTimeout(tid)
    tid = setTimeout(() => {
      try {
        const entries = qc
          .getQueryCache()
          .getAll()
          .filter(q => q.state.status === 'success')
          .map(q => [q.queryKey, q.state.data] as [unknown[], unknown])
        localStorage.setItem('_rq_cache', JSON.stringify({ ts: Date.now(), entries }))
      } catch { /* storage quota exceeded — ignore */ }
    }, 1000)
  })

  return qc
}

const queryClient = buildQueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<HomePage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
