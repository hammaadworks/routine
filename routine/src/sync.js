let gistToken = localStorage.getItem('gist_token');
let gistId = localStorage.getItem('gist_id');
let gistFilename = localStorage.getItem('gist_filename') || 'habits_data.json';
let lastSyncedStr = '';
let syncTimeout = null;
let isSyncing = false;

export const initSync = (onRemoteUpdate) => {
  if (!gistToken || !gistId) return;

  // 1. Pull on load
  pullFromGist().then(remoteData => {
    if (remoteData) {
      const localData = exportLocalData();
      if (remoteData !== localData) {
        importLocalData(remoteData);
        if (onRemoteUpdate) onRemoteUpdate();
      } else {
        lastSyncedStr = localData;
      }
    }
  });

  // 2. Override setItem to detect changes
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    
    // Ignore sync keys
    if (key === 'gist_token' || key === 'gist_id' || key === 'gist_filename') return;
    
    // Debounce push
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      pushToGist();
    }, 5000); // 5 seconds after last change
  };
};

export const exportLocalData = () => {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key !== 'gist_token' && key !== 'gist_id' && key !== 'gist_filename') {
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
    for (const key in data) {
      localStorage.setItem(key, data[key]);
    }
  } catch (e) {
    console.error("Failed to parse remote sync data", e);
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
  localStorage.setItem('gist_token', token);
  localStorage.setItem('gist_id', id);
  localStorage.setItem('gist_filename', filename || 'habits_data.json');
  gistToken = token;
  gistId = id;
  gistFilename = filename || 'habits_data.json';
  if (token && id) {
    // Initial push or pull to establish sync
    pullFromGist().then(remoteData => {
      if (remoteData) {
        importLocalData(remoteData);
        window.location.reload();
      } else {
        pushToGist(); // If it's empty, push current state
      }
    });
  }
};
