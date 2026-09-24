import * as React from 'react';
import {DatabaseBackup, Import, Settings, CheckCircle2, AlertTriangle, RefreshCw, CloudOff, Loader2, ExternalLink} from 'lucide-react';
import BaseModal from './BaseModal';
import AIConfigEditor from './AIConfigEditor';
import CopyBanner from './CopyBanner';
import Dropdown from './Dropdown';
import { useCurrency, CURRENCIES } from '../hooks/useCurrency';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { triggerManualSync } from '../sync';

interface SyncForm {
    token: string;
    id: string;
    filename: string;
}

interface SettingsModalProps {
    showSettingsModal: boolean;
    setShowSettingsModal: (show: boolean) => void;
    settingsTab: string;
    setSettingsTab: (tab: string) => void;
    syncForm: SyncForm;
    setSyncForm: (form: SyncForm) => void;
    saveSyncConfig: (token: string, id: string, filename: string) => Promise<any> | any;
    aiConfig: any;
    setAiConfig: (config: any) => void;
    exportAllData: () => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
}

export default function SettingsModal({
                                          showSettingsModal,
                                          setShowSettingsModal,
                                          settingsTab,
                                          setSettingsTab,
                                          syncForm,
                                          setSyncForm,
                                          saveSyncConfig,
                                          aiConfig,
                                          setAiConfig,
                                          exportAllData,
                                          fileInputRef
                                      }: SettingsModalProps) {
    const { currency, setCurrency } = useCurrency();
    const syncState = useSyncStatus();
    const [isSaving, setIsSaving] = React.useState(false);
    const [isSyncingNow, setIsSyncingNow] = React.useState(false);
    const [isForcePushing, setIsForcePushing] = React.useState(false);
    const [feedbackMsg, setFeedbackMsg] = React.useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

    const handleSaveAndSync = async () => {
        setIsSaving(true);
        setFeedbackMsg(null);
        try {
            const res: any = await saveSyncConfig(syncForm.token, syncForm.id, syncForm.filename);
            if (res && res.success) {
                setFeedbackMsg({
                    type: 'success',
                    text: res.action === 'imported'
                        ? 'Connected! Downloaded routines from remote Gist.'
                        : 'Connected & synced successfully to GitHub Gist!'
                });
                if (res.reloaded) {
                    setTimeout(() => {
                        window.location.reload();
                    }, 800);
                } else {
                    setTimeout(() => {
                        setShowSettingsModal(false);
                    }, 1400);
                }
            } else {
                setFeedbackMsg({
                    type: 'error',
                    text: (res && res.error) || 'Failed to connect to GitHub Gist.'
                });
            }
        } catch (e: any) {
            setFeedbackMsg({
                type: 'error',
                text: e?.message || 'Error occurred while saving sync settings.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSyncNow = async () => {
        setIsSyncingNow(true);
        setFeedbackMsg(null);
        try {
            const res = await triggerManualSync(false);
            if (res.success) {
                setFeedbackMsg({ type: 'success', text: 'Synced to Gist successfully!' });
            } else {
                setFeedbackMsg({ type: 'error', text: res.error || 'Sync failed.' });
            }
        } catch (e: any) {
            setFeedbackMsg({ type: 'error', text: e?.message || 'Sync failed.' });
        } finally {
            setIsSyncingNow(false);
        }
    };

    const handleForcePush = async () => {
        if (!window.confirm("Overwrite remote Gist with your current local routines and data?")) return;
        setIsForcePushing(true);
        setFeedbackMsg(null);
        try {
            const res = await triggerManualSync(true);
            if (res.success) {
                setFeedbackMsg({ type: 'success', text: 'Local state force-pushed to Gist successfully!' });
            } else {
                setFeedbackMsg({ type: 'error', text: res.error || 'Force push failed.' });
            }
        } catch (e: any) {
            setFeedbackMsg({ type: 'error', text: e?.message || 'Force push failed.' });
        } finally {
            setIsForcePushing(false);
        }
    };

    return (<BaseModal
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            drawerMode="tablet"
            title={<span style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <Settings size={18} color="var(--accent)"/> Settings
        </span>}
        >
            <div style={{
                display: 'flex',
                borderBottom: '1px solid var(--panel-border)',
                marginBottom: '16px',
                overflowX: 'auto'
            }}>
                <button
                    onClick={() => setSettingsTab('sync')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: settingsTab === 'sync' ? '2px solid var(--accent)' : '2px solid transparent',
                        color: settingsTab === 'sync' ? '#fff' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap'
                    }}
                >
                    Cloud Sync
                </button>
                <button
                    onClick={() => setSettingsTab('ai')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: settingsTab === 'ai' ? '2px solid var(--accent)' : '2px solid transparent',
                        color: settingsTab === 'ai' ? '#fff' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap'
                    }}
                >
                    AI Config
                </button>

                <button
                    onClick={() => setSettingsTab('general')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: settingsTab === 'general' ? '2px solid var(--accent)' : '2px solid transparent',
                        color: settingsTab === 'general' ? '#fff' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap'
                    }}
                >
                    General
                </button>
            </div>

            {settingsTab === 'sync' && (<div
                    style={{display: 'flex', flexDirection: 'column', gap: '16px'}}
                    onPaste={(e) => {
                        const text = e.clipboardData.getData('text');
                        if (text.includes('PAT=') || text.includes('GID=') || text.includes('FILE=')) {
                            e.preventDefault();
                            const lines = text.split('\n');
                            let newSyncForm = {...syncForm};
                            lines.forEach(line => {
                                const [key, ...valParts] = line.split('=');
                                if (!key) return;
                                const val = valParts.join('=').trim();
                                const k = key.trim().toUpperCase();
                                if (k === 'PAT') newSyncForm.token = val;
                                if (k === 'GID') newSyncForm.id = val;
                                if (k === 'FILE') newSyncForm.filename = val;
                            });
                            setSyncForm(newSyncForm);
                        }
                    }}
                >
                    {/* Live Sync Status Banner */}
                    <div style={{
                        borderRadius: '10px',
                        padding: '14px 16px',
                        border: 
                            syncState.status === 'error'
                                ? '1px solid rgba(239, 68, 68, 0.4)'
                                : syncState.status === 'syncing'
                                ? '1px solid rgba(59, 130, 246, 0.4)'
                                : syncState.status === 'idle'
                                ? '1px solid rgba(16, 185, 129, 0.3)'
                                : '1px solid var(--panel-border)',
                        background: 
                            syncState.status === 'error'
                                ? 'rgba(239, 68, 68, 0.08)'
                                : syncState.status === 'syncing'
                                ? 'rgba(59, 130, 246, 0.08)'
                                : syncState.status === 'idle'
                                ? 'rgba(16, 185, 129, 0.06)'
                                : 'rgba(255, 255, 255, 0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                    }}>
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px'}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0}}>
                                {syncState.status === 'error' ? (
                                    <AlertTriangle size={20} color="#EF4444" style={{flexShrink: 0}} />
                                ) : syncState.status === 'syncing' ? (
                                    <Loader2 size={20} color="#3B82F6" className="spin" style={{flexShrink: 0}} />
                                ) : syncState.status === 'idle' ? (
                                    <CheckCircle2 size={20} color="#10B981" style={{flexShrink: 0}} />
                                ) : (
                                    <CloudOff size={20} color="var(--text-secondary)" style={{flexShrink: 0}} />
                                )}
                                <div style={{minWidth: 0}}>
                                    <div style={{
                                        fontWeight: 'bold',
                                        fontSize: '14px',
                                        color: 
                                            syncState.status === 'error'
                                                ? '#EF4444'
                                                : syncState.status === 'syncing'
                                                ? '#3B82F6'
                                                : syncState.status === 'idle'
                                                ? '#10B981'
                                                : 'var(--text-primary)'
                                    }}>
                                        {syncState.status === 'error' && 'Sync Error'}
                                        {syncState.status === 'syncing' && 'Syncing with GitHub Gist...'}
                                        {syncState.status === 'idle' && 'Connected & In Sync'}
                                        {syncState.status === 'unconfigured' && 'Cloud Sync Disconnected'}
                                    </div>
                                    <div style={{fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', wordBreak: 'break-word'}}>
                                        {syncState.status === 'idle' && (
                                            syncState.lastSyncedAt
                                                ? `Last synced: ${new Date(syncState.lastSyncedAt).toLocaleTimeString()}`
                                                : 'Ready and in sync'
                                        )}
                                        {syncState.status === 'syncing' && 'Transferring data with api.github.com...'}
                                        {syncState.status === 'error' && (syncState.lastError || 'Failed to sync with GitHub Gist')}
                                        {syncState.status === 'unconfigured' && 'Sync your routines, tasks, and goals across devices using a secret GitHub Gist.'}
                                    </div>
                                </div>
                            </div>

                            {/* Quick Sync Button if configured */}
                            {syncState.status !== 'unconfigured' && (
                                <button
                                    type="button"
                                    onClick={handleSyncNow}
                                    disabled={isSyncingNow || syncState.status === 'syncing'}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        border: '1px solid var(--panel-border)',
                                        color: 'var(--text-primary)',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        cursor: (isSyncingNow || syncState.status === 'syncing') ? 'not-allowed' : 'pointer',
                                        whiteSpace: 'nowrap',
                                        flexShrink: 0
                                    }}
                                    title="Sync immediately"
                                >
                                    <RefreshCw size={14} className={(isSyncingNow || syncState.status === 'syncing') ? 'spin' : ''} />
                                    <span>{isSyncingNow ? 'Syncing...' : 'Sync Now'}</span>
                                </button>
                            )}
                        </div>

                        {/* Connected details row & quick actions */}
                        {syncState.status === 'idle' && syncForm.id && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                                paddingTop: '8px',
                                fontSize: '11px',
                                color: 'var(--text-secondary)',
                                flexWrap: 'wrap',
                                gap: '8px'
                            }}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                    <span>Gist:</span>
                                    <a
                                        href={`https://gist.github.com/${syncForm.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px'}}
                                    >
                                        {syncForm.id.slice(0, 10)}... <ExternalLink size={10} />
                                    </a>
                                    <span>&bull;</span>
                                    <span style={{fontFamily: 'monospace'}}>{syncForm.filename || 'whatchadoin_data.json'}</span>
                                </div>
                                <div style={{display: 'flex', gap: '8px'}}>
                                    <button
                                        type="button"
                                        onClick={handleForcePush}
                                        disabled={isForcePushing}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--accent)',
                                            cursor: isForcePushing ? 'not-allowed' : 'pointer',
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            padding: 0,
                                            textDecoration: 'underline'
                                        }}
                                        title="Force push all local data to overwrite Gist"
                                    >
                                        {isForcePushing ? 'Pushing...' : 'Force Push Local Data'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Contextual help for errors */}
                        {syncState.status === 'error' && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.12)',
                                borderRadius: '6px',
                                padding: '10px 12px',
                                fontSize: '12px',
                                color: '#FCA5A5',
                                lineHeight: 1.5,
                                border: '1px solid rgba(239, 68, 68, 0.25)'
                            }}>
                                {syncState.lastError?.includes('403') || syncState.lastError?.includes('scope') ? (
                                    <div>
                                        <strong>Fix: Missing 'gist' Scope</strong><br />
                                        Your GitHub Personal Access Token needs the <code>gist</code> permission scope.<br />
                                        <a
                                            href="https://github.com/settings/tokens/new?scopes=gist&description=whatchadoin+Sync"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{color: '#67E8F9', fontWeight: 'bold', textDecoration: 'underline', display: 'inline-block', marginTop: '6px'}}
                                        >
                                            Generate Classic Token with 'gist' Scope &rarr;
                                        </a>
                                    </div>
                                ) : syncState.lastError?.includes('401') ? (
                                    <div>
                                        <strong>Fix: Invalid Token</strong><br />
                                        Your token was rejected as Bad Credentials. Please create a new token with the <code>gist</code> scope and paste it below.
                                    </div>
                                ) : syncState.lastError?.includes('404') ? (
                                    <div>
                                        <strong>Fix: Gist ID Not Found</strong><br />
                                        Verify the Gist ID from your Gist's URL. If your Gist is Secret/Private, GitHub returns 404 unless your token has the <code>gist</code> scope.
                                    </div>
                                ) : syncState.lastError?.includes('parse') || syncState.lastError?.includes('JSON') ? (
                                    <div>
                                        <strong>Fix: Gist Content is Not JSON</strong><br />
                                        The file in your Gist must contain valid JSON (or <code>{"{}"}</code>). You can click <strong>Force Push Local Data</strong> above to overwrite it with your current routines.
                                    </div>
                                ) : (
                                    <div>
                                        <strong>Troubleshooting:</strong><br />
                                        Check your token permissions and make sure you have internet access. You can open Developer Tools (F12) for detailed network logs.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Feedback message banner if triggered by actions */}
                    {feedbackMsg && (
                        <div style={{
                            padding: '10px 14px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '500',
                            border: feedbackMsg.type === 'error' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
                            background: feedbackMsg.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: feedbackMsg.type === 'error' ? '#F87171' : '#34D399',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px'
                        }}>
                            <span>{feedbackMsg.text}</span>
                            <button
                                type="button"
                                onClick={() => setFeedbackMsg(null)}
                                style={{background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold'}}
                            >
                                &times;
                            </button>
                        </div>
                    )}

                    <CopyBanner 
                        title="Setup another device? Copy this config."
                        textToCopy={`PAT=${syncForm.token || ''}\nGID=${syncForm.id || ''}\nFILE=${syncForm.filename || ''}`}
                    />
                    <div>
                        <label style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '6px'
                        }}>
                            <span>GitHub Personal Access Token</span>
                            <a href="https://github.com/settings/tokens/new?scopes=gist&description=whatchadoin+Sync"
                               target="_blank" rel="noopener noreferrer"
                               style={{color: 'var(--accent)', textDecoration: 'none', fontWeight: 'bold'}}>Create
                                Token &rarr;</a>
                        </label>
                        <input name="auto_field_37"
                            type="password"
                            placeholder="ghp_..."
                            value={syncForm.token}
                            onChange={(e) => setSyncForm({...syncForm, token: e.target.value.trim()})}
                            style={{
                                width: '100%',
                                fontFamily: 'monospace',
                                padding: '10px',
                                background: 'var(--bg)',
                                border: '1px solid var(--panel-border)',
                                borderRadius: '6px',
                                color: '#fff'
                            }}
                        />
                        {syncForm.token && !syncForm.token.startsWith('ghp_') && !syncForm.token.startsWith('github_pat_') && (
                            <div style={{fontSize: '11px', color: 'var(--danger)', marginTop: '4px'}}>
                                Token usually starts with "ghp_" or "github_pat_".
                            </div>)}
                    </div>
                    <div>
                        <label style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '6px'
                        }}>
                            <span>Gist ID</span>
                            <a href="https://gist.github.com" target="_blank" rel="noopener noreferrer"
                               style={{color: 'var(--accent)', textDecoration: 'none', fontWeight: 'bold'}}>Create
                                Gist &rarr;</a>
                        </label>
                        <input name="auto_field_38"
                            type="text"
                            placeholder="e.g. 8a892b3c..."
                            value={syncForm.id}
                            onChange={(e) => {
                                let val = e.target.value.trim();
                                try {
                                    if (val.includes('gist.github.com')) {
                                        const url = new URL(val.startsWith('http') ? val : 'https://' + val);
                                        const parts = url.pathname.split('/').filter(Boolean);
                                        val = parts[parts.length - 1] || val;
                                    }
                                } catch {
                                }
                                setSyncForm({...syncForm, id: val});
                            }}
                            style={{
                                width: '100%',
                                fontFamily: 'monospace',
                                padding: '10px',
                                background: 'var(--bg)',
                                border: '1px solid var(--panel-border)',
                                borderRadius: '6px',
                                color: '#fff'
                            }}
                        />
                        {syncForm.id && !/^[a-f0-9]{32}$/i.test(syncForm.id) ? (
                            <div style={{fontSize: '11px', color: 'var(--danger)', marginTop: '4px'}}>
                                Gist ID should be a 32-character alphanumeric string.
                            </div>) : (
                            <div style={{fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px'}}>
                                You can paste the full Gist URL or just the ID: gist.github.com/user/<b>[GIST_ID]</b>
                            </div>)}
                    </div>
                    <div>
                        <label style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            display: 'block',
                            marginBottom: '6px'
                        }}>Filename</label>
                        <input name="auto_field_39"
                            type="text"
                            placeholder="e.g. whatchadoin_data.json"
                            value={syncForm.filename}
                            onChange={(e) => setSyncForm({...syncForm, filename: e.target.value.trim()})}
                            style={{
                                width: '100%',
                                fontFamily: 'monospace',
                                padding: '10px',
                                background: 'var(--bg)',
                                border: '1px solid var(--panel-border)',
                                borderRadius: '6px',
                                color: '#fff'
                            }}
                        />
                    </div>
                    <div style={{display: 'flex', gap: '8px', marginTop: '16px'}}>
                        <button
                            type="button"
                            onClick={async () => {
                                setSyncForm({token: '', id: '', filename: 'whatchadoin_data.json'});
                                await saveSyncConfig('', '', '');
                                setFeedbackMsg({ type: 'info', text: 'Cloud sync disconnected.' });
                            }}
                            style={{
                                flex: 1,
                                padding: '10px 0',
                                borderRadius: '6px',
                                fontWeight: '500',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: 'var(--text-secondary)',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            Disconnect
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveAndSync}
                            className="primary"
                            style={{
                                flex: 2, 
                                padding: '10px 0', 
                                borderRadius: '6px', 
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                opacity: isSaving ? 0.8 : 1,
                                cursor: isSaving ? 'wait' : 'pointer'
                            }}
                            disabled={Boolean(isSaving || (syncForm.id && !/^[a-f0-9]{32}$/i.test(syncForm.id)) || (syncForm.token && !syncForm.token.startsWith('ghp_') && !syncForm.token.startsWith('github_pat_')))}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 size={16} className="spin" />
                                    <span>Connecting & Testing...</span>
                                </>
                            ) : (
                                'Save & Sync'
                            )}
                        </button>
                    </div>
                </div>)}

            {settingsTab === 'ai' && (<div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                    <AIConfigEditor config={aiConfig} setConfig={setAiConfig}/>
                    <div style={{display: 'flex', gap: '8px', marginTop: '16px'}}>
                        <button
                            type="button"
                            onClick={() => {
                                setShowSettingsModal(false);
                            }}
                            className="primary"
                            style={{flex: 1, padding: '10px 0', borderRadius: '6px', fontWeight: 'bold'}}
                        >
                            Done
                        </button>
                    </div>
                </div>)}

            {settingsTab === 'general' && (
                <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                    <div>
                        <h3 style={{marginTop: 0, marginBottom: '8px', color: 'var(--text-primary)'}}>Localization & Preferences</h3>
                        <p style={{fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px'}}>
                            Customize how money goals and amounts are displayed across the app.
                        </p>
                        
                        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                            <label style={{fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-secondary)'}}>
                                Default Currency
                            </label>
                            <Dropdown
                                options={CURRENCIES.map(c => ({ value: c.code, label: c.label }))}
                                value={currency}
                                onChange={(val) => setCurrency(val as string)}
                                placeholder="Select currency..."
                            />
                        </div>
                    </div>

                    <div style={{borderTop: '1px solid var(--panel-border)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px'}}>
                        <h3 style={{marginTop: 0, marginBottom: '0px', color: 'var(--text-primary)'}}>Data Backup & Restore</h3>
                        <p style={{fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5}}>
                            Export all your routines, plans, and goals, or restore from a previous full backup. This is
                            useful for migrating to a new device without using Cloud Sync.
                        </p>

                        <button
                            onClick={exportAllData}
                            className="primary"
                            style={{
                                padding: '12px',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '8px',
                                borderRadius: '8px',
                                fontWeight: 'bold'
                            }}
                        >
                            <DatabaseBackup size={16}/> Export All Data
                        </button>

                        <div style={{
                             padding: '16px',
                            background: 'rgba(239, 68, 68, 0.05)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}>
                            <h4 style={{
                                margin: 0,
                                color: 'var(--danger)',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <Import size={16}/> Import Full Backup
                            </h4>
                            <p style={{fontSize: '12px', color: 'var(--text-secondary)', margin: 0}}>
                                Warning: Importing a full backup will <b>permanently replace</b> all your current routines
                                and plans.
                            </p>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="secondary"
                                style={{
                                    padding: '10px',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '8px',
                                    borderRadius: '6px',
                                    color: 'var(--danger)',
                                    border: '1px solid rgba(239, 68, 68, 0.4)'
                                }}
                            >
                                Select Backup File...
                            </button>
                        </div>
                    </div>

                    <div style={{display: 'flex', gap: '8px', marginTop: '16px'}}>
                        <button
                            type="button"
                            onClick={() => setShowSettingsModal(false)}
                            className="secondary"
                            style={{flex: 1, padding: '10px 0', borderRadius: '6px', fontWeight: 'bold'}}
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </BaseModal>);
}
