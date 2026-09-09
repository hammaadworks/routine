
import {CalendarDays, Target, Zap, Plus} from 'lucide-react';

interface MobileTabBarProps {
    activeTab: string;
    onTabChange: (tabId: string) => void;
    showFab?: boolean;
}

export default function MobileTabBar({activeTab, onTabChange, showFab}: MobileTabBarProps) {
    const tabs = [{id: 'goals', icon: Target, label: 'Goals'}, {
        id: 'timeline',
        icon: CalendarDays,
        label: 'Schedule',
        default: true
    }, {id: 'habits', icon: Zap, label: 'Routine'},];

    const handleFabClick = () => {
        if (activeTab === 'goals') window.dispatchEvent(new CustomEvent('fab:add-strategy'));
        if (activeTab === 'habits') window.dispatchEvent(new CustomEvent('fab:add-habits'));
        if (activeTab === 'timeline') {
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
