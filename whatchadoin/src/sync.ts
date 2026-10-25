import {sanitizeAllStorage} from './utils';

export type SyncStatus = 'idle' | 'syncing' | 'pending' | 'error' | 'unconfigured';
export type SyncErrorType = 'auth' | 'scope' | 'notFound' | 'network' | 'parse' | 'unknown';

export interface SyncState {
    status: SyncStatus;
    lastSyncedAt: string | null;
    lastError: string | null;
    errorType?: SyncErrorType | null;
}

type SyncStateListener = (state: SyncState) => void;
const listeners = new Set<SyncStateListener>();

const SYNC_METADATA_KEYS = new Set([
    'whatchadoin_gist_token',
    'whatchadoin_gist_id',
    'whatchadoin_gist_filename',
    'whatchadoin_force_sync_push',
    'whatchadoin_last_synced_at',
    'whatchadoin_last_sync_error',
    'whatchadoin_has_unpushed_changes',
    'whatchadoin_last_modified_at',
]);
export const isSyncMetadataKey = (key: string): boolean => SYNC_METADATA_KEYS.has(key);

// Initial credentials from storage
let gistToken = typeof localStorage !== 'undefined' ? localStorage.getItem('whatchadoin_gist_token') || '' : '';
let gistId = typeof localStorage !== 'undefined' ? localStorage.getItem('whatchadoin_gist_id') || '' : '';
let gistFilename = typeof localStorage !== 'undefined' ? localStorage.getItem('whatchadoin_gist_filename') || 'whatchadoin_data.json' : 'whatchadoin_data.json';

// In-memory sync state
let syncState: SyncState = {
    status: (!gistToken || !gistId)
        ? 'unconfigured'
        : (typeof localStorage !== 'undefined' && localStorage.getItem('whatchadoin_has_unpushed_changes') === 'true')
            ? 'pending'
            : (typeof localStorage !== 'undefined' && localStorage.getItem('whatchadoin_last_sync_error') ? 'error' : 'idle'),
    lastSyncedAt: typeof localStorage !== 'undefined' ? localStorage.getItem('whatchadoin_last_synced_at') : null,
    lastError: typeof localStorage !== 'undefined' ? localStorage.getItem('whatchadoin_last_sync_error') : null,
    errorType: null,
};

let lastSyncedStr = '';
let syncTimeout: ReturnType<typeof setTimeout> | undefined = undefined;
let isSyncing = false;
let syncQueuedWhileBusy = false;
let isImporting = false;

export const getSyncState = (): SyncState => ({...syncState});

export const subscribeSyncState = (listener: SyncStateListener) => {
    listeners.add(listener);
    listener({...syncState});
    return () => {
        listeners.delete(listener);
    };
};

const updateSyncState = (partial: Partial<SyncState>) => {
    syncState = {...syncState, ...partial};
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
            fn({...syncState});
        } catch (e) {
            console.error('Error in syncState listener', e);
        }
    });

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('whatchadoin_sync_status_changed', {detail: {...syncState}}));
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
        info: 'ℹ️', success: '✅', warn: '⚠️', error: '❌',
    };

    const tag = `%c[Cloud Sync ${icon[type]}] [${timestamp}] ${message}`;

    if (type === 'error') {
        console.groupCollapsed(tag, styles[type]);
        if (details) console.error('Details:', details);
        console.info('%c💡 Troubleshooting Tips:\n' + '1. Verify your Personal Access Token at https://github.com/settings/tokens (classic token with "gist" scope checked is required).\n' + '2. Ensure your Gist ID matches the 32-character string in your Gist URL.\n' + '3. Open Settings > Cloud Sync in whatchadoin to re-test your connection.', 'color: #a78bfa; font-weight: normal; line-height: 1.6;');
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
    } catch {
    }

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
        message: `GitHub Error ${res.status}: ${apiMsg || res.statusText || 'Request failed'}`, type: 'unknown'
    };
};

/**
 * Recursively canonicalizes any JSON-serializable value by sorting object keys,
 * ensuring deterministic byte-for-byte serialization.
 */
export const canonicalizeJson = (value: any): any => {
    if (value === null || typeof value !== 'object') {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map(canonicalizeJson);
    }
    const sortedObj: Record<string, any> = {};
    Object.keys(value).sort().forEach(key => {
        sortedObj[key] = canonicalizeJson(value[key]);
    });
    return sortedObj;
};

/**
 * Parses and canonicalizes a data payload or key-value dictionary,
 * parsing inner JSON string values where applicable for true semantic comparison.
 */
export const normalizeSyncPayload = (raw: Record<string, any> | string): Record<string, any> => {
    let parsed: Record<string, any>;
    if (typeof raw === 'string') {
        try {
            parsed = JSON.parse(raw);
        } catch {
            return {};
        }
    } else {
        parsed = raw;
    }

    if (!parsed || typeof parsed !== 'object') return {};

    const normalized: Record<string, any> = {};
    Object.keys(parsed).sort().forEach(k => {
        const val = parsed[k];
        if (typeof val === 'string') {
            try {
                // If the value itself is serialized JSON (e.g., routines or counters array), parse it
                const innerParsed = JSON.parse(val);
                normalized[k] = canonicalizeJson(innerParsed);
            } catch {
                // Plain string (e.g. activeRoutineId)
                normalized[k] = val;
            }
        } else {
            normalized[k] = canonicalizeJson(val);
        }
    });
    return normalized;
};

/**
 * Checks if two sync payloads are semantically identical, ignoring formatting, key ordering,
 * or raw vs parsed JSON differences.
 */
export const isDataSemanticallyEquivalent = (aStr: string, bStr: string): boolean => {
    if (aStr === bStr) return true;
    if (!aStr || !bStr) return false;
    try {
        const normA = JSON.stringify(normalizeSyncPayload(aStr));
        const normB = JSON.stringify(normalizeSyncPayload(bStr));
        return normA === normB;
    } catch {
        return false;
    }
};

export const exportLocalData = () => {
    sanitizeAllStorage();
    const data: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key === null) continue;
        if (key.startsWith('whatchadoin_') && !isSyncMetadataKey(key)) {
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

        // Track which sections actually changed to avoid spurious re-renders
        const changedKeys = new Set<string>();

        // Remove local keys that are not present in remote data (strictly whatchadoin_ data keys)
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key === null) continue;
            if (key.startsWith('whatchadoin_') && !isSyncMetadataKey(key)) {
                if (!data.hasOwnProperty(key)) {
                    keysToRemove.push(key);
                    changedKeys.add(key);
                }
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));

        for (const key in data) {
            const currentVal = localStorage.getItem(key);
            const nextVal = typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]);
            if (currentVal !== nextVal) {
                // Check if semantic difference exists
                let isDiff = true;
                if (currentVal && nextVal) {
                    try {
                        const parsedCurr = JSON.stringify(canonicalizeJson(JSON.parse(currentVal)));
                        const parsedNext = JSON.stringify(canonicalizeJson(JSON.parse(nextVal)));
                        if (parsedCurr === parsedNext) isDiff = false;
                    } catch {
                        isDiff = currentVal !== nextVal;
                    }
                }
                if (isDiff) {
                    localStorage.setItem(key, nextVal);
                    changedKeys.add(key);
                }
            }
        }

        sanitizeAllStorage();

        // If nothing actually changed, don't blast event storms
        if (changedKeys.size === 0) {
            return true;
        }

        if (changedKeys.has('whatchadoin_milestones')) {
            window.dispatchEvent(new CustomEvent('whatchadoin_milestones_updated'));
        }
        if (changedKeys.has('whatchadoin_counters')) {
            window.dispatchEvent(new CustomEvent('whatchadoin_counters_updated'));
        }
        if (changedKeys.has('whatchadoin_quick_tasks')) {
            window.dispatchEvent(new CustomEvent('whatchadoin_quick_tasks_updated'));
        }
        if (changedKeys.has('whatchadoin_coins_entries') || changedKeys.has('whatchadoin_coins_targets')) {
            window.dispatchEvent(new CustomEvent('whatchadoin_coins_updated'));
        }
        if (changedKeys.has('whatchadoin_currency')) {
            window.dispatchEvent(new CustomEvent('whatchadoin_currency_updated'));
        }
        if (changedKeys.has('whatchadoin_quotes')) {
            window.dispatchEvent(new CustomEvent('whatchadoin_quotes_updated'));
        }
        for (const k of changedKeys) {
            if (k.startsWith('whatchadoin_plans_') || k === 'whatchadoin_life_plans') {
                window.dispatchEvent(new CustomEvent('whatchadoin_plans_updated'));
                break;
            }
        }
        if (changedKeys.has('whatchadoin_dispatch')) {
            window.dispatchEvent(new CustomEvent('whatchadoin_dispatch_updated'));
        }
        window.dispatchEvent(new CustomEvent('whatchadoin_cloud_sync_applied'));
        return true;
    } catch (e) {
        logSync('error', 'Failed to parse remote sync data', e);
        return false;
    } finally {
        isImporting = false;
    }
};

export const pullFromGist = async (targetToken = gistToken, targetId = gistId, targetFilename = gistFilename): Promise<{
    data: string | null; error?: string; errorType?: SyncErrorType; remoteUpdatedAt?: string
}> => {
    if (!targetToken || !targetId) {
        return {data: null, error: 'Token and Gist ID are required.', errorType: 'auth'};
    }

    logSync('info', `Reading remote Gist ${targetId.slice(0, 8)}... (${targetFilename})`);

    try {
        const authHeader = targetToken.startsWith('Bearer ') ? targetToken : `Bearer ${targetToken}`;
        const url = `https://api.github.com/gists/${targetId}?_ts=${Date.now()}`;
        const res = await fetch(url, {
            headers: {
                Authorization: authHeader,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
            }
        });

        if (!res.ok) {
            const err = await parseGitHubError(res);
            logSync('error', `Failed to read Gist: ${err.message}`, {
                status: res.status, statusText: res.statusText, gistId: targetId
            });
            return {data: null, error: err.message, errorType: err.type};
        }

        const gist = await res.json();
        const content = gist.files?.[targetFilename]?.content ?? '';
        const remoteUpdatedAt = gist.updated_at;
        logSync('info', `Retrieved Gist ${targetId.slice(0, 8)}: file "${targetFilename}" ${content ? `(${content.length} characters)` : 'is empty or not yet created'}`);
        return {data: content, remoteUpdatedAt};
    } catch (e: any) {
        const msg = e?.message || 'Network request failed';
        const errText = `Network error: ${msg}. Check internet connection or ad-blockers.`;
        logSync('error', errText, e);
        return {data: null, error: errText, errorType: 'network'};
    }
};

export const pushToGist = async (force = false, targetToken = gistToken, targetId = gistId, targetFilename = gistFilename): Promise<{
    success: boolean; error?: string; errorType?: SyncErrorType
}> => {
    if (!targetToken || !targetId) {
        return {success: false, error: 'Token and Gist ID are required.', errorType: 'auth'};
    }

    if (isSyncing) {
        logSync('info', 'Push already in progress. Queueing follow-up sync.');
        syncQueuedWhileBusy = true;
        return {success: true};
    }

    const currentStr = exportLocalData();
    if (!force && (currentStr === lastSyncedStr || isDataSemanticallyEquivalent(currentStr, lastSyncedStr))) {
        localStorage.removeItem('whatchadoin_has_unpushed_changes');
        updateSyncState({status: 'idle'});
        logSync('info', 'Push skipped: Local state is identical to last sync.');
        return {success: true};
    }

    isSyncing = true;
    updateSyncState({status: 'syncing'});
    logSync('info', `Pushing data to Gist ${targetId.slice(0, 8)}: file "${targetFilename}" (${currentStr.length} bytes)...`);

    try {
        const authHeader = targetToken.startsWith('Bearer ') ? targetToken : `Bearer ${targetToken}`;
        const res = await fetch(`https://api.github.com/gists/${targetId}`, {
            method: 'PATCH', headers: {
                Authorization: authHeader,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'Content-Type': 'application/json',
            }, body: JSON.stringify({
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
            localStorage.removeItem('whatchadoin_has_unpushed_changes');
            localStorage.setItem('whatchadoin_last_synced_at', nowIso);
            updateSyncState({status: 'idle', lastSyncedAt: nowIso, lastError: null, errorType: null});
            logSync('success', `Synced to Gist successfully! File: "${targetFilename}" (${currentStr.length} bytes)`, {
                gistId: targetId,
                filename: targetFilename,
                size: currentStr.length,
                timestamp: new Date().toLocaleTimeString()
            });
            return {success: true};
        } else {
            const err = await parseGitHubError(res);
            updateSyncState({status: 'error', lastError: err.message, errorType: err.type});
            logSync('error', `Failed to push to Gist: ${err.message}`, {
                status: res.status, statusText: res.statusText
            });
            return {success: false, error: err.message, errorType: err.type};
        }
    } catch (e: any) {
        const msg = e?.message || 'Network request failed';
        const errText = `Network error: ${msg}. Check internet connection or ad-blockers.`;
        updateSyncState({status: 'error', lastError: errText, errorType: 'network'});
        logSync('error', `Failed to push to Gist: ${errText}`, e);
        return {success: false, error: errText, errorType: 'network'};
    } finally {
        isSyncing = false;
        if (syncQueuedWhileBusy) {
            syncQueuedWhileBusy = false;
            setTimeout(() => {
                pushToGist(false, targetToken, targetId, targetFilename).catch(console.error);
            }, 100);
        }
    }
};

export const triggerManualSync = async (forcePush = false): Promise<{
    success: boolean; error?: string; errorType?: SyncErrorType
}> => {
    if (!gistToken || !gistId) {
        const err = 'Cloud Sync is not configured. Please enter your Token and Gist ID in Settings.';
        updateSyncState({status: 'unconfigured', lastError: err});
        return {success: false, error: err, errorType: 'auth'};
    }

    if (forcePush) {
        logSync('info', 'Manual Force Push triggered...');
        return await pushToGist(true);
    }

    logSync('info', 'Manual Sync triggered: Checking remote Gist...');
    updateSyncState({status: 'syncing'});

    // If local has unpushed changes, push local edits up instead of wiping!
    if (localStorage.getItem('whatchadoin_has_unpushed_changes') === 'true') {
        logSync('info', 'Manual Sync: Unpushed local changes detected. Pushing to Gist...');
        return await pushToGist(true);
    }

    const pullResult = await pullFromGist();
    if (pullResult.error) {
        updateSyncState({status: 'error', lastError: pullResult.error, errorType: pullResult.errorType});
        return {success: false, error: pullResult.error, errorType: pullResult.errorType};
    }

    const remoteData = pullResult.data;
    const localData = exportLocalData();

    if (remoteData && remoteData !== '{}' && remoteData.trim() !== '') {
        if (!isDataSemanticallyEquivalent(remoteData, localData)) {
            const localModified = localStorage.getItem('whatchadoin_last_modified_at');
            const remoteModified = pullResult.remoteUpdatedAt;
            const isLocalNewer = localModified && remoteModified && new Date(localModified).getTime() > new Date(remoteModified).getTime();

            if (isLocalNewer) {
                logSync('info', 'Manual Sync: Local data timestamp is newer than Gist. Pushing local changes...');
                return await pushToGist(true);
            }

            try {
                JSON.parse(remoteData);
                logSync('info', 'Remote data differs from local. Updating local state from Gist...');
                importLocalData(remoteData);
                lastSyncedStr = remoteData;
                const nowIso = new Date().toISOString();
                localStorage.removeItem('whatchadoin_has_unpushed_changes');
                localStorage.setItem('whatchadoin_last_synced_at', nowIso);
                updateSyncState({status: 'idle', lastSyncedAt: nowIso, lastError: null});
                return {success: true};
            } catch {
                const err = `Remote Gist file "${gistFilename}" contains invalid JSON format.`;
                updateSyncState({status: 'error', lastError: err, errorType: 'parse'});
                return {success: false, error: err, errorType: 'parse'};
            }
        } else {
            lastSyncedStr = localData;
            const nowIso = new Date().toISOString();
            localStorage.removeItem('whatchadoin_has_unpushed_changes');
            localStorage.setItem('whatchadoin_last_synced_at', nowIso);
            updateSyncState({status: 'idle', lastSyncedAt: nowIso, lastError: null});
            logSync('success', 'Local data is already completely in sync with remote Gist.');
            return {success: true};
        }
    } else {
        // Remote is empty, push local state
        return await pushToGist(true);
    }
};

export const saveSyncConfig = async (token: string, id: string, filename?: string): Promise<{
    success: boolean;
    error?: string;
    errorType?: SyncErrorType;
    action?: 'pushed' | 'imported' | 'disconnected';
    reloaded?: boolean
}> => {
    const cleanToken = token.trim();
    const cleanId = id.trim();
    const cleanFilename = (filename || 'whatchadoin_data.json').trim();

    if (!cleanToken && !cleanId) {
        // Disconnect
        SYNC_METADATA_KEYS.forEach(k => localStorage.removeItem(k));
        gistToken = '';
        gistId = '';
        gistFilename = 'whatchadoin_data.json';
        updateSyncState({status: 'unconfigured', lastSyncedAt: null, lastError: null, errorType: null});
        logSync('info', 'Cloud Sync disconnected.');
        return {success: true, action: 'disconnected'};
    }

    logSync('info', 'Verifying Cloud Sync credentials with GitHub Gist...');
    updateSyncState({status: 'syncing', lastError: null, errorType: null});

    // 1. Test connection by pulling from Gist
    const pullResult = await pullFromGist(cleanToken, cleanId, cleanFilename);

    if (pullResult.error) {
        updateSyncState({status: 'error', lastError: pullResult.error, errorType: pullResult.errorType});
        logSync('error', `Save & Sync failed during verification: ${pullResult.error}`);
        return {success: false, error: pullResult.error, errorType: pullResult.errorType};
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
                localStorage.removeItem('whatchadoin_has_unpushed_changes');
                localStorage.setItem('whatchadoin_last_synced_at', nowIso);
                updateSyncState({status: 'idle', lastSyncedAt: nowIso, lastError: null, errorType: null});
                logSync('success', 'Remote data successfully imported.');
                return {success: true, action: 'imported', reloaded: true};
            }
        } catch {
            const parseError = `Remote Gist file "${cleanFilename}" does not contain valid JSON (found raw text or non-JSON content). Please put {} in the Gist file on gist.github.com, or use Force Push to overwrite it with your current local data.`;
            updateSyncState({status: 'error', lastError: parseError, errorType: 'parse'});
            logSync('error', parseError);
            return {success: false, error: parseError, errorType: 'parse'};
        }
    }

    // If remote is empty or '{}', push local state to initialize it
    logSync('info', `Remote Gist file is empty or "{}". Pushing local state to initialize cloud backup...`);
    const pushResult = await pushToGist(true, cleanToken, cleanId, cleanFilename);
    if (!pushResult.success) {
        return {success: false, error: pushResult.error, errorType: pushResult.errorType};
    }

    return {success: true, action: 'pushed'};
};

export const initSync = (onRemoteUpdate?: () => void) => {
    if (!gistToken || !gistId) {
        updateSyncState({status: 'unconfigured'});
        logSync('info', 'Cloud Sync is not configured. Local mode active.');
        return;
    }

    updateSyncState({status: 'syncing'});
    logSync('info', `Initializing Cloud Sync with Gist ${gistId.slice(0, 8)}...`);

    // 1. Pull on load
    pullFromGist().then(res => {
        if (res.error) {
            updateSyncState({status: 'error', lastError: res.error, errorType: res.errorType});
            logSync('warn', `Could not reach Gist on startup, operating in offline mode: ${res.error}`);
            return;
        }

        const remoteData = res.data;

        if (localStorage.getItem('whatchadoin_force_sync_push') === 'true') {
            localStorage.removeItem('whatchadoin_force_sync_push');
            pushToGist(true).catch(console.error);
            return;
        }

        const hasUnpushedLocal = localStorage.getItem('whatchadoin_has_unpushed_changes') === 'true';
        const localModified = localStorage.getItem('whatchadoin_last_modified_at');
        const remoteModified = res.remoteUpdatedAt;
        const isLocalNewer = localModified && remoteModified && new Date(localModified).getTime() > new Date(remoteModified).getTime();

        if (remoteData && remoteData !== '{}' && remoteData.trim() !== '') {
            const localData = exportLocalData();
            if (!isDataSemanticallyEquivalent(remoteData, localData)) {
                // If local has unpushed edits newer than Gist, push up instead of wiping!
                if (hasUnpushedLocal || isLocalNewer) {
                    logSync('info', 'Local data has unpushed edits newer than Gist. Pushing local changes up...');
                    pushToGist(true).catch(console.error);
                    return;
                }

                const success = importLocalData(remoteData);
                if (success) {
                    lastSyncedStr = remoteData;
                    const nowIso = new Date().toISOString();
                    localStorage.removeItem('whatchadoin_has_unpushed_changes');
                    localStorage.setItem('whatchadoin_last_synced_at', nowIso);
                    updateSyncState({status: 'idle', lastSyncedAt: nowIso, lastError: null});
                    logSync('success', 'Initial sync: Loaded remote data from Gist.');
                    if (onRemoteUpdate) onRemoteUpdate();
                } else {
                    lastSyncedStr = localData;
                    const err = 'Failed to parse remote sync data.';
                    updateSyncState({status: 'error', lastError: err, errorType: 'parse'});
                }
            } else {
                lastSyncedStr = localData;
                const nowIso = new Date().toISOString();
                localStorage.removeItem('whatchadoin_has_unpushed_changes');
                localStorage.setItem('whatchadoin_last_synced_at', nowIso);
                updateSyncState({status: 'idle', lastSyncedAt: nowIso, lastError: null});
                logSync('success', 'Initial sync: Local data is up to date with remote Gist.');
            }
        } else {
            // Gist file is genuinely empty (HTTP 200), push local state up to initialize it
            logSync('info', 'Gist file is empty, pushing initial local data...');
            pushToGist(true).catch(console.error);
        }
    }).catch(e => {
        const err = e?.message || 'Unknown error during startup sync';
        updateSyncState({status: 'error', lastError: err});
        logSync('error', `Error during startup sync: ${err}`, e);
    });

    const handleStorageChange = (key: string) => {
        if (isImporting) return;
        if (!key.startsWith('whatchadoin_')) return;
        if (isSyncMetadataKey(key)) return;

        // Mark local changes as unpushed and set status to pending
        localStorage.setItem('whatchadoin_has_unpushed_changes', 'true');
        localStorage.setItem('whatchadoin_last_modified_at', new Date().toISOString());
        updateSyncState({status: 'pending'});

        // Debounce push: 5000ms safe interval avoids GitHub rate limits
        clearTimeout(syncTimeout);
        syncTimeout = setTimeout(() => {
            pushToGist().catch(console.error);
        }, 5000);
    };

    // 2. Override setItem to detect changes
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function (key: string, _value: string) {
        originalSetItem.apply(this, [key, _value] as any);
        handleStorageChange(key);
    };

    const originalRemoveItem = localStorage.removeItem;
    localStorage.removeItem = function (key: string) {
        originalRemoveItem.apply(this, [key] as any);
        handleStorageChange(key);
    };

    // 3. Ensure sync happens if user closes tab before debounce fires
    if (typeof window !== 'undefined') {
        const flushPendingSync = () => {
            if (localStorage.getItem('whatchadoin_has_unpushed_changes') === 'true' && gistToken && gistId && !isSyncing) {
                clearTimeout(syncTimeout);
                pushToGist().catch(console.error);
            }
        };

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                flushPendingSync();
            }
        });

        window.addEventListener('pagehide', () => {
            flushPendingSync();
        });
    }
};
