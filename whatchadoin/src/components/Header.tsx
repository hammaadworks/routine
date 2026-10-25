import {useState, useEffect} from 'react';
import type {Dispatch, SetStateAction} from 'react';
import {Bot, Command, Globe, Lock, Send, Settings, Wallet} from 'lucide-react';
import RoutineSelector from './RoutineSelector';
import {useCurrency} from '../hooks/useCurrency';
import {useSyncStatus} from '../hooks/useSyncStatus';
import {loadDispatchData, calculateDailyMetrics, getTodayDateStr} from '../utils/dispatchStore';

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
    onOpenDispatch?: () => void;
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
    onCounterClick: _onCounterClick,
    onOpenDispatch
}: HeaderProps) {
    const {formatCurrency, currencySymbol} = useCurrency();
    const syncState = useSyncStatus();

    const [dispatchMetrics, setDispatchMetrics] = useState(() => {
        return calculateDailyMetrics(loadDispatchData(), getTodayDateStr());
    });

    useEffect(() => {
        const updateMetrics = () => {
            const next = calculateDailyMetrics(loadDispatchData(), getTodayDateStr());
            setDispatchMetrics(prev => {
                if (
                    prev.completed === next.completed &&
                    prev.total === next.total &&
                    prev.remaining === next.remaining &&
                    prev.isAllComplete === next.isAllComplete
                ) {
                    return prev;
                }
                return next;
            });
        };
        window.addEventListener('whatchadoin_dispatch_updated', updateMetrics);
        return () => {
            window.removeEventListener('whatchadoin_dispatch_updated', updateMetrics);
        };
    }, []);

    const getLogoTooltip = () => {
        if (syncState.status === 'error') {
            return `Cloud Sync Error: ${syncState.lastError || 'Failed to sync'} (Click to fix in Settings)`;
        }
        if (syncState.status === 'syncing') {
            return 'Cloud Sync: Syncing with GitHub Gist...';
        }
        if (syncState.status === 'pending') {
            return 'Cloud Sync: Unsaved changes (Syncing soon...)';
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
                {/* 1. FAR LEFT: Logo and wordmark + Content Dispatch button */}
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
                                        background: syncState.status === 'error' ? '#EF4444' : syncState.status === 'syncing' ? '#3B82F6' : syncState.status === 'pending' ? '#F59E0B' : '#10B981',
                                        border: '2px solid var(--panel-bg)',
                                        boxShadow: syncState.status === 'error' ? '0 0 6px rgba(239, 68, 68, 0.9)' : syncState.status === 'syncing' ? '0 0 6px rgba(59, 130, 246, 0.8)' : syncState.status === 'pending' ? '0 0 6px rgba(245, 158, 11, 0.8)' : undefined,
                                        animation: (syncState.status === 'syncing' || syncState.status === 'pending') ? 'syncPulse 1.2s infinite' : undefined
                                    }}
                                />
                            )}
                        </div>
                        <span className="header-wordmark">
                            whatchadoin
                        </span>
                    </h1>

                    {/* Entry Point: Content Dispatch & Daily Quota */}
                    <button
                        className={`header-dispatch-btn ${_activeCenterTab === 'dispatch' ? 'active' : ''}`}
                        onClick={onOpenDispatch}
                        title={`Content Dispatch: ${dispatchMetrics.completed}/${dispatchMetrics.total} Completed (${dispatchMetrics.remaining} Left Today)`}
                    >
                        <Send size={13} className="header-dispatch-icon" />
                        <span className="header-dispatch-text">Dispatch</span>
                        <span className={`header-dispatch-pill ${dispatchMetrics.isAllComplete && dispatchMetrics.total > 0 ? 'complete' : ''}`}>
                            {dispatchMetrics.completed}/{dispatchMetrics.total}
                        </span>
                    </button>
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
                            title={`Wallet Goal: ${formatCurrency(walletTotal, {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: walletTotal % 1 === 0 ? 0 : 2
                            })}`}
                        >
                            <Wallet size={15} style={{ flexShrink: 0 }} />
                            <span className="header-btn-text">Wallet Goal:</span>
                            <span className="header-wallet-amount-full">
                                {formatCurrency(walletTotal, {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: walletTotal % 1 === 0 ? 0 : 2
                                })}
                            </span>
                            <span className="header-wallet-amount-compact">
                                {walletTotal >= 1000000
                                    ? `${currencySymbol}${(walletTotal / 1000000).toFixed(walletTotal % 1000000 === 0 ? 0 : 1)}M`
                                    : walletTotal >= 10000
                                        ? `${currencySymbol}${(walletTotal / 1000).toFixed(walletTotal % 1000 === 0 ? 0 : 1)}k`
                                        : formatCurrency(walletTotal, {
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
