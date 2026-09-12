
import {CalendarDays, Target, Zap, Plus, BookOpen} from 'lucide-react';

interface MobileTabBarProps {
    activeTab: string;
    onTabChange: (tabId: string) => void;
    showFab?: boolean;
    isRoutineDrawerOpen?: boolean;
    setIsRoutineDrawerOpen?: (open: boolean) => void;
    activeLeftTab?: string;
}

export default function MobileTabBar({activeTab, onTabChange, showFab, isRoutineDrawerOpen, setIsRoutineDrawerOpen, activeLeftTab}: MobileTabBarProps) {
    const tabs = [
        {id: 'goals', icon: Target, label: 'Goals'},
        {id: 'myday', icon: Zap, label: 'MyDay', default: true},
        {id: 'calendar', icon: CalendarDays, label: 'Calendar'},
        {id: 'plans', icon: BookOpen, label: 'Plans'}
    ];

    const handleFabClick = () => {
        if (isRoutineDrawerOpen) {
            window.dispatchEvent(new CustomEvent('fab:add-habits'));
            return;
        }
        if (activeTab === 'goals') {
            if (activeLeftTab === 'money') {
                window.dispatchEvent(new CustomEvent('fab:add-money'));
            } else if (activeLeftTab === 'routine') {
                window.dispatchEvent(new CustomEvent('fab:add-routine-goal'));
            } else {
                window.dispatchEvent(new CustomEvent('fab:add-strategy'));
            }
        }
        if (activeTab === 'habits') window.dispatchEvent(new CustomEvent('fab:add-habits')); // legacy fallback
        if (activeTab === 'myday' || activeTab === 'timeline') {
            window.dispatchEvent(new CustomEvent('fab:add-myday'));
        }
    };

    return (
        <>
            <div className="mobile-tab-bar">
                {tabs.map(tab => {
                    // noinspection JSUnusedLocalSymbols
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            className={`tab-btn ${isActive ? 'active' : ''}`}
                            onClick={() => onTabChange(tab.id)}
                        >
                            <Icon size={20} color={isActive ? 'var(--accent)' : 'var(--text-secondary)'}/>
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>
            
            <button
                className="habits-drawer-btn"
                onClick={() => setIsRoutineDrawerOpen && setIsRoutineDrawerOpen(!isRoutineDrawerOpen)}
                style={{
                    background: isRoutineDrawerOpen ? 'var(--accent)' : 'var(--panel-bg)',
                    borderColor: isRoutineDrawerOpen ? 'transparent' : 'var(--panel-border)'
                }}
            >
                <Zap size={20} color={isRoutineDrawerOpen ? '#000' : 'var(--accent)'} />
            </button>

            {showFab && (
                <button
                    className="tab-btn-fab"
                    onClick={handleFabClick}
                >
                    <Plus className="fab-icon" />
                    <span className="fab-label">Add</span>
                </button>
            )}
        </>
    );
}
