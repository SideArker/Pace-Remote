import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import type { Snapshot } from '@pace-remote/protocol';
import { readSnapshot, saveSnapshot } from '../../db';
import { loadConnection, remoteClient } from '../../services/remote/client';

export function useSnapshot(projectId: string, sessionId: string) {
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      const connection = await loadConnection();
      if (!connection) { setError('Pair a Pace host first.'); return; }
      const client = remoteClient();
      await client.connect(connection);
      const next = await client.call<'sessions.snapshot', Snapshot>('sessions.snapshot', { projectId, sessionId });
      setSnapshot(next); setError(''); void saveSnapshot(projectId, next);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Host unavailable.'); }
    finally { setLoading(false); }
  }, [projectId, sessionId]);
  useEffect(() => {
    let active = true;
    void readSnapshot(projectId, sessionId).then(cached => { if (active && cached) { setSnapshot(cached); setLoading(false); } });
    const client = remoteClient();
    const unsubscribe = client.onChanged(event => { if (event.projectId === projectId && event.sessionId === sessionId) void refresh(); });
    const state = AppState.addEventListener('change', next => { if (next === 'active') void refresh(); });
    void refresh();
    return () => { active = false; unsubscribe(); state.remove(); };
  }, [projectId, sessionId, refresh]);
  return { snapshot, loading, error, refresh };
}
