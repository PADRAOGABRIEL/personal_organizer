import { useEffect, useRef } from 'react'
import { useGoogleConnection, useSyncFromGoogle } from './useGoogleConnection'

const SYNC_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

export function useAutoSync() {
  const { data: connection } = useGoogleConnection()
  const syncFromGoogle = useSyncFromGoogle()
  const hasSynced = useRef(false)

  useEffect(() => {
    if (hasSynced.current) return
    if (!connection?.connected) return

    const lastSync = connection.connectedAt ? new Date(connection.connectedAt).getTime() : 0
    const msSinceSync = Date.now() - lastSync

    if (msSinceSync >= SYNC_INTERVAL_MS) {
      hasSynced.current = true
      syncFromGoogle.mutate()
    }
  }, [connection?.connected, connection?.connectedAt])
}
