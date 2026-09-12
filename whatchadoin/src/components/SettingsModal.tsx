import * as React from 'react';
import {DatabaseBackup, Import, Settings} from 'lucide-react';
import BaseModal from './BaseModal';
import AIConfigEditor from './AIConfigEditor';
import CopyBanner from './CopyBanner';

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
    saveSyncConfig: (token: string, id: string, filename: string) => void;
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

    return (<BaseModal
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
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
                    onClick={() => setSettingsTab('data')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: settingsTab === 'data' ? '2px solid var(--accent)' : '2px solid transparent',
                        color: settingsTab === 'data' ? '#fff' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap'
                    }}
                >
                    Data Backup
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
                        <input
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
                        <input
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
                                } catch (_err) {
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
                        <input
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
                            onClick={() => {
                                setSyncForm({token: '', id: '', filename: 'whatchadoin_data.json'});
                                saveSyncConfig('', '', '');
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
                            onClick={() => {
                                saveSyncConfig(syncForm.token, syncForm.id, syncForm.filename);
                                setShowSettingsModal(false);
                            }}
                            className="primary"
                            style={{flex: 2, padding: '10px 0', borderRadius: '6px', fontWeight: 'bold'}}
                            disabled={Boolean((syncForm.id && !/^[a-f0-9]{32}$/i.test(syncForm.id)) || (syncForm.token && !syncForm.token.startsWith('ghp_') && !syncForm.token.startsWith('github_pat_')))}
                        >
                            Save & Sync
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

            {settingsTab === 'data' && (<div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
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
                </div>)}
        </BaseModal>);
}
