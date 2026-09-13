import {BookOpen, CalendarDays, ListTodo, LucideRepeat, Plus, Target, Zap} from 'lucide-react';

interface MobileTabBarProps {
    activeTab: string;
    onTabChange: (tabId: string) => void;
    showFab?: boolean;
    isRoutineDrawerOpen?: boolean;
    setIsRoutineDrawerOpen?: (open: boolean) => void;
    activeLeftTab?: string;
}

export default function MobileTabBar({
                                         activeTab,
                                         onTabChange,
                                         showFab,
                                         isRoutineDrawerOpen,
                                         setIsRoutineDrawerOpen,
                                         activeLeftTab
                                     }: MobileTabBarProps) {
    const tabs = [{id: 'tasks', icon: ListTodo, label: 'Tasks'}, {
        id: 'goals', icon: Target, label: 'Goals'
    }, {id: 'myday', icon: Zap, label: 'MyDay', default: true}, {
        id: 'calendar', icon: CalendarDays, label: 'Calendar'
    }, {id: 'plans', icon: BookOpen, label: 'Plans'}];

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
        if (activeTab === 'plans') {
            window.dispatchEvent(new CustomEvent('fab:add-plan'));
        }
        if (activeTab === 'habits') window.dispatchEvent(new CustomEvent('fab:add-habits')); // legacy fallback
        if (activeTab === 'myday' || activeTab === 'timeline') {
            window.dispatchEvent(new CustomEvent('fab:add-myday'));
            return;
        }
    };

    return (<>
        <div className="mobile-tab-bar">
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
        </div>

        {showFab && (<>
            {!isRoutineDrawerOpen && (<button
                className="habits-drawer-btn"
                onClick={() => setIsRoutineDrawerOpen && setIsRoutineDrawerOpen(!isRoutineDrawerOpen)}
            >
                <LucideRepeat size={20} color="#000"/>
            </button>)}
            <button
                className="tab-btn-fab"
                onClick={handleFabClick}
            >
                <Plus className="fab-icon"/>
                <span className="fab-label">Add</span>
            </button>
        </>)}
    </>);
}
