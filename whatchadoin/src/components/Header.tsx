import type { Dispatch, SetStateAction } from 'react';
import {Bot, Command, Settings, Wallet} from 'lucide-react';
import RoutineSelector from './RoutineSelector';
import { useCurrency } from '../hooks/useCurrency';

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
    onWalletClick?: () => void;
}

export default function Header({
                                   activeRoutine,
                                   setRoutineModalView,
                                   setShowRoutineModal,
                                   setAiDockState,
                                   setShowSettingsModal,
                                   walletTotal,
                                   onWalletClick
                               }: HeaderProps) {
    const { formatCurrency } = useCurrency();

    return (
        <div className="header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 24px',
            background: 'var(--panel-bg)',
            borderRadius: '16px',
            border: '1px solid var(--panel-border)',
            flexShrink: 0,
            flexWrap: 'wrap',
            gap: '12px'
        }}>
            {/* Left: Brand */}
            <h1 style={{
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flex: 1,
                minWidth: 0
            }}>
                <div style={{
                    width: '32px',
                    height: '32px',
                    background: 'var(--accent)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#000',
                    flexShrink: 0
                }}>
                    <Command size={18}/>
                </div>
                <span style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>whatchadoin</span>
            </h1>

            {/* Center: Context (Routine Selector) */}
            <RoutineSelector
                activeRoutine={activeRoutine}
                setRoutineModalView={setRoutineModalView}
                setShowRoutineModal={setShowRoutineModal}
            />

            {/* Right: Global Actions */}
            <div className="header-controls"
                 style={{display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0}}>
                
                {walletTotal !== undefined && (
                    <button className="icon-btn" onClick={onWalletClick} style={{
                        padding: '6px 12px',
                        background: 'rgba(234, 179, 8, 0.1)',
                        border: '1px solid rgba(234, 179, 8, 0.3)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#EAB308',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        flexShrink: 0
                    }} title="Wallet Goal">
                        <Wallet size={16} /> 
                        <span className="mobile-hidden">Wallet Goal:</span>
                        {formatCurrency(walletTotal)}
                    </button>
                )}

                <button className="icon-btn" style={{
                    padding: '8px',
                    background: 'var(--accent)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexShrink: 0
                }} onClick={() => setAiDockState(prev => prev === 'closed' ? 'right' : 'closed')} title="AI Agent">
                    <Bot size={16} color="#000"/> <span className="mobile-hidden"
                                                        style={{fontSize: '13px', fontWeight: '600', color: '#000'}}>AI Agent</span>
                </button>
                <button className="icon-btn" style={{
                    padding: '8px',
                    background: 'var(--bg)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }} onClick={() => setShowSettingsModal(true)} title="Settings">
                    <Settings size={18} color="var(--text-secondary)"/>
                </button>
            </div>
        </div>);
}


