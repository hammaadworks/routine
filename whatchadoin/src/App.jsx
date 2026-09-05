import { useState, useEffect, useRef, useCallback } from 'react';
import { createTimeline, utils } from 'animejs';
import RoutineGoalPane from './components/RoutineGoalPane';
import HabitPane from './components/HabitPane';
import Timeline from './components/Timeline';
import PlansPane from './components/PlansPane';
import CalendarPane from './components/CalendarPane';
import Dropdown from './components/Dropdown';
import ConfirmModal from './components/ConfirmModal';
import BaseModal from './components/BaseModal';
import { saveSyncConfig } from './sync';
import { Command, Calendar, Clock, BookOpen, Layers, Plus, Copy, Trash2, Download, Import, DatabaseBackup, ChevronDown, Star, Bot, Settings } from 'lucide-react';
import './index.css';
import LifePane from './components/LifePane';
import AIAgentApp from './components/AIAgentApp';
import MobileTabBar from './components/MobileTabBar';
import QuotesWidget from './components/QuotesWidget';

export default function App() {
  const [routines, setRoutines] = useState(() => {
    let saved = localStorage.getItem('whatchadoin_routines');
    
    if (!saved) {
      const oldVersions = localStorage.getItem('whatchadoin_versions');
      if (oldVersions) {
        let parsedVersions = JSON.parse(oldVersions);
        parsedVersions = parsedVersions.map(v => {
          const migratedRoutine = { ...v };
          
          migratedRoutine.routineGoals = v.sprintGoals || [];
          delete migratedRoutine.sprintGoals;
          
          migratedRoutine.habits = v.routineGoals || [];
          
          if (migratedRoutine.templates) {
            migratedRoutine.templates = migratedRoutine.templates.map(t => ({
              ...t,
              blocks: (t.blocks || []).map(b => {
                if (b.type === 'sprint') return { ...b, type: 'routineGoal' };
                if (b.type === 'routine') return { ...b, type: 'habit' };
                return b;
              })
            }));
          }
          return migratedRoutine;
        });
        saved = JSON.stringify(parsedVersions);
        localStorage.setItem('whatchadoin_routines', saved);
        localStorage.removeItem('whatchadoin_versions');
      }
    }

    if (saved) {
      let parsed = JSON.parse(saved);
      // Migrate old array milestones to empty object as requested by user
      parsed = parsed.map(v => {
        if (Array.isArray(v.milestones)) {
          return { ...v, milestones: {} };
        }
        return v;
      });
      
      // Cleanup orphaned plans/folders that don't belong to any existing routine
      const validRoutineIds = new Set(parsed.map(v => v.id));
      const keysToRemove = [];
      let keysRemoved = false;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('whatchadoin_plans_') || key.startsWith('whatchadoin_plans_folders_'))) {
          const isFolder = key.startsWith('whatchadoin_plans_folders_');
          const vId = key.replace(isFolder ? 'whatchadoin_plans_folders_' : 'whatchadoin_plans_', '');
          if (!validRoutineIds.has(vId)) {
            keysToRemove.push(key);
            keysRemoved = true;
          }
        }
      }
      if (keysRemoved) {
        keysToRemove.forEach(k => localStorage.removeItem(k));
        localStorage.setItem('whatchadoin_force_sync_push', 'true');
      }
      
      return parsed;
    }
    
    // Legacy Migration
    const oldPeriod = JSON.parse(localStorage.getItem('whatchadoin_period') || '{"start":"","end":""}');
    const oldRoutineGoals_OLD = JSON.parse(localStorage.getItem('whatchadoin_sprintGoals') || '[]');
    let oldRoutineGoals = JSON.parse(localStorage.getItem('whatchadoin_routineGoals') || '[]');
    if (oldRoutineGoals.daily || oldRoutineGoals.weekly) {
      oldRoutineGoals = [...(oldRoutineGoals.daily || []), ...(oldRoutineGoals.weekly || [])];
    }
    const oldTemplates = JSON.parse(localStorage.getItem('whatchadoin_templates') || '[{"id":"t1","name":"Vanilla whatchadoin","blocks":[]}]');
    const oldActiveTemplateId = localStorage.getItem('whatchadoin_activeTemplateId') || 't1';
    const oldDayMapping = JSON.parse(localStorage.getItem('whatchadoin_dayMapping') || '{"Monday":"","Tuesday":"","Wednesday":"","Thursday":"","Friday":"","Saturday":"","Sunday":""}');

    return [{
      id: 'v1',
      name: 'Routine 1',
      desc: 'Migrated routine',
      start: oldPeriod.start,
      end: oldPeriod.end,
      routineGoals: oldRoutineGoals_OLD,
      habits: oldRoutineGoals,
      templates: oldTemplates,
      activeTemplateId: oldActiveTemplateId,
      dayMapping: oldDayMapping
    }];
  });

  const [lifeGoals, setLifeGoals] = useState(() => {
    return JSON.parse(localStorage.getItem('whatchadoin_lifeGoals') || '[]');
  });

  const [activeRoutineId, setActiveRoutineId] = useState(() => {
    const saved = localStorage.getItem('whatchadoin_activeRoutineId');
    if (saved) return saved;
    const oldSaved = localStorage.getItem('whatchadoin_activeVersionId');
    if (oldSaved) {
      localStorage.setItem('whatchadoin_activeRoutineId', oldSaved);
      localStorage.removeItem('whatchadoin_activeVersionId');
      return oldSaved;
    }
    return 'v1';
  });

  const [activeCenterTab, setActiveCenterTab] = useState('timeline');
  const [mobileTab, setMobileTab] = useState('timeline'); // 'strategy' | 'timeline' | 'habits'
  const [activeLeftTab, setActiveLeftTab] = useState('routine');
  const [calendarSubTab, setCalendarSubTab] = useState('mark_goals');
  const [selectedTargetDate, setSelectedTargetDate] = useState(null);
  const [habitFilterRoutineGoalId, setHabitFilterRoutineGoalId] = useState(null);
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [routineModalView, setRoutineModalView] = useState('list'); // 'list' | 'edit'
  const [editingRoutineId, setEditingRoutineId] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [isMidPaneExpanded, setIsMidPaneExpanded] = useState(true);
  const [isLeftPaneExpanded, setIsLeftPaneExpanded] = useState(false);
  const [aiDockState, setAiDockState] = useState('closed'); // 'closed', 'right', 'bottom', 'popped_out'
  
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState('sync'); // 'sync' | 'ai'
  const [aiConfig, setAiConfig] = useState(() => {
    const saved = localStorage.getItem('whatchadoin_ai_config');
    return saved ? JSON.parse(saved) : {
      provider: 'openai',
      apiKey: '',
      model: 'gpt-4o',
      customEndpoint: ''
    };
  });

  // Watch aiConfig and update local storage, then broadcast event if dock is open
  useEffect(() => {
    localStorage.setItem('whatchadoin_ai_config', JSON.stringify(aiConfig));
    window.dispatchEvent(new CustomEvent('ai_config_updated', { detail: aiConfig }));
  }, [aiConfig]);

  useEffect(() => {
    const handleOpenSettings = (e) => {
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
  const fileInputRef = useRef(null);

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

  const updateActiveRoutine = useCallback((updates) => {
    setRoutines(prev => prev.map(v => {
      if (v.id === activeRoutineId) {
        let newUpdates = {};
        for (let key in updates) {
          if (typeof updates[key] === 'function') {
            newUpdates[key] = updates[key](v[key]);
          } else {
            newUpdates[key] = updates[key];
          }
        }
        return { ...v, ...newUpdates };
      }
      return v;
    }));
  }, [activeRoutineId]);

  useEffect(() => {
    const channel = new BroadcastChannel('whatchadoin_ai_channel');
    
    const appState = {
      activeRoutine,
      routines,
      lifeGoals,
      activeCenterTab,
      activeLeftTab
    };
    channel.postMessage({ type: 'STATE_UPDATE', payload: appState });

    channel.onmessage = (event) => {
      const data = event.data;
      if (data.type === 'PING') {
        channel.postMessage({ type: 'STATE_UPDATE', payload: appState });
      } else if (data.type === 'DOCK_COMMAND') {
        setAiDockState(data.payload);
      } else if (data.type === 'TOOL_EXECUTION') {
        const { tool, args, callId } = data;
        try {
          if (tool === 'navigate_app') {
            if (args.centerTab) setActiveCenterTab(args.centerTab);
            if (args.leftTab) setActiveLeftTab(args.leftTab);
          } else if (tool === 'add_life_goal') {
            setLifeGoals(prev => [...prev, { id: crypto.randomUUID(), ...args }]);
          } else if (tool === 'add_routine_goal') {
             updateActiveRoutine({
               routineGoals: [...(activeRoutine.routineGoals || []), { id: crypto.randomUUID(), ...args }]
             });
          } else {
            throw new Error(`Unknown tool: ${tool}`);
          }
          channel.postMessage({ type: 'TOOL_RESULT', callId, status: 'success' });
        } catch (err) {
          channel.postMessage({ type: 'TOOL_RESULT', callId, status: 'error', error: err.message });
        }
      }
    };
    
    return () => channel.close();
  }, [routines, activeRoutineId, activeRoutine, lifeGoals, activeCenterTab, activeLeftTab, updateActiveRoutine]);



  const setRoutineGoals = (goals) => updateActiveRoutine({ routineGoals: goals });
  const setHabits = (goals) => updateActiveRoutine({ habits: goals });
  const setTemplates = (templates) => updateActiveRoutine({ templates: templates });
  const setActiveTemplateId = (id) => updateActiveRoutine({ activeTemplateId: id });
  const setDayMapping = (mapping) => updateActiveRoutine({ dayMapping: mapping });

  const toggleDailyGoal = (dateStr, goalId) => {
    const currentLogs = activeRoutine.dailyLogs || {};
    const dayLog = currentLogs[dateStr] || {};
    const isCompleted = dayLog[goalId] || false;
    
    updateActiveRoutine({
      dailyLogs: {
        ...currentLogs,
        [dateStr]: {
          ...dayLog,
          [goalId]: !isCompleted
        }
      }
    });
  };




  const exportAllData = () => {
    const allPlans = {};
    const allFolders = {};
    routines.forEach(v => {
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

  const importRoutine = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        
        if (data.isFullBackup) {
          setConfirmConfig({
            title: 'Import Full Backup',
            message: 'This will REPLACE all your existing routines and plans with the imported data. Are you absolutely sure?',
            isDanger: true,
            onConfirm: () => {
              routines.forEach(v => {
                localStorage.removeItem(`whatchadoin_plans_${v.id}`);
                localStorage.removeItem(`whatchadoin_plans_folders_${v.id}`);
              });

              data.routines.forEach(v => {
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
            ...data.routine,
            id: newId,
            name: `${data.routine.name} (Imported)`
          };
          setRoutines(prev => [...prev, newRoutine]);
          if (data.plans) {
            localStorage.setItem(`whatchadoin_plans_${newId}`, JSON.stringify(data.plans));
          }
          if (data.plansFolders) {
            localStorage.setItem(`whatchadoin_plans_folders_${newId}`, JSON.stringify(data.plansFolders));
          }
          if (data.lifeGoals) {
            setLifeGoals(prev => {
              const existingIds = new Set(prev.map(g => g.id));
              const newGoals = data.lifeGoals.filter(g => !existingIds.has(g.id));
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
    e.target.value = null;
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
    createTimeline({ easing: 'easeOutExpo' })
      .add({
        targets: '.pane',
        translateY: [30, 0],
        opacity: [0, 1],
        duration: 1200,
        delay: utils.stagger(150, { start: 100 }),
      })
      .add({
        targets: '.item-card, .time-slot .time-label',
        translateY: [15, 0],
        opacity: [0, 1],
        duration: 800,
        delay: utils.stagger(30),
      }, '-=800');
  }, []);

  return (
    <div className={`layout dock-${aiDockState}`}>
      
      {/* Main App Container */}
      <div className="main-app-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', background: 'var(--panel-bg)', borderBottom: '1px solid var(--panel-border)', flexShrink: 0 }}>
        {/* Left: Identity */}
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0, flex: 1 }}>
          <div style={{ background: 'var(--accent)', padding: '6px', borderRadius: '8px', display: 'flex' }}>
            <Command size={20} color="#000" />
          </div>
          <span className="mobile-hidden" style={{ fontSize: '20px', fontWeight: 'bold' }}>whatchadoin</span>
        </h1>

        {/* Center: Context (Routine Selector) */}
        <div className="header-center-panel" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, gap: '16px' }}>
          <div className="active-period-block" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Active Period</span>
            <span style={{ fontSize: '12px', color: '#fff', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>
              {activeRoutine.start && activeRoutine.end ? `${activeRoutine.start} to ${activeRoutine.end}` : 'No Dates Set'}
            </span>
          </div>
          
          <div className="header-divider" />

          <div className="routine-selector">
            <button 
              onClick={() => {
                setRoutineModalView('list');
                setShowRoutineModal(true);
              }} 
              className="icon-btn" 
              style={{ padding: '8px 16px', background: 'var(--bg)', border: '1px solid var(--panel-border)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#fff', fontSize: '14px' }} 
              title="Switch or Manage Routines"
            >
              {activeRoutine?.name || 'Select Routine'} <ChevronDown size={16} color="var(--text-secondary)" />
            </button>
          </div>
        </div>

        {/* Right: Global Actions */}
        <div className="header-controls" style={{ flex: 1, justifyContent: 'flex-end', gap: '12px', display: 'flex' }}>
          <button className="icon-btn" style={{ padding: '8px', background: 'var(--accent)', border: '1px solid var(--panel-border)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setAiDockState(prev => prev === 'closed' ? 'right' : 'closed')} title="AI Agent">
            <Bot size={16} color="#000" /> <span className="mobile-hidden" style={{ fontSize: '13px', fontWeight: '600', color: '#000' }}>AI Agent</span>
          </button>
          
          <button className="icon-btn" style={{ padding: '8px', background: 'var(--bg)', border: '1px solid var(--panel-border)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowSettingsModal(true)} title="Settings">
            <Settings size={18} color="var(--text-secondary)" />
          </button>
        </div>
      </header>

      <main className={`main-content mobile-tab-${mobileTab}`}>
        <div className={`panel pane left-pane ${isLeftPaneExpanded ? '' : 'mobile-collapsed'}`} style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          <div className="panel-header" onClick={() => setIsLeftPaneExpanded(!isLeftPaneExpanded)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', cursor: 'pointer', borderBottom: '1px solid var(--panel-border)' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Star size={18} color="var(--accent)" /> Strategy & Goals
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button className="accordion-icon icon-btn" style={{ padding: '4px' }}>
                <ChevronDown size={16} style={{ transform: isLeftPaneExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
            {activeLeftTab === 'routine' ? (
              <RoutineGoalPane 
                routineGoals={routineGoals} setRoutineGoals={setRoutineGoals}
                habits={habits} setHabits={setHabits} 
                templates={templates} setTemplates={setTemplates}
                activeTemplateId={activeTemplateId} dayMapping={dayMapping}
                onRoutineGoalBadgeClick={(id) => setHabitFilterRoutineGoalId(id)}
                lifeGoals={lifeGoals}
                headerTabs={
                  <div className="tabs" style={{ marginBottom: '16px', borderBottom: '1px solid var(--panel-border)', background: 'transparent' }}>
                    <button 
                      className={`tab ${activeLeftTab === 'life' ? 'active' : ''}`} 
                      onClick={() => setActiveLeftTab('life')}
                    >
                      Life Goals
                    </button>
                    <button 
                      className={`tab ${activeLeftTab === 'routine' ? 'active' : ''}`} 
                      onClick={() => setActiveLeftTab('routine')}
                    >
                      Routine Goals
                    </button>
                  </div>
                }
              />
            ) : (
              <LifePane 
                lifeGoals={lifeGoals} setLifeGoals={setLifeGoals}
                routineGoals={routineGoals} setRoutineGoals={setRoutineGoals}
                habits={habits} setHabits={setHabits}
                templates={templates} setTemplates={setTemplates}
                headerTabs={
                  <div className="tabs" style={{ marginBottom: '16px', borderBottom: '1px solid var(--panel-border)', background: 'transparent' }}>
                    <button 
                      className={`tab ${activeLeftTab === 'life' ? 'active' : ''}`} 
                      onClick={() => setActiveLeftTab('life')}
                    >
                      Life Goals
                    </button>
                    <button 
                      className={`tab ${activeLeftTab === 'routine' ? 'active' : ''}`} 
                      onClick={() => setActiveLeftTab('routine')}
                    >
                      Routine Goals
                    </button>
                  </div>
                }
              />
            )}
          </div>
        </div>
        
        <div className={`timeline-area ${isMidPaneExpanded ? '' : 'mobile-collapsed'}`} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, padding: 0 }}>
          <div className="tabs" onClick={() => setIsMidPaneExpanded(!isMidPaneExpanded)} style={{ cursor: 'pointer', marginBottom: '0', borderBottom: '1px solid var(--panel-border)', background: 'var(--panel-bg)' }}>
            <button 
              className={`tab ${activeCenterTab === 'timeline' ? 'active' : ''}`} 
              onClick={() => setActiveCenterTab('timeline')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
            >
              <Clock size={16} /> Timeline
            </button>
            <button 
              className={`tab ${activeCenterTab === 'calendar' ? 'active' : ''}`} 
              onClick={() => setActiveCenterTab('calendar')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
            >
              <Calendar size={16} /> Calendar
            </button>
            <button 
              className={`tab ${activeCenterTab === 'plans' ? 'active' : ''}`} 
              onClick={() => setActiveCenterTab('plans')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
            >
              <BookOpen size={16} /> Plans
            </button>
            <button className="accordion-icon icon-btn" style={{ marginLeft: 'auto', padding: '4px' }}>
              <ChevronDown size={16} style={{ transform: isMidPaneExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </button>
          </div>
          
          <div className="mid-pane-content" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {activeCenterTab === 'timeline' ? (
              <Timeline 
                templates={templates} 
                setTemplates={setTemplates}
                activeTemplateId={activeTemplateId}
                setActiveTemplateId={setActiveTemplateId}
                dayMapping={dayMapping}
                setDayMapping={setDayMapping}
                updateActiveRoutine={updateActiveRoutine}
                habits={habits}
                routineGoals={routineGoals}
              />
            ) : activeCenterTab === 'plans' ? (
              <PlansPane 
                key={activeRoutineId}
                routineGoals={routineGoals}
                habits={habits}
                lifeGoals={lifeGoals}
                activeRoutineId={activeRoutineId}
              />
            ) : (
              <CalendarPane 
                activeRoutine={activeRoutine}
                setCalendarSubTab={setCalendarSubTab}
                updateActiveRoutine={updateActiveRoutine}
                routineGoals={routineGoals}
                lifeGoals={lifeGoals}
                selectedTargetDate={selectedTargetDate}
                setSelectedTargetDate={setSelectedTargetDate}
                habits={habits}
                templates={templates}
                dayMapping={dayMapping}
              />
            )}
          </div>
        </div>

        <HabitPane 
          habits={habits} setHabits={setHabits}
          templates={templates} setTemplates={setTemplates}
          routineGoals={routineGoals} setRoutineGoals={setRoutineGoals}
          lifeGoals={lifeGoals}
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
      <BaseModal
        isOpen={showRoutineModal}
        onClose={() => setShowRoutineModal(false)}
        maxWidth="480px"
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {routineModalView === 'edit' ? (
              <button 
                onClick={() => setRoutineModalView('list')}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: 0, marginRight: '12px' }}
              >
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>&lsaquo; Back</span>
              </button>
            ) : (
              <Layers size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: 'var(--accent)' }} /> 
            )}
            {routineModalView === 'edit' ? 'Edit Routine' : 'Your Routines'}
          </div>
        }
      >
        {routineModalView === 'list' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {routines.map(r => (
              <div 
                key={r.id} 
                onClick={() => {
                  setActiveRoutineId(r.id);
                  setShowRoutineModal(false);
                }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: activeRoutineId === r.id ? 'rgba(234, 179, 8, 0.1)' : 'rgba(0,0,0,0.2)', border: activeRoutineId === r.id ? '1px solid var(--accent)' : '1px solid var(--panel-border)', borderRadius: '8px', cursor: 'pointer' }}
              >
                <div>
                  <div style={{ fontWeight: '600', color: activeRoutineId === r.id ? 'var(--accent)' : '#fff' }}>{r.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {r.start && r.end ? `${r.start} to ${r.end}` : 'No Dates Set'}
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingRoutineId(r.id);
                    setRoutineModalView('edit');
                  }}
                  className="icon-btn" 
                  style={{ padding: '8px', background: 'var(--bg)', borderRadius: '6px', border: '1px solid var(--panel-border)' }}
                >
                  <Settings size={14} color="var(--text-secondary)" />
                </button>
              </div>
            ))}
            
            <button 
              onClick={() => {
                const newId = Date.now().toString();
                setRoutines([...routines, {
                  id: newId,
                  name: `Routine ${routines.length + 1}`,
                  desc: '',
                  start: '',
                  end: '',
                  routineGoals: [],
                  habits: [],
                  templates: [{ id: 't1', name: 'Vanilla whatchadoin', blocks: [] }],
                  activeTemplateId: 't1',
                  dayMapping: { Monday: '', Tuesday: '', Wednesday: '', Thursday: '', Friday: '', Saturday: '', Sunday: '' }
                }]);
                setActiveRoutineId(newId);
                setEditingRoutineId(newId);
                setRoutineModalView('edit');
              }}
              style={{ marginTop: '8px', padding: '16px', background: 'transparent', border: '1px dashed var(--panel-border)', borderRadius: '8px', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <Plus size={16} /> Create New Routine
            </button>
          </div>
        ) : (
          (() => {
            const editRoutine = routines.find(r => r.id === (editingRoutineId || activeRoutineId)) || activeRoutine;
            
            const handleUpdate = (updates) => {
              if (updates.start !== undefined || updates.end !== undefined) {
                const newStart = updates.start !== undefined ? updates.start : editRoutine.start;
                const newEnd = updates.end !== undefined ? updates.end : editRoutine.end;
                if (newStart && newEnd) {
                  const [y1, m1, d1] = newStart.split('-');
                  const date1 = new Date(y1, m1 - 1, d1);
                  const [y2, m2, d2] = newEnd.split('-');
                  const date2 = new Date(y2, m2 - 1, d2);
                  
                  if (date2 < date1) {
                    setConfirmConfig({ title: 'Invalid Dates', message: 'End date cannot be before start date.', isDanger: true, onConfirm: () => setConfirmConfig(null) });
                    return;
                  }
                  const monthDiff = (date2.getFullYear() - date1.getFullYear()) * 12 + (date2.getMonth() - date1.getMonth());
                  if (monthDiff > 6) {
                    setConfirmConfig({ title: 'Invalid Dates', message: 'Target period cannot exceed 6 months.', isDanger: true, onConfirm: () => setConfirmConfig(null) });
                    return;
                  }
                }
              }
              setRoutines(routines.map(r => r.id === editRoutine.id ? { ...r, ...updates } : r));
            };

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Routine Name</label>
                  <input type="text" value={editRoutine.name} onChange={(e) => handleUpdate({ name: e.target.value })} onBlur={(e) => handleUpdate({ name: e.target.value.trim() })} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', borderRadius: '8px', color: '#fff', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Description (optional)</label>
                  <input type="text" value={editRoutine.desc || ''} onChange={(e) => handleUpdate({ desc: e.target.value })} onBlur={(e) => handleUpdate({ desc: e.target.value.trim() })} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', borderRadius: '8px', color: '#fff', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Start Date</label>
                    <input 
                      type="date" 
                      value={editRoutine.start || ''} 
                      onChange={(e) => handleUpdate({ start: e.target.value })} 
                      onKeyDown={(e) => e.preventDefault()}
                      onClick={(e) => { if (e.target.showPicker) e.target.showPicker(); }}
                      style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', borderRadius: '8px', color: '#fff', cursor: 'pointer' }} 
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>End Date</label>
                    <input 
                      type="date" 
                      value={editRoutine.end || ''} 
                      onChange={(e) => handleUpdate({ end: e.target.value })} 
                      onKeyDown={(e) => e.preventDefault()}
                      onClick={(e) => { if (e.target.showPicker) e.target.showPicker(); }}
                      style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', borderRadius: '8px', color: '#fff', cursor: 'pointer' }} 
                    />
                  </div>
                </div>

                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button 
                    onClick={() => {
                      const newId = Date.now().toString();
                      const plans = localStorage.getItem(`whatchadoin_plans_${editRoutine.id}`);
                      if (plans) localStorage.setItem(`whatchadoin_plans_${newId}`, plans);
                      const folders = localStorage.getItem(`whatchadoin_plans_folders_${editRoutine.id}`);
                      if (folders) localStorage.setItem(`whatchadoin_plans_folders_${newId}`, folders);
                      setRoutines([...routines, { ...editRoutine, id: newId, name: `${editRoutine.name} (Copy)` }]);
                      setActiveRoutineId(newId);
                      setRoutineModalView('list');
                    }} 
                    className="secondary" 
                    style={{ padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', borderRadius: '8px', fontSize: '14px', border: '1px solid var(--panel-border)' }}
                  >
                    <Copy size={16} /> Duplicate Routine
                  </button>
                  
                  <button 
                    onClick={() => {
                      const plans = JSON.parse(localStorage.getItem(`whatchadoin_plans_${editRoutine.id}`) || '[]');
                      const plansFolders = JSON.parse(localStorage.getItem(`whatchadoin_plans_folders_${editRoutine.id}`) || '[]');
                      const backupData = { routine: editRoutine, plans, plansFolders, lifeGoals };
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
                      const a = document.createElement('a');
                      a.href = dataStr;
                      a.download = `whatchadoin_routine_${editRoutine.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
                      a.click();
                    }} 
                    className="secondary" 
                    style={{ padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', borderRadius: '8px', fontSize: '14px', border: '1px solid var(--panel-border)' }}
                  >
                    <Download size={16} /> Export Routine
                  </button>

                  <button 
                    onClick={() => {
                      setConfirmConfig({
                        title: 'Delete Routine',
                        message: 'Are you sure you want to delete this routine?',
                        isDanger: true,
                        onConfirm: () => {
                          localStorage.removeItem(`whatchadoin_plans_${editRoutine.id}`);
                          localStorage.removeItem(`whatchadoin_plans_folders_${editRoutine.id}`);
                          const newRoutines = routines.filter(v => v.id !== editRoutine.id);
                          if (newRoutines.length === 0) {
                            const vanillaId = Date.now().toString();
                            setRoutines([{ id: vanillaId, name: 'Vanilla', desc: '', start: '', end: '', routineGoals: [], habits: [], templates: [{ id: 't1', name: 'Vanilla whatchadoin', blocks: [] }], activeTemplateId: 't1', dayMapping: { Monday: '', Tuesday: '', Wednesday: '', Thursday: '', Friday: '', Saturday: '', Sunday: '' } }]);
                            setActiveRoutineId(vanillaId);
                          } else {
                            setRoutines(newRoutines);
                            if (activeRoutineId === editRoutine.id) setActiveRoutineId(newRoutines[0].id);
                          }
                          setConfirmConfig(null);
                          setRoutineModalView('list');
                        },
                        onCancel: () => setConfirmConfig(null)
                      });
                    }} 
                    className="secondary" 
                    style={{ padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', borderRadius: '8px', color: 'var(--danger)', marginTop: '8px', fontSize: '14px', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)' }}
                  >
                    <Trash2 size={16} /> Delete Routine
                  </button>
                </div>
              </div>
            );
          })()
        )}
      </BaseModal>

      {/* Confirm Modal */}
      {confirmConfig && (
        <ConfirmModal 
          title={confirmConfig.title}
          message={confirmConfig.message}
          isDanger={confirmConfig.isDanger}
          onConfirm={confirmConfig.onConfirm}
          onCancel={confirmConfig.onCancel}
          cancelText={confirmConfig.onCancel ? "Cancel" : null}
          confirmText={confirmConfig.onCancel ? "Confirm" : "OK"}
        />
      )}

      {/* Settings Modal */}
      <BaseModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)}
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} color="var(--accent)" /> Settings
          </span>
        }
      >
        <div style={{ display: 'flex', borderBottom: '1px solid var(--panel-border)', marginBottom: '16px', overflowX: 'auto' }}>
          <button 
            onClick={() => setSettingsTab('sync')}
            style={{ flex: 1, padding: '10px', background: 'transparent', border: 'none', borderBottom: settingsTab === 'sync' ? '2px solid var(--accent)' : '2px solid transparent', color: settingsTab === 'sync' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}
          >
            Cloud Sync
          </button>
          <button 
            onClick={() => setSettingsTab('ai')}
            style={{ flex: 1, padding: '10px', background: 'transparent', border: 'none', borderBottom: settingsTab === 'ai' ? '2px solid var(--accent)' : '2px solid transparent', color: settingsTab === 'ai' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}
          >
            AI Config
          </button>
          <button 
            onClick={() => setSettingsTab('data')}
            style={{ flex: 1, padding: '10px', background: 'transparent', border: 'none', borderBottom: settingsTab === 'data' ? '2px solid var(--accent)' : '2px solid transparent', color: settingsTab === 'data' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}
          >
            Data Backup
          </button>
        </div>

        {settingsTab === 'sync' && (
          <div 
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text');
              if (text.includes('PAT=') || text.includes('GID=') || text.includes('FILE=')) {
                e.preventDefault();
                const lines = text.split('\n');
                let newSyncForm = { ...syncForm };
                lines.forEach(line => {
                  const [key, ...valParts] = line.split('=');
                  if (!key) return;
                  const val = valParts.join('=').trim();
                  const k = key.trim().toUpperCase();
                  if (k === 'PAT') newSyncForm.token = val;
                  if (k === 'GID') newSyncForm.id = val;
                  if (k === 'FILE') newSyncForm.filename = val;
                });
                setSyncForm(newSyncForm);
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Sync your data across devices seamlessly. Create a <a href="https://gist.github.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>private GitHub Gist</a>, and generate a <a href="https://github.com/settings/tokens/new?scopes=gist&description=whatchadoin+Sync" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Personal Access Token</a> (classic) with the <code>gist</code> scope.
              </p>
              <button
                onClick={async () => {
                  const text = `PAT=${syncForm.token || ''}\nGID=${syncForm.id || ''}\nFILE=${syncForm.filename || ''}`;
                  await navigator.clipboard.writeText(text);
                  const btn = document.getElementById('copy-creds-btn');
                  if (btn) {
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '<span style="font-size: 12px; color: var(--accent);">Copied!</span>';
                    setTimeout(() => { btn.innerHTML = originalText; }, 2000);
                  }
                }}
                id="copy-creds-btn"
                className="icon-btn"
                style={{ padding: '6px 10px', background: 'var(--bg)', border: '1px solid var(--panel-border)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
                title="Copy Credentials"
              >
                <Copy size={14} color="var(--text-secondary)" /> <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Copy</span>
              </button>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>GitHub Personal Access Token</label>
              <input 
                type="password" 
                placeholder="ghp_..." 
                value={syncForm.token}
                onChange={(e) => setSyncForm({ ...syncForm, token: e.target.value })} 
                style={{ width: '100%', fontFamily: 'monospace', padding: '10px', background: 'var(--bg)', border: '1px solid var(--panel-border)', borderRadius: '6px', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Gist ID</label>
              <input 
                type="text" 
                placeholder="e.g. 8a892b3c..." 
                value={syncForm.id}
                onChange={(e) => setSyncForm({ ...syncForm, id: e.target.value })} 
                style={{ width: '100%', fontFamily: 'monospace', padding: '10px', background: 'var(--bg)', border: '1px solid var(--panel-border)', borderRadius: '6px', color: '#fff' }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                You can find this in the Gist URL: gist.github.com/username/<b>[GIST_ID]</b>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Filename</label>
              <input 
                type="text" 
                placeholder="e.g. whatchadoin_data.json" 
                value={syncForm.filename}
                onChange={(e) => setSyncForm({ ...syncForm, filename: e.target.value })} 
                style={{ width: '100%', fontFamily: 'monospace', padding: '10px', background: 'var(--bg)', border: '1px solid var(--panel-border)', borderRadius: '6px', color: '#fff' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button 
                type="button" 
                onClick={() => {
                  setSyncForm({ token: '', id: '', filename: 'whatchadoin_data.json' });
                  saveSyncConfig('', '', '');
                }} 
                style={{ flex: 1, padding: '10px 0', borderRadius: '6px', fontWeight: '500', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}
              >
                Disconnect
              </button>
              <button 
                type="button" 
                onClick={() => {
                  saveSyncConfig(syncForm.token, syncForm.id, syncForm.filename);
                  setShowSettingsModal(false);
                }} 
                className="primary" 
                style={{ flex: 2, padding: '10px 0', borderRadius: '6px', fontWeight: 'bold' }}
              >
                Save & Sync
              </button>
            </div>
          </div>
        )}

        {settingsTab === 'ai' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Provider</label>
              <select 
                value={aiConfig.provider} 
                onChange={e => setAiConfig({...aiConfig, provider: e.target.value})}
                style={{ width: '100%', padding: '10px', background: 'var(--bg)', border: '1px solid var(--panel-border)', color: '#fff', borderRadius: '6px' }}
              >
                <option value="openai">OpenAI</option>
                <option value="groq">Groq</option>
                <option value="gemini">Gemini</option>
                <option value="custom">Custom (OpenAI Compatible)</option>
              </select>
            </div>
            
            {aiConfig.provider === 'custom' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Custom Endpoint URL</label>
                <input 
                  type="text" 
                  value={aiConfig.customEndpoint} 
                  onChange={e => setAiConfig({...aiConfig, customEndpoint: e.target.value})}
                  placeholder="https://your-api.com/v1/chat/completions"
                  style={{ width: '100%', padding: '10px', background: 'var(--bg)', border: '1px solid var(--panel-border)', color: '#fff', borderRadius: '6px' }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Model</label>
              <input 
                type="text" 
                value={aiConfig.model} 
                onChange={e => setAiConfig({...aiConfig, model: e.target.value})}
                placeholder="gpt-4o"
                style={{ width: '100%', padding: '10px', background: 'var(--bg)', border: '1px solid var(--panel-border)', color: '#fff', borderRadius: '6px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>API Key</label>
              <input 
                type="password" 
                value={aiConfig.apiKey} 
                onChange={e => setAiConfig({...aiConfig, apiKey: e.target.value})}
                style={{ width: '100%', padding: '10px', background: 'var(--bg)', border: '1px solid var(--panel-border)', color: '#fff', borderRadius: '6px' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button 
                type="button" 
                onClick={() => {
                  setShowSettingsModal(false);
                }} 
                className="primary" 
                style={{ flex: 1, padding: '10px 0', borderRadius: '6px', fontWeight: 'bold' }}
              >
                Done
              </button>
            </div>
          </div>
        )}

        {settingsTab === 'data' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Export all your routines, plans, and goals, or restore from a previous full backup. This is useful for migrating to a new device without using Cloud Sync.
            </p>
            
            <button 
              onClick={exportAllData} 
              className="primary" 
              style={{ padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', borderRadius: '8px', fontWeight: 'bold' }}
            >
              <DatabaseBackup size={16} /> Export All Data
            </button>

            <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, color: 'var(--danger)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Import size={16} /> Import Full Backup
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                Warning: Importing a full backup will <b>permanently replace</b> all your current routines and plans.
              </p>
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="secondary" 
                style={{ padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', borderRadius: '6px', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.4)' }}
              >
                Select Backup File...
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button 
                type="button" 
                onClick={() => setShowSettingsModal(false)} 
                className="secondary" 
                style={{ flex: 1, padding: '10px 0', borderRadius: '6px', fontWeight: 'bold' }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </BaseModal>

      {/* Footer to convey end of scroll */}
      <footer style={{
        textAlign: 'center',
        padding: '12px 0 0 0',
        color: 'var(--text-secondary)',
        fontSize: '11px',
        opacity: 0.5,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        <QuotesWidget />
        <div>Made with <span style={{ color: 'var(--accent)' }}>♥</span> by whatchadoin &copy; {new Date().getFullYear()}</div>

      </footer>
      </div> {/* End Main App Container */}

      {/* Sticky FAB for Mobile */}
      {!(mobileTab === 'timeline' && activeCenterTab !== 'timeline') && (
      <div className="mobile-fab-container">
        <button 
          className="mobile-fab" 
          onClick={() => {
            if (mobileTab === 'goals') window.dispatchEvent(new CustomEvent('fab:add-strategy'));
            if (mobileTab === 'habits') window.dispatchEvent(new CustomEvent('fab:add-habits'));
            if (mobileTab === 'timeline') {
              window.dispatchEvent(new CustomEvent('fab:add-timeline'));
            }
          }}
        >
          <Plus size={24} color="#000" />
        </button>
      </div>
      )}

      {/* Mobile Tab Bar */}
      <MobileTabBar activeTab={mobileTab} onTabChange={setMobileTab} />

      {/* Docked AI Agent */}

      {aiDockState === 'right' && (
        <div className="ai-dock-container ai-dock-right" style={{ width: '400px', borderLeft: '1px solid var(--panel-border)', flexShrink: 0, height: '100%' }}>
          <AIAgentApp isDocked={true} />
        </div>
      )}
      {aiDockState === 'bottom' && (
        <div className="ai-dock-container ai-dock-bottom" style={{ height: '400px', borderTop: '1px solid var(--panel-border)', flexShrink: 0, width: '100%' }}>
          <AIAgentApp isDocked={true} />
        </div>
      )}

      <input type="file" ref={fileInputRef} accept=".json" style={{ display: 'none' }} onChange={importRoutine} />
    </div>
  );
}
