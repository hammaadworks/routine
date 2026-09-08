
import {CalendarDays, Target, Zap} from 'lucide-react';

interface MobileTabBarProps {
    activeTab: string;
    onTabChange: (tabId: string) => void;
}

export default function MobileTabBar({activeTab, onTabChange}: MobileTabBarProps) {
    const tabs = [{id: 'goals', icon: Target, label: 'Goals'}, {
        id: 'timeline',
        icon: CalendarDays,
        label: 'My Day',
        default: true
    }, {id: 'habits', icon: Zap, label: 'Habits'},];

    return (<div className="mobile-tab-bar">
            {tabs.map(tab => {
                // noinspection JSUnusedLocalSymbols
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (<button
                        key={tab.id}
                        className={`tab-btn ${isActive ? 'active' : ''}`}
                        onClick={() => onTabChange(tab.id)}
                    >
                        <Icon size={20} color={isActive ? 'var(--accent)' : 'var(--text-secondary)'}/>
                        <span>{tab.label}</span>
                    </button>);
            })}
        </div>);
}
