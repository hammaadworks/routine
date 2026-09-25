import * as React from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';
import MyDay from './components/MyDay';
import ConfirmModal from './components/ConfirmModal';
import {saveSyncConfig} from './sync';
import {BookOpen, Calendar, ChevronDown, Clock, ListTodo, Star, TrendingUp} from 'lucide-react';
import './index.css';
import MobileTabBar from './components/MobileTabBar';
import QuotesWidget from './components/QuotesWidget';
import Header from './components/Header';
import {loadActiveRoutineId, loadRoutines} from './utils/dataStore';
import {sanitizeAllStorage} from './utils';
import {useWebMCPIntegration} from './hooks/useWebMCPIntegration';
import type {CalendarSubTab} from './types/ui';

function safeLazy<T extends React.ComponentType<any>>(factory: () => Promise<{ default: T }>) {
    return React.lazy(async () => {
        try {
            return await factory();
        } catch (err) {
            console.warn('Dynamic chunk load failed, retrying once...', err);
            await new Promise(r => setTimeout(r, 200));
            return await factory();
        }
    });
}

class TabErrorBoundary extends React.Component<{ tabName: string; children: React.ReactNode }, {
    hasError: boolean; error: Error | null
}> {
    constructor(props: any) {
        super(props);
        this.state = {hasError: false, error: null};
    }

    static getDerivedStateFromError(error: Error) {
        return {hasError: true, error};
    }

    componentDidCatch(error: Error, info: any) {
        console.error(`Error loading tab ${this.props.tabName}:`, error, info);
    }

    render() {
        if (this.state.hasError) {
            return (<div style={{
                padding: '32px 24px',
                textAlign: 'center',
                background: 'var(--panel-bg)',
                borderRadius: '12px',
                border: '1px solid var(--panel-border)',
                margin: '20px'
            }}>
                <h3 style={{color: '#EF4444', marginBottom: '8px'}}>Failed to load {this.props.tabName}</h3>
                <p style={{color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px'}}>
                    {this.state.error?.message || 'A network or cache error occurred while loading this view.'}
                </p>
                <button
                    className="primary"
                    onClick={() => window.location.reload()}
                    style={{padding: '8px 18px', borderRadius: '6px', fontWeight: 'bold'}}
                >
                    Reload Page
                </button>
            </div>);
        }
        return this.props.children;
    }
}

const RoutineGoalPane = safeLazy(() => import('./components/RoutineGoalPane'));

const PlansPane = safeLazy(() => import('./components/PlansPane'));
const CoinsPane = safeLazy(() => import('./components/CoinsPane'));
const CalendarPane = safeLazy(() => import('./components/CalendarPane'));
const TasksPane = safeLazy(() => import('./components/TasksPane'));

const LifePane = safeLazy(() => import('./components/LifePane'));
const HabitsPane = safeLazy(() => import('./components/HabitsPane'));
const MoneyPane = safeLazy(() => import('./components/MoneyPane'));
const AIAgentApp = safeLazy(() => import('./components/AIAgentApp'));

const WalletModal = safeLazy(() => import('./components/WalletModal'));
const RoutineModal = safeLazy(() => import('./components/RoutineModal'));
const SettingsModal = safeLazy(() => import('./components/SettingsModal'));

export default function App() {
    const [routines, setRoutines] = useState<any[]>(loadRoutines);

    const [lifeGoals, setLifeGoals] = useState<any[]>(() => {
        try {
            const parsed = JSON.parse(localStorage.getItem('whatchadoin_life_goals') || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
    });

    const [moneyGoals, setMoneyGoals] = useState<any[]>(() => {
        try {
            const parsed = JSON.parse(localStorage.getItem('whatchadoin_money_goals') || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
    });

    const [activeRoutineId, setActiveRoutineId] = useState<string>(loadActiveRoutineId);

    const [activeCenterTab, setActiveCenterTab] = useState<string>('myday');
    const [mobileTab, setMobileTab] = useState<string>('myday'); // 'tasks' | 'goals' | 'myday' | 'calendar' | 'plans' | 'coins'
    const [activeLeftTab, setActiveLeftTab] = useState<string>('life');
    const [calendarSubTab, setCalendarSubTab] = useState<CalendarSubTab>('mark_goals');
    const [selectedTargetDate, setSelectedTargetDate] = useState<string | null>(null);

    useEffect(() => {
        if (activeCenterTab === 'tasks' || activeCenterTab === 'coins') {
            setCalendarSubTab('timelog');
        } else if (activeCenterTab === 'plans') {
            setCalendarSubTab('milestones');
        } else if (activeCenterTab === 'myday' || activeCenterTab === 'calendar') {
            setCalendarSubTab('mark_goals');
        }
    }, [activeCenterTab]);
    const [habitFilterRoutineGoalId, setHabitFilterRoutineGoalId] = useState<string | null>(null);
    const [habitFilterLifeGoalId, setHabitFilterLifeGoalId] = useState<string | null>(null);
    const [showRoutineModal, setShowRoutineModal] = useState<boolean>(false);
    const [routineModalView, setRoutineModalView] = useState<'list' | 'edit'>('list'); // 'list' | 'edit'
    const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
    const [confirmConfig, setConfirmConfig] = useState<any>(null);
    const [isMidPaneExpanded, setIsMidPaneExpanded] = useState<boolean>(true);
    const [isPublicView, setIsPublicView] = useState(false);
    const [isLeftPaneExpanded, setIsLeftPaneExpanded] = useState<boolean>(false);
    const [isRoutineDrawerOpen, setIsRoutineDrawerOpen] = useState<boolean>(false);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
    const [aiDockState, setAiDockState] = useState<string>('closed'); // 'closed', 'right', 'bottom', 'popped_out'

    useEffect(() => {
        sanitizeAllStorage();
    }, []);

    useEffect(() => {
        if (isRoutineDrawerOpen) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
    }, [isRoutineDrawerOpen]);

    useEffect(() => {
        const closeDrawer = () => setIsRoutineDrawerOpen(false);
        window.addEventListener('close-routine-drawer', closeDrawer);
        return () => window.removeEventListener('close-routine-drawer', closeDrawer);
    }, []);


    const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
    const [settingsTab, setSettingsTab] = useState<string>('sync'); // 'sync' | 'ai'
    const [aiConfig, setAiConfig] = useState<any>(() => {
        const saved = localStorage.getItem('whatchadoin_ai_config');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.profiles) return parsed;
                // Migrate old flat structure
                return {
                    activeProfileId: 'default', profiles: [{
                        id: 'default',
                        name: 'Default Profile',
                        provider: parsed.provider || 'openai',
                        model: parsed.model || 'gpt-4o',
                        apiKey: parsed.apiKey || '',
                        customEndpoint: parsed.customEndpoint || ''
                    }]
                };
            } catch (e) {
                console.error('Failed to parse AI config', e);
            }
        }
        return {
            activeProfileId: 'default', profiles: [{
                id: 'default',
                name: 'Default Profile',
                provider: 'openai',
                model: 'gpt-4o',
                apiKey: '',
                customEndpoint: ''
            }]
        };
    });

    // Watch aiConfig and update local storage, then broadcast event if dock is open
    useEffect(() => {
        localStorage.setItem('whatchadoin_ai_config', JSON.stringify(aiConfig));
        window.dispatchEvent(new CustomEvent('ai_config_updated', {detail: aiConfig}));
    }, [aiConfig]);

    useEffect(() => {
        const handleOpenSettings = (e: any) => {
            setSettingsTab(e.detail || 'sync');
            setShowSettingsModal(true);
        };
        window.addEventListener('open_global_settings', handleOpenSettings);
        return () => window.removeEventListener('open_global_settings', handleOpenSettings);
    }, []);
    const [syncForm, setSyncForm] = useState({
        token: localStorage.getItem('whatchadoin_gist_token') || '',
        id: localStorage.getItem('whatchadoin_gist_id') || '',
        filename: localStorage.getItem('whatchadoin_gist_filename') || 'whatchadoin_data.json'
    });
    const fileInputRef = useRef<any>(null);

    useEffect(() => {
        if (aiDockState === 'popped_out') {
            window.open('/ai', 'whatchadoinAIAgent', 'width=450,height=800,menubar=no,toolbar=no,location=no,status=no');
        }
    }, [aiDockState]);

    useEffect(() => {
        localStorage.setItem('whatchadoin_life_goals', JSON.stringify(lifeGoals));
    }, [lifeGoals]);

    useEffect(() => {
        localStorage.setItem('whatchadoin_money_goals', JSON.stringify(moneyGoals));
    }, [moneyGoals]);

    useEffect(() => {
        localStorage.setItem('whatchadoin_routines', JSON.stringify(routines));
    }, [routines]);

    useEffect(() => {
        if (routines.length > 0 && !routines.some(r => r.id === activeRoutineId)) {
            setActiveRoutineId(routines[0].id);
        }
    }, [routines, activeRoutineId]);

    useEffect(() => {
        localStorage.setItem('whatchadoin_active_routine_id', activeRoutineId);
    }, [activeRoutineId]);

    const activeRoutine = routines.find(v => v.id === activeRoutineId) || routines[0];

    const updateActiveRoutine = useCallback((updates: Record<string, any>) => {
        setRoutines(prev => {
            const currentActive = prev.find(v => v.id === activeRoutineId) || prev[0];
            const targetId = currentActive?.id || activeRoutineId;
            return prev.map((v: any) => {
                if (v.id === targetId || String(v.id) === String(targetId)) {
                    let newUpdates: Record<string, any> = {};
                    for (let key in updates) {
                        if (typeof updates[key] === 'function') {
                            newUpdates[key] = updates[key](v[key]);
                        } else {
                            newUpdates[key] = updates[key];
                        }
                    }
                    return {...v, ...newUpdates};
                }
                return v;
            });
        });
    }, [activeRoutineId]);

    const {executeTool} = useWebMCPIntegration({
        setLifeGoals,
        setMoneyGoals,
        setRoutines,
        setActiveRoutineId,
        updateActiveRoutine,
        activeRoutine,
        routines,
        setActiveCenterTab,
        setActiveLeftTab,
        setMobileTab,
        setIsLeftPaneExpanded,
        lifeGoals,
        moneyGoals
    });

    useEffect(() => {
        const channel = new BroadcastChannel('whatchadoin_ai_channel');

        const coinsEntries = JSON.parse(localStorage.getItem('whatchadoin_coins_entries') || '[]');
        const coinsTargets = JSON.parse(localStorage.getItem('whatchadoin_coins_targets') || '{}');
        const quickTasks = JSON.parse(localStorage.getItem('whatchadoin_quick_tasks') || '[]');

        const appState = {
            activeRoutine,
            routines,
            lifeGoals,
            moneyGoals,
            quickTasks,
            coins: {entries: coinsEntries, targets: coinsTargets},
            activeCenterTab,
            activeLeftTab
        };
        channel.postMessage({type: 'STATE_UPDATE', payload: appState});

        channel.onmessage = async (event) => {
            const data = event.data;
            if (data.type === 'PING') {
                channel.postMessage({type: 'STATE_UPDATE', payload: appState});
            } else if (data.type === 'DOCK_COMMAND') {
                setAiDockState(data.payload);
            } else if (data.type === 'TOOL_EXECUTION') {
                const {tool, args, callId} = data;
                try {
                    const result = await executeTool(tool, args || {});
                    channel.postMessage({
                        type: 'TOOL_RESULT', callId, status: 'success', result, message: (result as any)?.message
                    });
                } catch (err: any) {
                    channel.postMessage({type: 'TOOL_RESULT', callId, status: 'error', error: err.message});
                }
            }
        };

        return () => channel.close();
    }, [routines, activeRoutineId, activeRoutine, lifeGoals, moneyGoals, activeCenterTab, activeLeftTab, updateActiveRoutine, executeTool]);
    const setRoutineGoals = (goals: any[]) => updateActiveRoutine({routineGoals: goals});
    const setHabits = (goals: any[]) => updateActiveRoutine({habits: goals});
    const setTemplates = (templates: any[]) => updateActiveRoutine({templates: templates});
    const setActiveTemplateId = (id: string) => updateActiveRoutine({activeTemplateId: id});
    const setDayMapping = (mapping: any) => updateActiveRoutine({dayMapping: mapping});

    const toggleDailyGoal = (dateStr: string, goalId: string) => {
        const currentLogs = activeRoutine.dailyLogs || {};
        const dayLog = currentLogs[dateStr] || {};
        const isCompleted = dayLog[goalId] || false;

        updateActiveRoutine({
            dailyLogs: {
                ...currentLogs, [dateStr]: {
                    ...dayLog, [goalId]: !isCompleted
                }
            }
        });
    };


    const exportAllData = () => {
        const allPlans: Record<string, any> = {};
        const allFolders: Record<string, any> = {};
        routines.forEach((v: any) => {
            allPlans[v.id] = JSON.parse(localStorage.getItem(`whatchadoin_plans_${v.id}`) || '[]');
            allFolders[v.id] = JSON.parse(localStorage.getItem(`whatchadoin_plans_folders_${v.id}`) || '[]');
        });

        const lifePlans = JSON.parse(localStorage.getItem('whatchadoin_life_plans') || '[]');
        const lifeFolders = JSON.parse(localStorage.getItem('whatchadoin_life_plans_folders') || '[]');
        const quickTasks = JSON.parse(localStorage.getItem('whatchadoin_quick_tasks') || '[]');
        const coinsEntries = JSON.parse(localStorage.getItem('whatchadoin_coins_entries') || '[]');
        const coinsTargets = JSON.parse(localStorage.getItem('whatchadoin_coins_targets') || '{}');
        const currency = localStorage.getItem('whatchadoin_currency') || 'USD';
        const quotes = JSON.parse(localStorage.getItem('whatchadoin_quotes') || '[]');
        const aiConfig = JSON.parse(localStorage.getItem('whatchadoin_ai_config') || '{}');

        const backupData = {
            isFullBackup: true,
            routines: routines,
            activeRoutineId: activeRoutineId,
            allPlans,
            allFolders,
            lifeGoals: lifeGoals,
            moneyGoals: moneyGoals,
            quickTasks,
            coinsEntries,
            coinsTargets,
            lifePlans,
            lifeFolders,
            currency,
            quotes,
            aiConfig
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `whatchadoin_os_full_backup_${Date.now()}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const importRoutine = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event: any) => {
            try {
                const data = JSON.parse(event.target.result.toString());

                if (data.isFullBackup) {
                    setConfirmConfig({
                        title: 'Import Full Backup',
                        message: 'This will REPLACE all your existing routines and plans with the imported data. Are you absolutely sure?',
                        isDanger: true,
                        onConfirm: () => {
                            routines.forEach((v: any) => {
                                localStorage.removeItem(`whatchadoin_plans_${v.id}`);
                                localStorage.removeItem(`whatchadoin_plans_folders_${v.id}`);
                            });

                            data.routines.forEach((v: any) => {
                                if (data.allPlans && data.allPlans[v.id]) {
                                    localStorage.setItem(`whatchadoin_plans_${v.id}`, JSON.stringify(data.allPlans[v.id]));
                                }
                                if (data.allFolders && data.allFolders[v.id]) {
                                    localStorage.setItem(`whatchadoin_plans_folders_${v.id}`, JSON.stringify(data.allFolders[v.id]));
                                }
                            });
                            setRoutines(data.routines);
                            setActiveRoutineId(data.activeRoutineId || data.routines[0].id);
                            if (data.lifeGoals) {
                                setLifeGoals(data.lifeGoals);
                            }
                            if (data.moneyGoals) {
                                setMoneyGoals(data.moneyGoals);
                            }
                            if (data.quickTasks) {
                                localStorage.setItem('whatchadoin_quick_tasks', JSON.stringify(data.quickTasks));
                                window.dispatchEvent(new CustomEvent('whatchadoin_quick_tasks_updated'));
                            }
                            if (data.coinsEntries) {
                                localStorage.setItem('whatchadoin_coins_entries', JSON.stringify(data.coinsEntries));
                                window.dispatchEvent(new CustomEvent('whatchadoin_coins_updated'));
                            }
                            if (data.coinsTargets) {
                                localStorage.setItem('whatchadoin_coins_targets', JSON.stringify(data.coinsTargets));
                                window.dispatchEvent(new CustomEvent('whatchadoin_coins_updated'));
                            }
                            if (data.lifePlans) {
                                localStorage.setItem('whatchadoin_life_plans', JSON.stringify(data.lifePlans));
                            }
                            if (data.lifeFolders) {
                                localStorage.setItem('whatchadoin_life_plans_folders', JSON.stringify(data.lifeFolders));
                            }
                            if (data.currency) {
                                localStorage.setItem('whatchadoin_currency', data.currency);
                                window.dispatchEvent(new CustomEvent('whatchadoin_currency_updated'));
                            }
                            if (data.quotes) {
                                localStorage.setItem('whatchadoin_quotes', JSON.stringify(data.quotes));
                                window.dispatchEvent(new CustomEvent('whatchadoin_quotes_updated'));
                            }
                            if (data.aiConfig) {
                                localStorage.setItem('whatchadoin_ai_config', JSON.stringify(data.aiConfig));
                                setAiConfig(data.aiConfig);
                            }
                            sanitizeAllStorage();
                            window.dispatchEvent(new CustomEvent('whatchadoin_plans_updated'));
                            setShowRoutineModal(false);
                            setConfirmConfig(null);
                        },
                        onCancel: () => setConfirmConfig(null)
                    });
                } else if (data && data.routine && data.routine.id) {
                    const newId = Date.now().toString();
                    const newRoutine = {
                        ...data.routine, id: newId, name: `${data.routine.name} (Imported)`
                    };
                    setRoutines((prev: any[]) => [...prev, newRoutine]);
                    if (data.plans) {
                        localStorage.setItem(`whatchadoin_plans_${newId}`, JSON.stringify(data.plans));
                    }
                    if (data.plansFolders) {
                        localStorage.setItem(`whatchadoin_plans_folders_${newId}`, JSON.stringify(data.plansFolders));
                    }
                    if (data.lifeGoals) {
                        setLifeGoals((prev: any[]) => {
                            const existingIds = new Set(prev.map((g: any) => g.id));
                            const newGoals = data.lifeGoals.filter((g: any) => !existingIds.has(g.id));
                            return [...prev, ...newGoals];
                        });
                    }
                    if (data.moneyGoals) {
                        setMoneyGoals((prev: any[]) => {
                            const existingIds = new Set(prev.map((g: any) => g.id));
                            const newGoals = data.moneyGoals.filter((g: any) => !existingIds.has(g.id));
                            return [...prev, ...newGoals];
                        });
                    }
                    if (data.lifePlans) {
                        const existingLifePlans = JSON.parse(localStorage.getItem('whatchadoin_life_plans') || '[]');
                        const existingPlanIds = new Set(existingLifePlans.map((p: any) => p.id));
                        const newPlans = data.lifePlans.filter((p: any) => !existingPlanIds.has(p.id));
                        localStorage.setItem('whatchadoin_life_plans', JSON.stringify([...existingLifePlans, ...newPlans]));
                    }
                    if (data.lifeFolders) {
                        const existingFolders = JSON.parse(localStorage.getItem('whatchadoin_life_plans_folders') || '[]');
                        const existingFolderIds = new Set(existingFolders.map((f: any) => f.id));
                        const newFolders = data.lifeFolders.filter((f: any) => !existingFolderIds.has(f.id));
                        localStorage.setItem('whatchadoin_life_plans_folders', JSON.stringify([...existingFolders, ...newFolders]));
                    }
                    window.dispatchEvent(new CustomEvent('whatchadoin_plans_updated'));
                    setActiveRoutineId(newId);
                    setShowRoutineModal(false);
                } else {
                    setConfirmConfig({
                        title: 'Import Failed',
                        message: 'The selected file is not a valid whatchadoin backup.',
                        isDanger: true,
                        onConfirm: () => setConfirmConfig(null),
                        onCancel: null
                    });
                }
            } catch {
                setConfirmConfig({
                    title: 'Import Failed',
                    message: 'The selected file is not a valid whatchadoin backup.',
                    isDanger: true,
                    onConfirm: () => setConfirmConfig(null),
                    onCancel: null
                });
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const routineGoals = activeRoutine.routineGoals || [];
    let habits = activeRoutine.habits || [];
    if (!Array.isArray(habits)) {
        habits = [...(habits.daily || []), ...(habits.weekly || [])];
    }
    const templates = activeRoutine.templates || [];
    const activeTemplateId = activeRoutine.activeTemplateId || '';
    const dayMapping = activeRoutine.dayMapping || {};

    const allWalletGoals = [...(Array.isArray(lifeGoals) ? lifeGoals : []).map((g: any) => ({
        ...g, category: 'Life', type: 'life'
    })), ...(Array.isArray(routineGoals) ? routineGoals : []).map((g: any) => ({
        ...g, category: 'Routine', type: 'routine'
    })), ...(Array.isArray(moneyGoals) ? moneyGoals : []).map((g: any) => ({
        ...g, category: 'Money', type: 'money'
    }))].filter((g: any) => typeof g.cost === 'number' && g.cost > 0).sort((a: any, b: any) => b.cost - a.cost);

    const visibleWalletGoals = isPublicView ? allWalletGoals.filter((g: any) => g.isPublic || (g.name || '').includes('[public]')) : allWalletGoals;
    const walletTotal = allWalletGoals.filter(g => !g.completed).reduce((sum, g) => sum + (g.cost || 0), 0);
    const headerWalletTotal = visibleWalletGoals.filter(g => !g.completed).reduce((sum, g) => sum + (g.cost || 0), 0);

    return (<div className={`layout dock-${aiDockState}`}>

        {isWalletModalOpen && (<React.Suspense fallback={null}>
            <WalletModal
                isOpen={isWalletModalOpen}
                onClose={() => setIsWalletModalOpen(false)}
                allGoals={visibleWalletGoals}
            />
        </React.Suspense>)}

        {/* Main App Container */}
        <div className="main-app-wrapper"
             style={{flex: 1, display: 'flex', flexDirection: 'column', height: '100%', gap: '12px'}}>
            <Header
                activeRoutine={activeRoutine}
                setRoutineModalView={setRoutineModalView as any}
                setShowRoutineModal={setShowRoutineModal}
                setAiDockState={setAiDockState as any}
                setShowSettingsModal={setShowSettingsModal}
                walletTotal={headerWalletTotal}
                isPublicView={isPublicView}
                setIsPublicView={setIsPublicView}
                onWalletClick={() => {
                    setActiveLeftTab('money');
                    setMobileTab('goals');
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('open-wallet-view'));
                    }, 10);
                }}
            />

            {/* Mobile Tab Bar */}
            <MobileTabBar
                activeTab={mobileTab}
                onTabChange={(tab) => {
                    setMobileTab(tab);
                    if (tab === 'goals') {
                        setActiveLeftTab('life');
                        setIsLeftPaneExpanded(true);
                        setIsRoutineDrawerOpen(false);
                    }
                    if (tab === 'myday') {
                        setActiveCenterTab('myday');
                        setIsRoutineDrawerOpen(false);
                    }
                    if (tab === 'calendar') {
                        setActiveCenterTab('calendar');
                        setIsRoutineDrawerOpen(false);
                        const d = new Date();
                        const y = d.getFullYear();
                        const m = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        setSelectedTargetDate(`${y}-${m}-${day}`);
                    }
                    if (tab === 'plans') {
                        setActiveCenterTab('plans');
                        setIsRoutineDrawerOpen(false);
                    }
                    if (tab === 'tasks') {
                        setActiveCenterTab('tasks');
                        setIsRoutineDrawerOpen(false);
                    }
                    if (tab === 'coins') {
                        setActiveCenterTab('coins');
                        setIsRoutineDrawerOpen(false);
                    }
                }}
                showFab={mobileTab !== 'calendar'}
                isRoutineDrawerOpen={isRoutineDrawerOpen}
                setIsRoutineDrawerOpen={setIsRoutineDrawerOpen}
                activeLeftTab={activeLeftTab}
                setCalendarSubTab={setCalendarSubTab}
            />

            <main className={`main-content mobile-tab-${mobileTab}`}>
                <aside className={`panel pane left-pane ${isLeftPaneExpanded ? '' : 'mobile-collapsed'}`}
                       style={{display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', minHeight: 0}}>
                    <div className="panel-header" onClick={() => setIsLeftPaneExpanded(!isLeftPaneExpanded)}
                         style={{
                             display: 'flex',
                             justifyContent: 'space-between',
                             alignItems: 'center',
                             padding: '16px 24px',
                             cursor: 'pointer',
                             borderBottom: '1px solid var(--panel-border)'
                         }}>
                        <h2 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <Star size={18} color="var(--accent)"/> Goals
                        </h2>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <button className="accordion-icon icon-btn" style={{padding: '4px'}}>
                                <ChevronDown size={16} style={{
                                    transform: isLeftPaneExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s'
                                }}/>
                            </button>
                        </div>
                    </div>
                    <div style={{
                        display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0
                    }}>
                        {(() => {
                            const headerTabs = (<div className="tabs" style={{
                                marginBottom: '16px',
                                borderBottom: '1px solid var(--panel-border)',
                                background: 'transparent'
                            }}>
                                <button
                                    className={`tab ${activeLeftTab === 'life' ? 'active' : ''}`}
                                    onClick={() => setActiveLeftTab('life')}
                                >
                                    Life
                                </button>
                                <button
                                    className={`tab ${activeLeftTab === 'money' ? 'active' : ''}`}
                                    onClick={() => setActiveLeftTab('money')}
                                >
                                    Money
                                </button>
                                <button
                                    className={`tab ${activeLeftTab === 'routine' ? 'active' : ''}`}
                                    onClick={() => setActiveLeftTab('routine')}
                                >
                                    Routine
                                </button>
                            </div>);

                            if (activeLeftTab === 'routine') {
                                return (<React.Suspense
                                    fallback={<div style={{padding: '20px', textAlign: 'center'}}>Loading Routine
                                        Goals...</div>}>
                                    <RoutineGoalPane isPublicView={isPublicView}
                                                     routineGoals={routineGoals}
                                                     setRoutineGoals={setRoutineGoals as any}
                                                     habits={habits} setHabits={setHabits as any}
                                                     templates={templates} setTemplates={setTemplates as any}
                                                     activeTemplateId={activeTemplateId}
                                                     onRoutineGoalBadgeClick={(id) => setHabitFilterRoutineGoalId(id)}
                                                     lifeGoals={lifeGoals}
                                                     headerTabs={headerTabs}
                                    />
                                </React.Suspense>);
                            }
                            if (activeLeftTab === 'money') {
                                return (<React.Suspense
                                    fallback={<div style={{padding: '20px', textAlign: 'center'}}>Loading Money
                                        Goals...</div>}>
                                    <MoneyPane isPublicView={isPublicView}
                                               moneyGoals={moneyGoals} setMoneyGoals={setMoneyGoals as any}
                                               habits={habits}
                                               headerTabs={headerTabs}
                                               allWalletGoals={allWalletGoals}
                                               setLifeGoals={setLifeGoals}
                                               setRoutineGoals={setRoutineGoals as any}
                                               onNavigateToCoins={() => {
                                                   setActiveCenterTab('coins');
                                                   setMobileTab('coins');
                                               }}
                                    />
                                </React.Suspense>);
                            }
                            return (<React.Suspense
                                fallback={<div style={{padding: '20px', textAlign: 'center'}}>Loading Life
                                    Goals...</div>}>
                                <LifePane isPublicView={isPublicView}
                                          lifeGoals={lifeGoals} setLifeGoals={setLifeGoals}
                                          routineGoals={routineGoals} setRoutineGoals={setRoutineGoals as any}
                                          habits={habits} setHabits={setHabits as any}
                                          onLifeGoalBadgeClick={(id) => setHabitFilterLifeGoalId(id)}
                                          headerTabs={headerTabs}
                                />
                            </React.Suspense>);
                        })()}
                    </div>
                </aside>

                <div className={`myday-area timeline-area ${isMidPaneExpanded ? '' : 'mobile-collapsed'}`} style={{
                    display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, padding: 0
                }}>
                    <div className="tabs hide-on-mobile" onClick={() => setIsMidPaneExpanded(!isMidPaneExpanded)}
                         style={{
                             cursor: 'pointer',
                             marginBottom: '0',
                             borderBottom: '1px solid var(--panel-border)',
                             background: 'var(--panel-bg)',
                             position: 'sticky',
                             top: 0,
                             zIndex: 90
                         }}>
                        <button
                            className={`tab ${activeCenterTab === 'tasks' ? 'active' : ''}`}
                            onClick={() => {
                                setActiveCenterTab('tasks');
                                setMobileTab('tasks');
                            }}
                            style={{display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center'}}
                        >
                            <ListTodo size={16}/> Tasks
                        </button>
                        <button
                            className={`tab ${activeCenterTab === 'myday' ? 'active' : ''}`}
                            onClick={() => {
                                setActiveCenterTab('myday');
                                setMobileTab('myday');
                            }}
                            style={{display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center'}}
                        >
                            <Clock size={16}/> My Day
                        </button>
                        <button
                            className={`tab ${activeCenterTab === 'calendar' ? 'active' : ''}`}
                            onClick={() => {
                                setActiveCenterTab('calendar');
                                setMobileTab('calendar');
                            }}
                            style={{display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center'}}
                        >
                            <Calendar size={16}/> Calendar
                        </button>
                        <button
                            className={`tab ${activeCenterTab === 'coins' ? 'active' : ''}`}
                            onClick={() => {
                                setActiveCenterTab('coins');
                                setMobileTab('coins');
                            }}
                            style={{display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center'}}
                        >
                            <TrendingUp size={16}/> Coins
                        </button>
                        <button
                            className={`tab ${activeCenterTab === 'plans' ? 'active' : ''}`}
                            onClick={() => {
                                setActiveCenterTab('plans');
                                setMobileTab('plans');
                            }}
                            style={{display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center'}}
                        >
                            <BookOpen size={16}/> Plans
                        </button>
                        <button className="accordion-icon icon-btn" style={{marginLeft: 'auto', padding: '4px'}}>
                            <ChevronDown size={16} style={{
                                transform: isMidPaneExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s'
                            }}/>
                        </button>
                    </div>

                    <div className="mid-pane-content"
                         style={{flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0}}>
                        <TabErrorBoundary tabName={activeCenterTab}>
                            {activeCenterTab === 'myday' ? (<MyDay
                                isPublicView={isPublicView}
                                templates={templates}
                                setTemplates={setTemplates as any}
                                activeTemplateId={activeTemplateId}
                                setActiveTemplateId={setActiveTemplateId as any}
                                dayMapping={dayMapping}
                                setDayMapping={setDayMapping}
                                updateActiveRoutine={updateActiveRoutine}
                                habits={habits}
                                routineGoals={routineGoals}
                                lifeGoals={lifeGoals}
                            />) : activeCenterTab === 'plans' ? (<React.Suspense
                                fallback={<div style={{padding: '20px', textAlign: 'center'}}>Loading
                                    Plans...</div>}><PlansPane isPublicView={isPublicView}
                                                               key={activeRoutineId}
                                                               routineGoals={routineGoals}
                                                               habits={habits}
                                                               lifeGoals={lifeGoals}
                                                               moneyGoals={moneyGoals}
                                                               activeRoutineId={activeRoutineId}
                            /></React.Suspense>) : activeCenterTab === 'tasks' ? (<React.Suspense
                                fallback={<div style={{padding: '20px', textAlign: 'center'}}>Loading
                                    Tasks...</div>}><TasksPane
                                isPublicView={isPublicView}/></React.Suspense>) : activeCenterTab === 'coins' ? (
                                <React.Suspense
                                    fallback={<div style={{padding: '20px'}}>Loading Coins...</div>}><CoinsPane
                                    isPublicView={isPublicView}
                                    walletTotal={isPublicView ? headerWalletTotal : walletTotal}
                                    onNavigateToMoneyGoals={() => {
                                        setMobileTab('goals');
                                        setActiveLeftTab('money');
                                        setIsLeftPaneExpanded(true);
                                    }}/></React.Suspense>) : (<React.Suspense
                                fallback={<div style={{padding: '20px', textAlign: 'center'}}>Loading
                                    Calendar...</div>}><CalendarPane isPublicView={isPublicView}
                                                                     activeRoutine={activeRoutine}
                                                                     calendarSubTab={calendarSubTab}
                                                                     setCalendarSubTab={setCalendarSubTab}
                                                                     routineGoals={routineGoals}
                                                                     lifeGoals={lifeGoals}
                                                                     selectedTargetDate={selectedTargetDate}
                                                                     setSelectedTargetDate={setSelectedTargetDate}
                                                                     habits={habits}
                                                                     templates={templates}
                                                                     dayMapping={dayMapping}
                            /></React.Suspense>)}
                        </TabErrorBoundary>
                    </div>
                </div>
                {isRoutineDrawerOpen && (<div
                    className="mobile-drawer-overlay"
                    onClick={() => setIsRoutineDrawerOpen(false)}
                />)}
                <React.Suspense fallback={<div style={{padding: '20px', textAlign: 'center'}}>Loading Habits...</div>}>
                    <HabitsPane isPublicView={isPublicView}
                                habits={habits} setHabits={setHabits as any}
                                templates={templates} setTemplates={setTemplates as any}
                                routineGoals={routineGoals} lifeGoals={lifeGoals} moneyGoals={moneyGoals}
                                activeTemplateId={activeTemplateId}
                                habitFilterRoutineGoalId={habitFilterRoutineGoalId}
                                setHabitFilterRoutineGoalId={setHabitFilterRoutineGoalId}
                                habitFilterLifeGoalId={habitFilterLifeGoalId}
                                setHabitFilterLifeGoalId={setHabitFilterLifeGoalId}
                                selectedTargetDate={activeCenterTab === 'calendar' ? selectedTargetDate : null}
                                setSelectedTargetDate={setSelectedTargetDate}
                                dailyLogs={activeRoutine.dailyLogs || {}}
                                toggleDailyGoal={toggleDailyGoal}
                                dayMapping={dayMapping}
                                isCalendarTab={activeCenterTab === 'calendar'}
                                activeRoutine={activeRoutine}
                                calendarSubTab={calendarSubTab}
                                setCalendarSubTab={setCalendarSubTab}
                                updateActiveRoutine={updateActiveRoutine}
                                isRoutineDrawerOpen={isRoutineDrawerOpen}
                                setIsRoutineDrawerOpen={setIsRoutineDrawerOpen}
                    />
                </React.Suspense>
            </main>


            {/* Routine Modal */}
            {showRoutineModal && (<React.Suspense fallback={null}>
                <RoutineModal
                    showRoutineModal={showRoutineModal}
                    setShowRoutineModal={setShowRoutineModal}
                    routineModalView={routineModalView}
                    setRoutineModalView={setRoutineModalView}
                    routines={routines}
                    setRoutines={setRoutines}
                    activeRoutineId={activeRoutineId}
                    setActiveRoutineId={setActiveRoutineId}
                    editingRoutineId={editingRoutineId}
                    setEditingRoutineId={setEditingRoutineId}
                    activeRoutine={activeRoutine}
                    lifeGoals={lifeGoals}
                    setConfirmConfig={setConfirmConfig}
                />
            </React.Suspense>)}

            {/* Confirm Modal */}
            {confirmConfig && (<ConfirmModal
                title={confirmConfig.title}
                message={confirmConfig.message}
                isDanger={confirmConfig.isDanger}
                onConfirm={confirmConfig.onConfirm}
                onCancel={confirmConfig.onCancel}
                cancelText={confirmConfig.onCancel ? "Cancel" : undefined}
                confirmText={confirmConfig.onCancel ? "Confirm" : "OK"}
            />)}

            {showSettingsModal && (<React.Suspense fallback={null}>
                <SettingsModal
                    showSettingsModal={showSettingsModal}
                    setShowSettingsModal={setShowSettingsModal}
                    settingsTab={settingsTab}
                    setSettingsTab={setSettingsTab}
                    syncForm={syncForm}
                    setSyncForm={setSyncForm}
                    saveSyncConfig={saveSyncConfig}
                    aiConfig={aiConfig}
                    setAiConfig={setAiConfig}
                    exportAllData={exportAllData}
                    fileInputRef={fileInputRef as any}
                />
            </React.Suspense>)}

            {/* Footer to convey end of scroll */}
            <footer style={{
                textAlign: 'center',
                padding: '12px 0 0 0',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
            }}>
                <QuotesWidget/>
                <div>Made with <span style={{color: 'var(--accent)'}}>♥</span> by
                    whatchadoin &copy; {new Date().getFullYear()}</div>

            </footer>
        </div>
        {/* End Main App Container */}

        {/* Docked AI Agent */}

        {aiDockState === 'right' && (<div className="ai-dock-container ai-dock-right" style={{
            width: '400px', borderLeft: '1px solid var(--panel-border)', flexShrink: 0, height: '100%'
        }}>
            <React.Suspense
                fallback={<div style={{padding: '20px', color: 'var(--text-secondary)'}}>Loading Assistant...</div>}>
                <AIAgentApp isDocked={true}/>
            </React.Suspense>
        </div>)}
        {aiDockState === 'bottom' && (<div className="ai-dock-container ai-dock-bottom" style={{
            height: '400px', borderTop: '1px solid var(--panel-border)', flexShrink: 0, width: '100%'
        }}>
            <React.Suspense
                fallback={<div style={{padding: '20px', color: 'var(--text-secondary)'}}>Loading Assistant...</div>}>
                <AIAgentApp isDocked={true}/>
            </React.Suspense>
        </div>)}

        <input name="auto_field_1" type="file" ref={fileInputRef} accept=".json" style={{display: 'none'}}
               onChange={importRoutine}/>
    </div>);
}
