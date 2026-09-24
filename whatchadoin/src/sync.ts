import { sanitizeAllStorage } from './utils';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'unconfigured';
export type SyncErrorType = 'auth' | 'scope' | 'notFound' | 'network' | 'parse' | 'unknown';

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
  errorType?: SyncErrorType | null;
}

type SyncStateListener = (state: SyncState) => void;
const listeners = new Set<SyncStateListener>();

// Initial credentials from storage
let gistToken = typeof localStorage !== 'undefined' ? localStorage.getItem('whatchadoin_gist_token') || '' : '';
let gistId = typeof localStorage !== 'undefined' ? localStorage.getItem('whatchadoin_gist_id') || '' : '';
let gistFilename = typeof localStorage !== 'undefined' ? localStorage.getItem('whatchadoin_gist_filename') || 'whatchadoin_data.json' : 'whatchadoin_data.json';

// In-memory sync state
let syncState: SyncState = {
  status: (!gistToken || !gistId) ? 'unconfigured' : (typeof localStorage !== 'undefined' && localStorage.getItem('whatchadoin_last_sync_error') ? 'error' : 'idle'),
  lastSyncedAt: typeof localStorage !== 'undefined' ? localStorage.getItem('whatchadoin_last_synced_at') : null,
  lastError: typeof localStorage !== 'undefined' ? localStorage.getItem('whatchadoin_last_sync_error') : null,
  errorType: null,
};

let lastSyncedStr = '';
let syncTimeout: ReturnType<typeof setTimeout> | undefined = undefined;
let isSyncing = false;
let isImporting = false;

export const getSyncState = (): SyncState => ({ ...syncState });

export const subscribeSyncState = (listener: SyncStateListener) => {
  listeners.add(listener);
  listener({ ...syncState });
  return () => {
    listeners.delete(listener);
  };
};

const updateSyncState = (partial: Partial<SyncState>) => {
  syncState = { ...syncState, ...partial };
  if (typeof localStorage !== 'undefined') {
    if (syncState.lastSyncedAt) {
      localStorage.setItem('whatchadoin_last_synced_at', syncState.lastSyncedAt);
    }
    if (syncState.lastError) {
      localStorage.setItem('whatchadoin_last_sync_error', syncState.lastError);
    } else if (partial.lastError === null) {
      localStorage.removeItem('whatchadoin_last_sync_error');
    }
  }

  listeners.forEach(fn => {
    try {
      fn({ ...syncState });
    } catch (e) {
      console.error('Error in syncState listener', e);
    }
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('whatchadoin_sync_status_changed', { detail: { ...syncState } }));
  }
};

/**
 * Rich formatted logging in Developer Tools console
 */
export const logSync = (type: 'info' | 'success' | 'warn' | 'error', message: string, details?: any) => {
  const timestamp = new Date().toLocaleTimeString();
  const styles = {
    info: 'color: #38bdf8; font-weight: bold;',
    success: 'color: #4ade80; font-weight: bold;',
    warn: 'color: #facc15; font-weight: bold;',
    error: 'color: #f87171; font-weight: bold;',
  };
  const icon = {
    info: 'ℹ️',
    success: '✅',
    warn: '⚠️',
    error: '❌',
  };

  const tag = `%c[Cloud Sync ${icon[type]}] [${timestamp}] ${message}`;

  if (type === 'error') {
    console.groupCollapsed(tag, styles[type]);
    if (details) console.error('Details:', details);
    console.info(
      '%c💡 Troubleshooting Tips:\n' +
      '1. Verify your Personal Access Token at https://github.com/settings/tokens (classic token with "gist" scope checked is required).\n' +
      '2. Ensure your Gist ID matches the 32-character string in your Gist URL.\n' +
      '3. Open Settings > Cloud Sync in whatchadoin to re-test your connection.',
      'color: #a78bfa; font-weight: normal; line-height: 1.6;'
    );
    console.groupEnd();
  } else if (type === 'warn') {
    if (details !== undefined) {
      console.warn(tag, styles[type], details);
    } else {
      console.warn(tag, styles[type]);
    }
  } else if (type === 'success') {
    if (details !== undefined) {
      console.log(tag, styles[type], details);
    } else {
      console.log(tag, styles[type]);
    }
  } else {
    if (details !== undefined) {
      console.log(tag, styles[type], details);
    } else {
      console.log(tag, styles[type]);
    }
  }
};

const parseGitHubError = async (res: Response): Promise<{ message: string; type: SyncErrorType }> => {
  let apiMsg = '';
  try {
    const data = await res.json();
    if (data && data.message) apiMsg = data.message;
  } catch {}

  if (res.status === 401) {
    return {
      message: `GitHub Error 401 (Bad Credentials): Personal Access Token is invalid, mistyped, or expired.${apiMsg ? ` (${apiMsg})` : ''}`,
      type: 'auth'
    };
  }

  if (res.status === 403) {
    return {
      message: `GitHub Error 403 (Forbidden): Your token likely lacks the required 'gist' permission scope.${apiMsg ? ` (${apiMsg})` : ''}`,
      type: 'scope'
    };
  }

  if (res.status === 404) {
    return {
      message: `GitHub Error 404 (Not Found): Gist ID was not found. If this is a Secret/Private Gist, your token must have the 'gist' scope checked.${apiMsg ? ` (${apiMsg})` : ''}`,
      type: 'notFound'
    };
  }

  if (res.status === 422) {
    return {
      message: `GitHub Error 422 (Unprocessable): GitHub rejected the payload.${apiMsg ? ` (${apiMsg})` : ''}`,
      type: 'unknown'
    };
  }

  return {
    message: `GitHub Error ${res.status}: ${apiMsg || res.statusText || 'Request failed'}`,
    type: 'unknown'
  };
};

export const exportLocalData = () => {
  sanitizeAllStorage();
  const data: Record<string, string | null> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key === null) continue;
    if (
      key.startsWith('whatchadoin_') &&
      key !== 'whatchadoin_gist_token' &&
      key !== 'whatchadoin_gist_id' &&
      key !== 'whatchadoin_gist_filename' &&
      key !== 'whatchadoin_force_sync_push' &&
      key !== 'whatchadoin_last_synced_at' &&
      key !== 'whatchadoin_last_sync_error'
    ) {
      data[key] = localStorage.getItem(key);
    }
  }
  // Sort keys to ensure deterministic string representation
  const sortedData: Record<string, string | null | undefined> = {};
  Object.keys(data).sort().forEach(k => sortedData[k] = data[k]);
  return JSON.stringify(sortedData);
};

export const importLocalData = (jsonStr: string) => {
  isImporting = true;
  try {
    const data = JSON.parse(jsonStr);

    // Remove local keys that are not present in remote data (strictly whatchadoin_ data keys)
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key === null) continue;
      if (
        key.startsWith('whatchadoin_') &&
        key !== 'whatchadoin_gist_token' &&
        key !== 'whatchadoin_gist_id' &&
        key !== 'whatchadoin_gist_filename' &&
        key !== 'whatchadoin_force_sync_push' &&
        key !== 'whatchadoin_last_synced_at' &&
        key !== 'whatchadoin_last_sync_error'
      ) {
        if (!data.hasOwnProperty(key)) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    
    for (const key in data) {
      if (typeof data[key] === 'string') {
        localStorage.setItem(key, data[key]);
      } else {
        localStorage.setItem(key, JSON.stringify(data[key]));
      }
    }
    sanitizeAllStorage();
    return true;
  } catch (e) {
    logSync('error', 'Failed to parse remote sync data', e);
    return false;
  } finally {
    isImporting = false;
  }
};

export const pullFromGist = async (
  targetToken = gistToken, 
  targetId = gistId, 
  targetFilename = gistFilename
): Promise<{ data: string | null; error?: string; errorType?: SyncErrorType }> => {
  if (!targetToken || !targetId) {
    return { data: null, error: 'Token and Gist ID are required.', errorType: 'auth' };
  }

  logSync('info', `Reading remote Gist ${targetId.slice(0, 8)}... (${targetFilename})`);

  try {
    const authHeader = targetToken.startsWith('Bearer ') ? targetToken : `Bearer ${targetToken}`;
    const res = await fetch(`https://api.github.com/gists/${targetId}`, {
      headers: {
        Authorization: authHeader,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      }
    });

    if (!res.ok) {
      const err = await parseGitHubError(res);
      logSync('error', `Failed to read Gist: ${err.message}`, { status: res.status, statusText: res.statusText, gistId: targetId });
      return { data: null, error: err.message, errorType: err.type };
    }

    const gist = await res.json();
    const content = gist.files?.[targetFilename]?.content ?? '';
    logSync('info', `Retrieved Gist ${targetId.slice(0, 8)}: file "${targetFilename}" ${content ? `(${content.length} characters)` : 'is empty or not yet created'}`);
    return { data: content };
  } catch (e: any) {
    const msg = e?.message || 'Network request failed';
    const errText = `Network error: ${msg}. Check internet connection or ad-blockers.`;
    logSync('error', errText, e);
    return { data: null, error: errText, errorType: 'network' };
  }
};

export const pushToGist = async (
  force = false, 
  targetToken = gistToken, 
  targetId = gistId, 
  targetFilename = gistFilename
): Promise<{ success: boolean; error?: string; errorType?: SyncErrorType }> => {
  if (!targetToken || !targetId) {
    return { success: false, error: 'Token and Gist ID are required.', errorType: 'auth' };
  }

  if (isSyncing) {
    logSync('info', 'Push skipped: Sync operation already in progress.');
    return { success: true };
  }

  const currentStr = exportLocalData();
  if (!force && currentStr === lastSyncedStr) {
    logSync('info', 'Push skipped: Local state is identical to last sync.');
    return { success: true };
  }

  isSyncing = true;
  updateSyncState({ status: 'syncing' });
  logSync('info', `Pushing data to Gist ${targetId.slice(0, 8)}: file "${targetFilename}" (${currentStr.length} bytes)...`);

  try {
    const authHeader = targetToken.startsWith('Bearer ') ? targetToken : `Bearer ${targetToken}`;
    const res = await fetch(`https://api.github.com/gists/${targetId}`, {
      method: 'PATCH',
      headers: {
        Authorization: authHeader,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: {
          [targetFilename]: {
            content: currentStr
          }
        }
      })
    });

    if (res.ok) {
      lastSyncedStr = currentStr;
      const nowIso = new Date().toISOString();
      updateSyncState({ status: 'idle', lastSyncedAt: nowIso, lastError: null, errorType: null });
      logSync('success', `Synced to Gist successfully! File: "${targetFilename}" (${currentStr.length} bytes)`, {
        gistId: targetId,
        filename: targetFilename,
        size: currentStr.length,
        timestamp: new Date().toLocaleTimeString()
      });
      return { success: true };
    } else {
      const err = await parseGitHubError(res);
      updateSyncState({ status: 'error', lastError: err.message, errorType: err.type });
      logSync('error', `Failed to push to Gist: ${err.message}`, { status: res.status, statusText: res.statusText });
      return { success: false, error: err.message, errorType: err.type };
    }
  } catch (e: any) {
    const msg = e?.message || 'Network request failed';
    const errText = `Network error: ${msg}. Check internet connection or ad-blockers.`;
    updateSyncState({ status: 'error', lastError: errText, errorType: 'network' });
    logSync('error', `Failed to push to Gist: ${errText}`, e);
    return { success: false, error: errText, errorType: 'network' };
  } finally {
    isSyncing = false;
  }
};

export const triggerManualSync = async (forcePush = false): Promise<{ success: boolean; error?: string; errorType?: SyncErrorType }> => {
  if (!gistToken || !gistId) {
    const err = 'Cloud Sync is not configured. Please enter your Token and Gist ID in Settings.';
    updateSyncState({ status: 'unconfigured', lastError: err });
    return { success: false, error: err, errorType: 'auth' };
  }

  if (forcePush) {
    logSync('info', 'Manual Force Push triggered...');
    return await pushToGist(true);
  }

  logSync('info', 'Manual Sync triggered: Checking remote Gist...');
  updateSyncState({ status: 'syncing' });

  const pullResult = await pullFromGist();
  if (pullResult.error) {
    updateSyncState({ status: 'error', lastError: pullResult.error, errorType: pullResult.errorType });
    return { success: false, error: pullResult.error, errorType: pullResult.errorType };
  }

  const remoteData = pullResult.data;
  const localData = exportLocalData();

  if (remoteData && remoteData !== '{}' && remoteData.trim() !== '') {
    if (remoteData !== localData) {
      try {
        JSON.parse(remoteData);
        logSync('info', 'Remote data differs from local. Updating local state from Gist...');
        importLocalData(remoteData);
        lastSyncedStr = remoteData;
        const nowIso = new Date().toISOString();
        updateSyncState({ status: 'idle', lastSyncedAt: nowIso, lastError: null });
        window.location.reload();
        return { success: true };
      } catch {
        const err = `Remote Gist file "${gistFilename}" contains invalid JSON format.`;
        updateSyncState({ status: 'error', lastError: err, errorType: 'parse' });
        return { success: false, error: err, errorType: 'parse' };
      }
    } else {
      lastSyncedStr = localData;
      const nowIso = new Date().toISOString();
      updateSyncState({ status: 'idle', lastSyncedAt: nowIso, lastError: null });
      logSync('success', 'Local data is already completely in sync with remote Gist.');
      return { success: true };
    }
  } else {
    // Remote is empty, push local state
    return await pushToGist(true);
  }
};

export const saveSyncConfig = async (
  token: string, 
  id: string, 
  filename?: string
): Promise<{ success: boolean; error?: string; errorType?: SyncErrorType; action?: 'pushed' | 'imported' | 'disconnected'; reloaded?: boolean }> => {
  const cleanToken = token.trim();
  const cleanId = id.trim();
  const cleanFilename = (filename || 'whatchadoin_data.json').trim();

  if (!cleanToken && !cleanId) {
    // Disconnect
    localStorage.removeItem('whatchadoin_gist_token');
    localStorage.removeItem('whatchadoin_gist_id');
    localStorage.removeItem('whatchadoin_gist_filename');
    localStorage.removeItem('whatchadoin_last_sync_error');
    gistToken = '';
    gistId = '';
    gistFilename = 'whatchadoin_data.json';
    updateSyncState({ status: 'unconfigured', lastSyncedAt: null, lastError: null, errorType: null });
    logSync('info', 'Cloud Sync disconnected.');
    return { success: true, action: 'disconnected' };
  }

  logSync('info', 'Verifying Cloud Sync credentials with GitHub Gist...');
  updateSyncState({ status: 'syncing', lastError: null, errorType: null });

  // 1. Test connection by pulling from Gist
  const pullResult = await pullFromGist(cleanToken, cleanId, cleanFilename);

  if (pullResult.error) {
    updateSyncState({ status: 'error', lastError: pullResult.error, errorType: pullResult.errorType });
    logSync('error', `Save & Sync failed during verification: ${pullResult.error}`);
    return { success: false, error: pullResult.error, errorType: pullResult.errorType };
  }

  // Connection is valid! Save credentials
  localStorage.setItem('whatchadoin_gist_token', cleanToken);
  localStorage.setItem('whatchadoin_gist_id', cleanId);
  localStorage.setItem('whatchadoin_gist_filename', cleanFilename);
  gistToken = cleanToken;
  gistId = cleanId;
  gistFilename = cleanFilename;

  const remoteData = pullResult.data;

  // If remote has valid non-empty data
  if (remoteData && remoteData !== '{}' && remoteData.trim() !== '') {
    try {
      const parsed = JSON.parse(remoteData);
      if (typeof parsed === 'object' && parsed !== null) {
        logSync('info', 'Remote Gist has existing data. Importing into local storage...');
        importLocalData(remoteData);
        lastSyncedStr = remoteData;
        const nowIso = new Date().toISOString();
        updateSyncState({ status: 'idle', lastSyncedAt: nowIso, lastError: null, errorType: null });
        logSync('success', 'Remote data successfully imported.');
        return { success: true, action: 'imported', reloaded: true };
      }
    } catch {
      const parseError = `Remote Gist file "${cleanFilename}" does not contain valid JSON (found raw text or non-JSON content). Please put {} in the Gist file on gist.github.com, or use Force Push to overwrite it with your current local data.`;
      updateSyncState({ status: 'error', lastError: parseError, errorType: 'parse' });
      logSync('error', parseError);
      return { success: false, error: parseError, errorType: 'parse' };
    }
  }

  // If remote is empty or '{}', push local state to initialize it
  logSync('info', `Remote Gist file is empty or "{}". Pushing local state to initialize cloud backup...`);
  const pushResult = await pushToGist(true, cleanToken, cleanId, cleanFilename);
  if (!pushResult.success) {
    return { success: false, error: pushResult.error, errorType: pushResult.errorType };
  }

  return { success: true, action: 'pushed' };
};

export const initSync = (onRemoteUpdate?: () => void) => {
  if (!gistToken || !gistId) {
    updateSyncState({ status: 'unconfigured' });
    logSync('info', 'Cloud Sync is not configured. Local mode active.');
    return;
  }

  updateSyncState({ status: 'syncing' });
  logSync('info', `Initializing Cloud Sync with Gist ${gistId.slice(0, 8)}...`);

  // 1. Pull on load
  pullFromGist().then(res => {
    if (res.error) {
      updateSyncState({ status: 'error', lastError: res.error, errorType: res.errorType });
      logSync('warn', `Could not reach Gist on startup, operating in offline mode: ${res.error}`);
      return;
    }

    const remoteData = res.data;

    if (localStorage.getItem('whatchadoin_force_sync_push') === 'true') {
      localStorage.removeItem('whatchadoin_force_sync_push');
      pushToGist(true).catch(console.error);
      return;
    }

    if (remoteData && remoteData !== '{}' && remoteData.trim() !== '') {
      const localData = exportLocalData();
      if (remoteData !== localData) {
        const success = importLocalData(remoteData);
        if (success) {
          lastSyncedStr = remoteData;
          const nowIso = new Date().toISOString();
          updateSyncState({ status: 'idle', lastSyncedAt: nowIso, lastError: null });
          logSync('success', 'Initial sync: Loaded remote data from Gist.');
          if (onRemoteUpdate) onRemoteUpdate();
        } else {
          lastSyncedStr = localData;
          const err = 'Failed to parse remote sync data.';
          updateSyncState({ status: 'error', lastError: err, errorType: 'parse' });
        }
      } else {
        lastSyncedStr = localData;
        const nowIso = new Date().toISOString();
        updateSyncState({ status: 'idle', lastSyncedAt: nowIso, lastError: null });
        logSync('success', 'Initial sync: Local data is up to date with remote Gist.');
      }
    } else {
      // Gist file is genuinely empty (HTTP 200), push local state up to initialize it
      logSync('info', 'Gist file is empty, pushing initial local data...');
      pushToGist(true).catch(console.error);
    }
  }).catch(e => {
    const err = e?.message || 'Unknown error during startup sync';
    updateSyncState({ status: 'error', lastError: err });
    logSync('error', `Error during startup sync: ${err}`, e);
  });

  // 2. Override setItem to detect changes
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key: string, _value: string) {
    originalSetItem.apply(this, [key, _value] as any);
    
    if (isImporting) return;
    if (!key.startsWith('whatchadoin_')) return;
    if (
      key === 'whatchadoin_gist_token' || 
      key === 'whatchadoin_gist_id' || 
      key === 'whatchadoin_gist_filename' || 
      key === 'whatchadoin_force_sync_push' ||
      key === 'whatchadoin_last_synced_at' ||
      key === 'whatchadoin_last_sync_error'
    ) return;
    
    // Debounce push
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      pushToGist().catch(console.error);
    }, 5000); // 5 seconds after last change
  };

  const originalRemoveItem = localStorage.removeItem;
  localStorage.removeItem = function(key: string) {
    originalRemoveItem.apply(this, [key] as any);
    
    if (isImporting) return;
    if (!key.startsWith('whatchadoin_')) return;
    if (
      key === 'whatchadoin_gist_token' || 
      key === 'whatchadoin_gist_id' || 
      key === 'whatchadoin_gist_filename' || 
      key === 'whatchadoin_force_sync_push' ||
      key === 'whatchadoin_last_synced_at' ||
      key === 'whatchadoin_last_sync_error'
    ) return;
    
    // Debounce push
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      pushToGist().catch(console.error);
    }, 5000);
  };

  // 3. Ensure sync happens if user closes tab before debounce fires
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        const currentStr = exportLocalData();
        if (currentStr !== lastSyncedStr && gistToken && gistId) {
          const authHeader = gistToken.startsWith('Bearer ') ? gistToken : `Bearer ${gistToken}`;
          fetch(`https://api.github.com/gists/${gistId}`, {
            method: 'PATCH',
            headers: {
              Authorization: authHeader,
              Accept: 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              files: {
                [gistFilename]: {
                  content: currentStr
                }
              }
            }),
            keepalive: true
          }).then(async res => {
            if (res.ok) {
              lastSyncedStr = currentStr;
              updateSyncState({ status: 'idle', lastSyncedAt: new Date().toISOString(), lastError: null });
              logSync('success', 'Background visibilitychange sync completed');
            } else {
              const err = await parseGitHubError(res);
              updateSyncState({ status: 'error', lastError: err.message, errorType: err.type });
              logSync('error', `Background sync failed: ${err.message}`);
            }
          }).catch(e => {
            logSync('error', 'Background sync network error', e);
          });
        }
      }
    });
  }
};
