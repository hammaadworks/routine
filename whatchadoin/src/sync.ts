import { sanitizeAllStorage } from './utils';

let gistToken = localStorage.getItem('whatchadoin_gist_token');
let gistId = localStorage.getItem('whatchadoin_gist_id');
let gistFilename = localStorage.getItem('whatchadoin_gist_filename') || 'whatchadoin_data.json';
let lastSyncedStr = '';
let syncTimeout: ReturnType<typeof setTimeout> | undefined = undefined;
let isSyncing = false;
let isImporting = false;

export const initSync = (onRemoteUpdate?: () => void) => {
  if (!gistToken || !gistId) return;

  // 1. Pull on load
  pullFromGist().then(remoteData => {
    if (remoteData === null) {
      console.warn('whatchadoin: Could not reach Gist, operating in offline mode.');
      return;
    }

    if (localStorage.getItem('whatchadoin_force_sync_push') === 'true') {
      localStorage.removeItem('whatchadoin_force_sync_push');
      pushToGist().catch(console.error);
      return;
    }

    if (remoteData && remoteData !== '{}' && remoteData.trim() !== '') {
      const localData = exportLocalData();
      if (remoteData !== localData) {
        const success = importLocalData(remoteData);
        if (success) {
          lastSyncedStr = remoteData;
          if (onRemoteUpdate) onRemoteUpdate();
        } else {
          lastSyncedStr = localData;
        }
      } else {
        lastSyncedStr = localData;
      }
    } else {
      // Gist file is genuinely empty (HTTP 200), push local state up to initialize it
      pushToGist().catch(console.error);
    }
  }).catch(console.error);

  // 2. Override setItem to detect changes
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key: string, _value: string) {
    originalSetItem.apply(this, [key, _value] as any);
    
    if (isImporting) return;
    if (!key.startsWith('whatchadoin_')) return;
    if (key === 'whatchadoin_gist_token' || key === 'whatchadoin_gist_id' || key === 'whatchadoin_gist_filename' || key === 'whatchadoin_force_sync_push') return;
    
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
    if (key === 'whatchadoin_gist_token' || key === 'whatchadoin_gist_id' || key === 'whatchadoin_gist_filename' || key === 'whatchadoin_force_sync_push') return;
    
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
          // Fire and forget using keepalive so it completes even if tab closes
          fetch(`https://api.github.com/gists/${gistId}`, {
            method: 'PATCH',
            headers: {
              Authorization: `token ${gistToken}`,
              Accept: 'application/vnd.github.v3+json',
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
          }).then(res => {
            if (res.ok) lastSyncedStr = currentStr;
          }).catch(console.error);
        }
      }
    });
  }
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
      key !== 'whatchadoin_force_sync_push'
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
        key !== 'whatchadoin_force_sync_push'
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
    console.error("Failed to parse remote sync data", e);
    return false;
  } finally {
    isImporting = false;
  }
};

const pullFromGist = async () => {
  try {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: { Authorization: `token ${gistToken}` }
    });
    if (!res.ok) return null;
    const gist = await res.json();
    return gist.files[gistFilename]?.content ?? '';
  } catch (e) {
    console.error('Failed to pull from Gist:', e);
    return null;
  }
};

const pushToGist = async () => {
  if (isSyncing) return;
  const currentStr = exportLocalData();
  if (currentStr === lastSyncedStr) return; 

  isSyncing = true;
  try {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `token ${gistToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: {
          [gistFilename]: {
            content: currentStr
          }
        }
      })
    });
    if (res.ok) {
      lastSyncedStr = currentStr;
      console.log('Synced to Gist');
    }
  } catch (e) {
    console.error(e);
  } finally {
    isSyncing = false;
  }
};

export const saveSyncConfig = (token: string, id: string, filename?: string) => {
  localStorage.setItem('whatchadoin_gist_token', token);
  localStorage.setItem('whatchadoin_gist_id', id);
  localStorage.setItem('whatchadoin_gist_filename', filename || 'whatchadoin_data.json');
  gistToken = token;
  gistId = id;
  gistFilename = filename || 'whatchadoin_data.json';
  if (token && id) {
    // Initial push or pull to establish sync
    pullFromGist().then(async remoteData => {
      if (remoteData === null) {
        console.error('Failed to connect to GitHub Gist. Please verify your token and Gist ID.');
        return;
      }
      if (remoteData && remoteData !== '{}' && remoteData.trim() !== '') {
        importLocalData(remoteData);
        window.location.reload();
      } else {
        await pushToGist(); // If it's empty, push current state
        window.location.reload();
      }
    }).catch(console.error);
  }
};
