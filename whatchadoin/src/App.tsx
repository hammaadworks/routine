import {useCallback, useEffect, useRef, useState} from 'react';
import {createTimeline, utils} from 'animejs';
import RoutineGoalPane from './components/RoutineGoalPane';
import HabitPane from './components/HabitPane';
import MyDay from './components/MyDay';
import PlansPane from './components/PlansPane';
import CalendarPane from './components/CalendarPane';
import ConfirmModal from './components/ConfirmModal';
import {saveSyncConfig} from './sync';
import {BookOpen, Calendar, ChevronDown, Clock, Plus, Star} from 'lucide-react';
import './index.css';
import LifePane from './components/LifePane';
import AIAgentApp from './components/AIAgentApp';
import MobileTabBar from './components/MobileTabBar';
import QuotesWidget from './components/QuotesWidget';
import Header from './components/Header';
import RoutineModal from './components/RoutineModal';
import SettingsModal from './components/SettingsModal';
import {loadActiveRoutineId, loadRoutines} from './utils/dataStore';

export default function App() {
    const [routines, setRoutines] = useState<any[]>(loadRoutines);

    const [lifeGoals, setLifeGoals] = useState<any[]>(() => {
        return JSON.parse(localStorage.getItem('whatchadoin_lifeGoals') || '[]');
    });

    const [activeRoutineId, setActiveRoutineId] = useState<string>(loadActiveRoutineId);

    const [activeCenterTab, setActiveCenterTab] = useState<string>('timeline');
    const [mobileTab, setMobileTab] = useState<string>('timeline'); // 'strategy' | 'timeline' | 'habits'
    const [activeLeftTab, setActiveLeftTab] = useState<string>('routine');
    const [calendarSubTab, setCalendarSubTab] = useState<string>('mark_goals');
    const [selectedTargetDate, setSelectedTargetDate] = useState<string | null>(null);
    const [habitFilterRoutineGoalId, setHabitFilterRoutineGoalId] = useState<string | null>(null);
    const [showRoutineModal, setShowRoutineModal] = useState<boolean>(false);
    const [routineModalView, setRoutineModalView] = useState<'list' | 'edit'>('list'); // 'list' | 'edit'
    const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
    const [confirmConfig, setConfirmConfig] = useState<any>(null);
    const [isMidPaneExpanded, setIsMidPaneExpanded] = useState<boolean>(true);
    const [isLeftPaneExpanded, setIsLeftPaneExpanded] = useState<boolean>(false);
    const [aiDockState, setAiDockState] = useState<string>('closed'); // 'closed', 'right', 'bottom', 'popped_out'

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
        localStorage.setItem('whatchadoin_lifeGoals', JSON.stringify(lifeGoals));
    }, [lifeGoals]);

    useEffect(() => {
        localStorage.setItem('whatchadoin_routines', JSON.stringify(routines));
    }, [routines]);

    useEffect(() => {
        localStorage.setItem('whatchadoin_activeRoutineId', activeRoutineId);
    }, [activeRoutineId]);

    const activeRoutine = routines.find(v => v.id === activeRoutineId) || routines[0];

    const updateActiveRoutine = useCallback((updates: Record<string, any>) => {
        setRoutines(prev => prev.map((v: any) => {
            if (v.id === activeRoutineId) {
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
        }));
    }, [activeRoutineId]);

    useEffect(() => {
        const channel = new BroadcastChannel('whatchadoin_ai_channel');

        const appState = {
            activeRoutine, routines, lifeGoals, activeCenterTab, activeLeftTab
        };
        channel.postMessage({type: 'STATE_UPDATE', payload: appState});

        channel.onmessage = (event) => {
            const data = event.data;
            if (data.type === 'PING') {
                channel.postMessage({type: 'STATE_UPDATE', payload: appState});
            } else if (data.type === 'DOCK_COMMAND') {
                setAiDockState(data.payload);
            } else if (data.type === 'TOOL_EXECUTION') {
                const {tool, args, callId} = data;
                try {
                    if (tool === 'navigate_app') {
                        if (args.centerTab) setActiveCenterTab(args.centerTab);
                        if (args.leftTab) setActiveLeftTab(args.leftTab);
                    } else if (tool === 'add_life_goal') {
                        setLifeGoals((prev: any[]) => [...prev, {id: crypto.randomUUID(), ...args}]);
                    } else if (tool === 'add_routine_goal') {
                        updateActiveRoutine({
                            routineGoals: [...(activeRoutine.routineGoals || []), {id: crypto.randomUUID(), ...args}]
                        });
                    } else {
                        channel.postMessage({
                            type: 'TOOL_RESULT',
                            callId,
                            status: 'error',
                            error: `Unknown tool: ${tool}`
                        });
                        return;
                    }
                    channel.postMessage({type: 'TOOL_RESULT', callId, status: 'success'});
                } catch (err: any) {
                    channel.postMessage({type: 'TOOL_RESULT', callId, status: 'error', error: err.message});
                }
            }
        };

        return () => channel.close();
    }, [routines, activeRoutineId, activeRoutine, lifeGoals, activeCenterTab, activeLeftTab, updateActiveRoutine]);


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

        const backupData = {
            isFullBackup: true,
            routines: routines,
            activeRoutineId: activeRoutineId,
            allPlans,
            allFolders,
            lifeGoals: lifeGoals
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
                    setActiveRoutineId(newId);
                    setShowRoutineModal(false);
                } else {
                    throw new Error('Invalid backup file');
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

    // Anime.js Entrance Animation
    useEffect(() => {
        // noinspection JSCheckFunctionSignatures
        (createTimeline as any)({easing: 'easeOutExpo'})
            .add({
                targets: '.pane',
                translateY: [30, 0],
                opacity: [0, 1],
                duration: 1200,
                delay: utils.stagger(150, {start: 100}),
            })
            .add({
                targets: '.item-card, .time-slot .time-label',
                translateY: [15, 0],
                opacity: [0, 1],
                duration: 800,
                delay: utils.stagger(30),
            }, '-=800');
    }, []);

    return (<div className={`layout dock-${aiDockState}`}>

        {/* Main App Container */}
        <div className="main-app-wrapper"
             style={{flex: 1, display: 'flex', flexDirection: 'column', height: '100%', gap: '12px'}}>
            <Header
                activeRoutine={activeRoutine}
                setRoutineModalView={setRoutineModalView as any}
                setShowRoutineModal={setShowRoutineModal}
                setAiDockState={setAiDockState as any}
                setShowSettingsModal={setShowSettingsModal}
            />

            <main className={`main-content mobile-tab-${mobileTab}`}>
                <div className={`panel pane left-pane ${isLeftPaneExpanded ? '' : 'mobile-collapsed'}`}
                     style={{display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden'}}>
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
                        {activeLeftTab === 'routine' ? (<RoutineGoalPane
                            routineGoals={routineGoals} setRoutineGoals={setRoutineGoals as any}
                            habits={habits} setHabits={setHabits as any}
                            templates={templates} setTemplates={setTemplates as any}
                            activeTemplateId={activeTemplateId} onRoutineGoalBadgeClick={(id) => setHabitFilterRoutineGoalId(id)}
                            lifeGoals={lifeGoals}
                            headerTabs={<div className="tabs" style={{
                                marginBottom: '16px',
                                borderBottom: '1px solid var(--panel-border)',
                                background: 'transparent'
                            }}>
                                <button
                                    className="tab"
                                    onClick={() => setActiveLeftTab('life')}
                                >
                                    Life Goals
                                </button>
                                <button
                                    className="tab active"
                                    onClick={() => setActiveLeftTab('routine')}
                                >
                                    Routine Goals
                                </button>
                            </div>}
                        />) : (<LifePane
                            lifeGoals={lifeGoals} setLifeGoals={setLifeGoals}
                            routineGoals={routineGoals} setRoutineGoals={setRoutineGoals as any}
                            habits={habits} setHabits={setHabits as any}
                            headerTabs={<div className="tabs" style={{
                                marginBottom: '16px',
                                borderBottom: '1px solid var(--panel-border)',
                                background: 'transparent'
                            }}>
                                <button
                                    className="tab active"
                                    onClick={() => setActiveLeftTab('life')}
                                >
                                    Life Goals
                                </button>
                                <button
                                    className="tab"
                                    onClick={() => setActiveLeftTab('routine')}
                                >
                                    Routine Goals
                                </button>
                            </div>}
                        />)}
                    </div>
                </div>

                <div className={`timeline-area ${isMidPaneExpanded ? '' : 'mobile-collapsed'}`} style={{
                    display: 'flex', flexDirection: 'column', overflow: 'visible', minHeight: 0, padding: 0
                }}>
                    <div className="tabs" onClick={() => setIsMidPaneExpanded(!isMidPaneExpanded)} style={{
                        cursor: 'pointer',
                        marginBottom: '0',
                        borderBottom: '1px solid var(--panel-border)',
                        background: 'var(--panel-bg)',
                        position: 'sticky',
                        top: 0,
                        zIndex: 90
                    }}>
                        <button
                            className={`tab ${activeCenterTab === 'timeline' ? 'active' : ''}`}
                            onClick={() => setActiveCenterTab('timeline')}
                            style={{display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center'}}
                        >
                            <Clock size={16}/> My Day
                        </button>
                        <button
                            className={`tab ${activeCenterTab === 'calendar' ? 'active' : ''}`}
                            onClick={() => setActiveCenterTab('calendar')}
                            style={{display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center'}}
                        >
                            <Calendar size={16}/> Calendar
                        </button>
                        <button
                            className={`tab ${activeCenterTab === 'plans' ? 'active' : ''}`}
                            onClick={() => setActiveCenterTab('plans')}
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

                    <div className="mid-pane-content" style={{flex: 1, display: 'flex', overflow: 'visible'}}>
                        {activeCenterTab === 'timeline' ? (<MyDay
                            templates={templates}
                            setTemplates={setTemplates as any}
                            activeTemplateId={activeTemplateId}
                            setActiveTemplateId={setActiveTemplateId as any}
                            dayMapping={dayMapping}
                            setDayMapping={setDayMapping}
                            updateActiveRoutine={updateActiveRoutine}
                            habits={habits}
                        />) : activeCenterTab === 'plans' ? (<PlansPane
                            key={activeRoutineId}
                            routineGoals={routineGoals}
                            habits={habits}
                            lifeGoals={lifeGoals}
                            activeRoutineId={activeRoutineId}
                        />) : (<CalendarPane
                            activeRoutine={activeRoutine}
                            setCalendarSubTab={setCalendarSubTab}
                            routineGoals={routineGoals}
                            lifeGoals={lifeGoals}
                            selectedTargetDate={selectedTargetDate}
                            setSelectedTargetDate={setSelectedTargetDate}
                            habits={habits}
                            templates={templates}
                            dayMapping={dayMapping}
                        />)}
                    </div>
                </div>

                <HabitPane
                    habits={habits} setHabits={setHabits as any}
                    templates={templates} setTemplates={setTemplates as any}
                    routineGoals={routineGoals} lifeGoals={lifeGoals}
                    activeTemplateId={activeTemplateId}
                    habitFilterRoutineGoalId={habitFilterRoutineGoalId}
                    setHabitFilterRoutineGoalId={setHabitFilterRoutineGoalId}
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
                />
            </main>

            {/* Routine Modal */}
            // @ts-ignore
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

        {/* Sticky FAB for Mobile */}
        {!(mobileTab === 'timeline' && activeCenterTab !== 'timeline') && (<div className="mobile-fab-container">
            <button
                className="mobile-fab"
                onClick={() => {
                    if (mobileTab === 'goals') window.dispatchEvent(new CustomEvent('fab:add-strategy'));
                    if (mobileTab === 'habits') window.dispatchEvent(new CustomEvent('fab:add-habits'));
                    if (mobileTab === 'timeline') {
                        window.dispatchEvent(new CustomEvent('fab:add-myday'));
                    }
                }}
            >
                <Plus size={24} color="#000"/>
            </button>
        </div>)}

        {/* Mobile Tab Bar */}
        <MobileTabBar activeTab={mobileTab} onTabChange={setMobileTab}/>

        {/* Docked AI Agent */}

        {aiDockState === 'right' && (<div className="ai-dock-container ai-dock-right" style={{
            width: '400px', borderLeft: '1px solid var(--panel-border)', flexShrink: 0, height: '100%'
        }}>
            <AIAgentApp isDocked={true}/>
        </div>)}
        {aiDockState === 'bottom' && (<div className="ai-dock-container ai-dock-bottom" style={{
            height: '400px', borderTop: '1px solid var(--panel-border)', flexShrink: 0, width: '100%'
        }}>
            <AIAgentApp isDocked={true}/>
        </div>)}

        <input type="file" ref={fileInputRef} accept=".json" style={{display: 'none'}} onChange={importRoutine}/>
    </div>);
}
