let gistToken = localStorage.getItem('whatchadoin_gist_token');
let gistId = localStorage.getItem('whatchadoin_gist_id');
let gistFilename = localStorage.getItem('whatchadoin_gist_filename') || 'whatchadoin_data.json';
let lastSyncedStr = '';
let syncTimeout = null;
let isSyncing = false;

export const initSync = (onRemoteUpdate) => {
  if (!gistToken || !gistId) return;

  // 1. Pull on load
  pullFromGist().then(remoteData => {
    if (localStorage.getItem('whatchadoin_force_sync_push') === 'true') {
      localStorage.removeItem('whatchadoin_force_sync_push');
      pushToGist();
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
      // Gist is empty, push local state up to initialize it
      pushToGist();
    }
  });

  // 2. Override setItem to detect changes
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, _value) {
    originalSetItem.apply(this, arguments);
    
    // Ignore sync keys
    if (key === 'whatchadoin_gist_token' || key === 'whatchadoin_gist_id' || key === 'whatchadoin_gist_filename') return;
    
    // Debounce push
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      pushToGist();
    }, 5000); // 5 seconds after last change
  };

  const originalRemoveItem = localStorage.removeItem;
  localStorage.removeItem = function(key) {
    originalRemoveItem.apply(this, arguments);
    
    // Ignore sync keys
    if (key === 'whatchadoin_gist_token' || key === 'whatchadoin_gist_id' || key === 'whatchadoin_gist_filename') return;
    
    // Debounce push
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      pushToGist();
    }, 5000);
  };
};

export const exportLocalData = () => {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key !== 'whatchadoin_gist_token' && key !== 'whatchadoin_gist_id' && key !== 'whatchadoin_gist_filename') {
      data[key] = localStorage.getItem(key);
    }
  }
  // Sort keys to ensure deterministic string representation
  const sortedData = {};
  Object.keys(data).sort().forEach(k => sortedData[k] = data[k]);
  return JSON.stringify(sortedData);
};

export const importLocalData = (jsonStr) => {
  try {
    const data = JSON.parse(jsonStr);
    
    // Remove local keys that are not present in remote data
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key !== 'whatchadoin_gist_token' && key !== 'whatchadoin_gist_id' && key !== 'whatchadoin_gist_filename') {
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
    return true;
  } catch (e) {
    console.error("Failed to parse remote sync data", e);
    return false;
  }
};

const pullFromGist = async () => {
  try {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: { Authorization: `token ${gistToken}` }
    });
    if (!res.ok) return null;
    const gist = await res.json();
    return gist.files[gistFilename]?.content;
  } catch (e) {
    console.error(e);
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

export const saveSyncConfig = (token, id, filename) => {
  localStorage.setItem('whatchadoin_gist_token', token);
  localStorage.setItem('whatchadoin_gist_id', id);
  localStorage.setItem('whatchadoin_gist_filename', filename || 'whatchadoin_data.json');
  gistToken = token;
  gistId = id;
  gistFilename = filename || 'whatchadoin_data.json';
  if (token && id) {
    // Initial push or pull to establish sync
    pullFromGist().then(async remoteData => {
      if (remoteData && remoteData !== '{}' && remoteData.trim() !== '') {
        importLocalData(remoteData);
        window.location.reload();
      } else {
        await pushToGist(); // If it's empty, push current state
        window.location.reload();
      }
    });
  }
};
