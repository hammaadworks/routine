import {BookOpen, Calendar, Clock, ListTodo, LucideRepeat, Plus, Star, TrendingUp} from 'lucide-react';

interface MobileTabBarProps {
    activeTab: string;
    onTabChange: (tabId: string) => void;
    showFab?: boolean;
    isRoutineDrawerOpen?: boolean;
    setIsRoutineDrawerOpen?: (open: boolean) => void;
    activeLeftTab?: string;
    setCalendarSubTab?: (tab: string) => void;
}

export default function MobileTabBar({
                                         activeTab,
                                         onTabChange,
                                         showFab,
                                         isRoutineDrawerOpen,
                                         setIsRoutineDrawerOpen,
                                         activeLeftTab,
                                         setCalendarSubTab
                                     }: MobileTabBarProps) {
    const tabs = [{id: 'goals', icon: Star, label: 'Goals'}, {
        id: 'tasks',
        icon: ListTodo,
        label: 'Tasks'
    }, {id: 'myday', icon: Clock, label: 'MyDay', default: true}, {
        id: 'calendar',
        icon: Calendar,
        label: 'Calendar'
    }, {id: 'coins', icon: TrendingUp, label: 'Coins'}, {id: 'plans', icon: BookOpen, label: 'Plans'}];

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
                window.dispatchEvent(new CustomEvent('fab:add-life-goal'));
            }
            return;
        }
        if (activeTab === 'tasks') {
            window.dispatchEvent(new CustomEvent('fab:add-task'));
            return;
        }
        if (activeTab === 'coins') {
            window.dispatchEvent(new CustomEvent('fab:add-coins'));
            return;
        }
        if (activeTab === 'plans') {
            window.dispatchEvent(new CustomEvent('fab:add-plan'));
            return;
        }
        if (activeTab === 'myday') {
            window.dispatchEvent(new CustomEvent('fab:add-myday'));
            return;
        }
        if (activeTab === 'calendar') {
            window.dispatchEvent(new CustomEvent('fab:add-habits'));
            return;
        }
    };

    const handleHabitsDrawerClick = () => {
        if (!isRoutineDrawerOpen) {
            if (activeTab === 'goals') {
                setCalendarSubTab?.('mark_goals');
            } else if (activeTab === 'tasks' || activeTab === 'myday' || activeTab === 'coins') {
                setCalendarSubTab?.('timelog');
            } else if (activeTab === 'plans') {
                setCalendarSubTab?.('milestones');
            }
        }
        setIsRoutineDrawerOpen?.(!isRoutineDrawerOpen);
    };

    // Habits drawer button: relevant for goals, tasks, myday, coins, plans.
    // On calendar, HabitsPane is already embedded statically on mobile.
    const canShowHabitsFab = ['goals', 'tasks', 'myday', 'coins', 'plans'].includes(activeTab);

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
            {canShowHabitsFab && !isRoutineDrawerOpen && (<button
                className="habits-drawer-btn"
                aria-label="Toggle Habits Drawer"
                onClick={handleHabitsDrawerClick}
            >
                <LucideRepeat size={20} color="#000"/>
            </button>)}
            {activeTab !== 'calendar' && (<button
                    className="tab-btn-fab"
                    aria-label="Add New Item"
                    onClick={handleFabClick}
                >
                    <Plus className="fab-icon"/>
                    <span className="fab-label">Add</span>
                </button>)}
        </>)}
    </>);
}
