import type {Dispatch, SetStateAction} from 'react';
import {Bot, Command, Globe, Lock, Settings, Wallet} from 'lucide-react';
import RoutineSelector from './RoutineSelector';
import {useCurrency} from '../hooks/useCurrency';
import {useSyncStatus} from '../hooks/useSyncStatus';

interface Routine {
    id?: string;
    name?: string;
    start?: string;
    end?: string;

    [key: string]: any;
}

interface HeaderProps {
    activeRoutine: Routine | null;
    setRoutineModalView: Dispatch<SetStateAction<string>>;
    setShowRoutineModal: Dispatch<SetStateAction<boolean>>;
    setAiDockState: Dispatch<SetStateAction<'closed' | 'right'>>;
    setShowSettingsModal: Dispatch<SetStateAction<boolean>>;
    walletTotal?: number;
    isPublicView: boolean;
    setIsPublicView: Dispatch<SetStateAction<boolean>>;
    onWalletClick?: () => void;
    activeCenterTab?: string;
    onCounterClick?: () => void;
}

export default function Header({
    activeRoutine,
    setRoutineModalView,
    setShowRoutineModal,
    setAiDockState,
    setShowSettingsModal,
    walletTotal,
    onWalletClick,
    isPublicView,
    setIsPublicView,
    activeCenterTab: _activeCenterTab,
    onCounterClick: _onCounterClick
}: HeaderProps) {
    const {formatCurrency} = useCurrency();
    const syncState = useSyncStatus();

    const getLogoTooltip = () => {
        if (syncState.status === 'error') {
            return `Cloud Sync Error: ${syncState.lastError || 'Failed to sync'} (Click to fix in Settings)`;
        }
        if (syncState.status === 'syncing') {
            return 'Cloud Sync: Syncing with GitHub Gist...';
        }
        if (syncState.status === 'idle') {
            const timeStr = syncState.lastSyncedAt ? ` (${new Date(syncState.lastSyncedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            })})` : '';
            return `Cloud Sync: Synced${timeStr} (Click to open settings)`;
        }
        return 'whatchadoin';
    };

    return (
        <header className="header">
            {/* Top row container: On desktop has display: contents so left and right groups sit on far ends; on mobile behaves as row 1 */}
            <div className="header-top-row">
                {/* 1. FAR LEFT: Logo and wordmark ONLY */}
                <div className="header-left-group">
                    <h1
                        className="header-logo"
                        onClick={() => {
                            window.dispatchEvent(new CustomEvent('open_global_settings', {detail: 'sync'}));
                        }}
                        title={getLogoTooltip()}
                    >
                        <div className="header-logo-icon">
                            <Command size={18}/>
                            {syncState.status !== 'unconfigured' && (
                                <span
                                    style={{
                                        position: 'absolute',
                                        top: '-2px',
                                        right: '-2px',
                                        width: '9px',
                                        height: '9px',
                                        borderRadius: '50%',
                                        background: syncState.status === 'error' ? '#EF4444' : syncState.status === 'syncing' ? '#3B82F6' : '#10B981',
                                        border: '2px solid var(--panel-bg)',
                                        boxShadow: syncState.status === 'error' ? '0 0 6px rgba(239, 68, 68, 0.9)' : syncState.status === 'syncing' ? '0 0 6px rgba(59, 130, 246, 0.8)' : undefined,
                                        animation: syncState.status === 'syncing' ? 'syncPulse 1.2s infinite' : undefined
                                    }}
                                />
                            )}
                        </div>
                        <span className="header-wordmark">
                            whatchadoin
                        </span>
                    </h1>
                </div>

                {/* 3. FAR RIGHT: Public toggle and Wallet goal (Settings & AI Agent hidden) */}
                <div className="header-controls">
                    {/* Public/Private toggle */}
                    <button
                        className="icon-btn header-mode-btn"
                        onClick={() => setIsPublicView(prev => !prev)}
                        style={{
                            padding: '7px 12px',
                            background: isPublicView ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${isPublicView ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: isPublicView ? '#10B981' : '#EF4444',
                            fontWeight: '600',
                            fontSize: '12.5px',
                            flexShrink: 0
                        }}
                        title={isPublicView ? 'Currently in Public Mode (Private items hidden)' : 'Currently in Private Mode (Showing everything)'}
                    >
                        {isPublicView ? <Globe size={15} color="#10B981"/> : <Lock size={15} color="#EF4444"/>}
                        <span className="header-btn-text">
                            {isPublicView ? 'Public Mode' : 'Private Mode'}
                        </span>
                    </button>

                    {/* Wallet Goal */}
                    {walletTotal !== undefined && (
                        <button
                            className="icon-btn header-wallet-btn"
                            onClick={onWalletClick}
                            style={{
                                padding: '6px 12px',
                                background: 'rgba(234, 179, 8, 0.1)',
                                border: '1px solid rgba(234, 179, 8, 0.3)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: '#EAB308',
                                fontWeight: 'bold',
                                fontSize: '12.5px',
                                flexShrink: 0
                            }}
                            title="Wallet Goal"
                        >
                            <Wallet size={15}/>
                            <span className="header-btn-text">Wallet Goal:</span>
                            <span>
                                {formatCurrency(walletTotal, {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: walletTotal % 1 === 0 ? 0 : 2
                                })}
                            </span>
                        </button>
                    )}

                    {/* AI Agent Button - Preserved in code, hidden */}
                    <button
                        className="icon-btn header-ai-btn"
                        style={{ display: 'none' }}
                        onClick={() => setAiDockState(prev => prev === 'closed' ? 'right' : 'closed')}
                        title="AI Agent"
                    >
                        <Bot size={16} color="#000"/>
                    </button>

                    {/* Settings Button - Preserved in code, hidden */}
                    <button
                        className="icon-btn header-settings-btn"
                        style={{ display: 'none' }}
                        onClick={() => setShowSettingsModal(true)}
                        title="Settings"
                    >
                        <Settings size={17} color="var(--text-secondary)"/>
                    </button>
                </div>
            </div>

            {/* 2. EXACT MIDDLE: Routine name with start and end date */}
            <div className="header-center-wrapper">
                <RoutineSelector
                    activeRoutine={activeRoutine}
                    setRoutineModalView={setRoutineModalView}
                    setShowRoutineModal={setShowRoutineModal}
                />
            </div>
        </header>
    );
}
