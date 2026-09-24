import { useState, useEffect } from 'react';
import { getSyncState, subscribeSyncState, type SyncState } from '../sync';

export const useSyncStatus = (): SyncState => {
  const [syncState, setSyncState] = useState<SyncState>(getSyncState);

  useEffect(() => {
    return subscribeSyncState((newState) => {
      setSyncState(newState);
    });
  }, []);

  return syncState;
};
