import { useState, useEffect, useRef } from 'react';
import { createTimeline, utils } from 'animejs';
import SprintPane from './components/SprintPane';
import RoutinePane from './components/RoutinePane';
import Timeline from './components/Timeline';
import PlansPane from './components/PlansPane';
import Dropdown from './components/Dropdown';
import ConfirmModal from './components/ConfirmModal';
import { createPortal } from 'react-dom';
import { Command, Calendar, BookOpen, Layers, Plus, Copy, Trash2, X, Download, Import, DatabaseBackup } from 'lucide-react';
import './index.css';

export default function App() {
  const [versions, setVersions] = useState(() => {
    const saved = localStorage.getItem('routine_versions');
    if (saved) return JSON.parse(saved);
    
    // Migration
    const oldPeriod = JSON.parse(localStorage.getItem('routine_period') || '{"start":"","end":""}');
    const oldSprintGoals = JSON.parse(localStorage.getItem('routine_sprintGoals') || '[]');
    let oldRoutineGoals = JSON.parse(localStorage.getItem('routine_routineGoals') || '[]');
    if (oldRoutineGoals.daily || oldRoutineGoals.weekly) {
      oldRoutineGoals = [...(oldRoutineGoals.daily || []), ...(oldRoutineGoals.weekly || [])];
    }
    const oldTemplates = JSON.parse(localStorage.getItem('routine_templates') || '[{"id":"t1","name":"Vanilla Routine","blocks":[]}]');
    const oldActiveTemplateId = localStorage.getItem('routine_activeTemplateId') || 't1';
    const oldDayMapping = JSON.parse(localStorage.getItem('routine_dayMapping') || '{"Monday":"","Tuesday":"","Wednesday":"","Thursday":"","Friday":"","Saturday":"","Sunday":""}');

    return [{
      id: 'v1',
      name: 'Version 1',
      desc: 'Migrated version',
      start: oldPeriod.start,
      end: oldPeriod.end,
      sprintGoals: oldSprintGoals,
      routineGoals: oldRoutineGoals,
      templates: oldTemplates,
      activeTemplateId: oldActiveTemplateId,
      dayMapping: oldDayMapping
    }];
  });

  const [activeVersionId, setActiveVersionId] = useState(() => {
    return localStorage.getItem('routine_activeVersionId') || 'v1';
  });

  const [activeCenterTab, setActiveCenterTab] = useState('calendar');
  const [routineFilterSprintId, setRoutineFilterSprintId] = useState(null);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('routine_versions', JSON.stringify(versions));
  }, [versions]);

  useEffect(() => {
    localStorage.setItem('routine_activeVersionId', activeVersionId);
  }, [activeVersionId]);

  const activeVersion = versions.find(v => v.id === activeVersionId) || versions[0];

  const updateActiveVersion = (updates) => {
    setVersions(prev => prev.map(v => {
      if (v.id === activeVersionId) {
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
  };

  const setSprintGoals = (goals) => updateActiveVersion({ sprintGoals: goals });
  const setRoutineGoals = (goals) => updateActiveVersion({ routineGoals: goals });
  const setTemplates = (templates) => updateActiveVersion({ templates: templates });
  const setActiveTemplateId = (id) => updateActiveVersion({ activeTemplateId: id });
  const setDayMapping = (mapping) => updateActiveVersion({ dayMapping: mapping });

  const addVersion = () => {
    const newId = Date.now().toString();
    setVersions([...versions, {
      id: newId,
      name: `Version ${versions.length + 1}`,
      desc: '',
      start: '',
      end: '',
      sprintGoals: [],
      routineGoals: [],
      templates: [{ id: 't1', name: 'Vanilla Routine', blocks: [] }],
      activeTemplateId: 't1',
      dayMapping: { Monday: '', Tuesday: '', Wednesday: '', Thursday: '', Friday: '', Saturday: '', Sunday: '' }
    }]);
    setActiveVersionId(newId);
  };

  const duplicateVersion = () => {
    const newId = Date.now().toString();
    setVersions([...versions, {
      ...activeVersion,
      id: newId,
      name: `${activeVersion.name} (Copy)`
    }]);
    setActiveVersionId(newId);
  };

  const deleteVersion = () => {
    setConfirmConfig({
      title: 'Delete Version',
      message: 'Are you sure you want to delete this version? All its goals, plans, and calendar blocks will be lost.',
      isDanger: true,
      onConfirm: () => {
        const newVersions = versions.filter(v => v.id !== activeVersion.id);
        
        if (newVersions.length === 0) {
          const vanillaId = Date.now().toString();
          const vanillaVersion = {
            id: vanillaId,
            name: 'Vanilla',
            desc: 'Base minimum version',
            start: '',
            end: '',
            sprintGoals: [],
            routineGoals: [],
            templates: [{ id: 't1', name: 'Vanilla Routine', blocks: [] }],
            activeTemplateId: 't1',
            dayMapping: { Monday: '', Tuesday: '', Wednesday: '', Thursday: '', Friday: '', Saturday: '', Sunday: '' }
          };
          setVersions([vanillaVersion]);
          setActiveVersionId(vanillaId);
        } else {
          setVersions(newVersions);
          setActiveVersionId(newVersions[0].id);
        }
        setConfirmConfig(null);
      },
      onCancel: () => setConfirmConfig(null)
    });
  };

  const exportVersion = () => {
    const plans = JSON.parse(localStorage.getItem(`routine_plans_${activeVersion.id}`) || '[]');
    const plansFolders = JSON.parse(localStorage.getItem(`routine_plans_folders_${activeVersion.id}`) || '[]');
    const backupData = {
      version: activeVersion,
      plans: plans,
      plansFolders: plansFolders
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    const safeName = activeVersion.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    downloadAnchorNode.setAttribute("download", `routine_os_backup_${safeName}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const exportAllData = () => {
    const allPlans = {};
    const allFolders = {};
    versions.forEach(v => {
      allPlans[v.id] = JSON.parse(localStorage.getItem(`routine_plans_${v.id}`) || '[]');
      allFolders[v.id] = JSON.parse(localStorage.getItem(`routine_plans_folders_${v.id}`) || '[]');
    });
    
    const backupData = {
      isFullBackup: true,
      versions: versions,
      activeVersionId: activeVersionId,
      allPlans,
      allFolders
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `routine_os_full_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const importVersion = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        
        if (data.isFullBackup) {
          setConfirmConfig({
            title: 'Import Full Backup',
            message: 'This will REPLACE all your existing versions and plans with the imported data. Are you absolutely sure?',
            isDanger: true,
            onConfirm: () => {
              data.versions.forEach(v => {
                if (data.allPlans && data.allPlans[v.id]) {
                  localStorage.setItem(`routine_plans_${v.id}`, JSON.stringify(data.allPlans[v.id]));
                }
                if (data.allFolders && data.allFolders[v.id]) {
                  localStorage.setItem(`routine_plans_folders_${v.id}`, JSON.stringify(data.allFolders[v.id]));
                }
              });
              setVersions(data.versions);
              setActiveVersionId(data.activeVersionId || data.versions[0].id);
              setShowVersionModal(false);
              setConfirmConfig(null);
            },
            onCancel: () => setConfirmConfig(null)
          });
        } else if (data && data.version && data.version.id) {
          const newId = Date.now().toString();
          const newVersion = {
            ...data.version,
            id: newId,
            name: `${data.version.name} (Imported)`
          };
          setVersions(prev => [...prev, newVersion]);
          if (data.plans) {
            localStorage.setItem(`routine_plans_${newId}`, JSON.stringify(data.plans));
          }
          if (data.plansFolders) {
            localStorage.setItem(`routine_plans_folders_${newId}`, JSON.stringify(data.plansFolders));
          }
          setActiveVersionId(newId);
          setShowVersionModal(false);
        } else {
          throw new Error('Invalid backup file');
        }
      } catch (err) {
        setConfirmConfig({
          title: 'Import Failed',
          message: 'The selected file is not a valid Routine OS backup.',
          isDanger: true,
          onConfirm: () => setConfirmConfig(null),
          onCancel: null
        });
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const sprintGoals = activeVersion.sprintGoals || [];
  let routineGoals = activeVersion.routineGoals || [];
  if (!Array.isArray(routineGoals)) {
    routineGoals = [...(routineGoals.daily || []), ...(routineGoals.weekly || [])];
  }
  const templates = activeVersion.templates || [];
  const activeTemplateId = activeVersion.activeTemplateId || '';
  const dayMapping = activeVersion.dayMapping || {};

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
    <div className="layout">
      <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', background: 'var(--panel-bg)', borderBottom: '1px solid var(--panel-border)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
          <div style={{ background: 'var(--accent)', padding: '6px', borderRadius: '8px', display: 'flex' }}>
            <Command size={20} color="#000" />
          </div>
          <span style={{ fontSize: '20px', fontWeight: 'bold' }}>Routine OS</span>
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Active Period</span>
            <span style={{ fontSize: '12px', color: '#fff', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>
              {activeVersion.start && activeVersion.end ? `${activeVersion.start} to ${activeVersion.end}` : 'No Dates Set'}
            </span>
          </div>
          
          <div style={{ width: '1px', height: '32px', background: 'var(--panel-border)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '220px' }}>
              <Dropdown 
                value={activeVersionId}
                onChange={(val) => setActiveVersionId(val)}
                options={versions.map(v => ({ value: v.id, label: v.name }))}
                placeholder="Switch Version..."
              />
            </div>
            
            <button onClick={() => setShowVersionModal(true)} className="icon-btn" style={{ padding: '8px', background: 'var(--bg)', border: '1px solid var(--panel-border)', borderRadius: '8px', marginLeft: '8px' }} title="Manage Versions">
              <Layers size={18} color="var(--text-secondary)" />
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <SprintPane 
          sprintGoals={sprintGoals} setSprintGoals={setSprintGoals}
          routineGoals={routineGoals} setRoutineGoals={setRoutineGoals} 
          templates={templates} setTemplates={setTemplates}
          activeTemplateId={activeTemplateId} dayMapping={dayMapping}
          onSprintBadgeClick={(id) => setRoutineFilterSprintId(id)}
        />
        
        <div className="timeline-area" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, padding: 0 }}>
          <div className="tabs" style={{ marginBottom: '0', borderBottom: '1px solid var(--panel-border)', background: 'var(--panel-bg)' }}>
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
          </div>
          
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {activeCenterTab === 'calendar' ? (
              <Timeline 
                templates={templates} 
                setTemplates={setTemplates}
                activeTemplateId={activeTemplateId}
                setActiveTemplateId={setActiveTemplateId}
                dayMapping={dayMapping}
                setDayMapping={setDayMapping}
              />
            ) : (
              <PlansPane 
                sprintGoals={sprintGoals}
                routineGoals={routineGoals}
                activeVersionId={activeVersionId}
              />
            )}
          </div>
        </div>

        <RoutinePane 
          routineGoals={routineGoals} setRoutineGoals={setRoutineGoals}
          templates={templates} setTemplates={setTemplates}
          sprintGoals={sprintGoals} setSprintGoals={setSprintGoals}
          activeTemplateId={activeTemplateId}
          routineFilterSprintId={routineFilterSprintId}
          setRoutineFilterSprintId={setRoutineFilterSprintId}
        />
      </main>

      {/* Version Modal */}
      {showVersionModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowVersionModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#fff', margin: 0 }}><Layers size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: 'var(--accent)' }} /> Version Manager</h3>
              <button onClick={() => setShowVersionModal(false)} className="icon-btn" style={{ padding: '4px' }}><X size={18} /></button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Select Version</label>
              <Dropdown 
                value={activeVersion.id} 
                onChange={(val) => setActiveVersionId(val)}
                options={versions.map(v => ({ value: v.id, label: v.name }))}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
              <button onClick={addVersion} className="secondary" title="New Version" style={{ flex: 1, padding: '8px', display: 'flex', justifyContent: 'center' }}><Plus size={16} /></button>
              <button onClick={duplicateVersion} className="secondary" title="Duplicate Version" style={{ flex: 1, padding: '8px', display: 'flex', justifyContent: 'center' }}><Copy size={16} /></button>
              
              <button onClick={() => fileInputRef.current?.click()} className="secondary" title="Import Backup (Single or Full)" style={{ flex: 1, padding: '8px', display: 'flex', justifyContent: 'center' }}>
                <Import size={16} />
              </button>
              <input type="file" ref={fileInputRef} accept=".json" style={{ display: 'none' }} onChange={importVersion} />

              <button onClick={deleteVersion} className="secondary" style={{ color: 'var(--danger)', flex: 1, padding: '8px', display: 'flex', justifyContent: 'center' }} title="Delete Version"><Trash2 size={16} /></button>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              <button onClick={exportVersion} className="secondary" style={{ flex: 1, padding: '12px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                <Download size={16} /> Export Version
              </button>
              <button onClick={exportAllData} className="secondary" style={{ flex: 1, padding: '12px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                <DatabaseBackup size={16} color="var(--accent)" /> Export All Data
              </button>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Version Name</label>
                <input type="text" value={activeVersion.name} onChange={(e) => updateActiveVersion({ name: e.target.value })} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Description (optional)</label>
                <input type="text" value={activeVersion.desc || ''} onChange={(e) => updateActiveVersion({ desc: e.target.value })} style={{ width: '100%' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Start Date</label>
                  <input 
                    type="date" 
                    value={activeVersion.start || ''} 
                    onChange={(e) => updateActiveVersion({ start: e.target.value })} 
                    onKeyDown={(e) => e.preventDefault()}
                    onClick={(e) => { if (e.target.showPicker) e.target.showPicker(); }}
                    style={{ width: '100%', cursor: 'pointer' }} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>End Date</label>
                  <input 
                    type="date" 
                    value={activeVersion.end || ''} 
                    onChange={(e) => updateActiveVersion({ end: e.target.value })} 
                    onKeyDown={(e) => e.preventDefault()}
                    onClick={(e) => { if (e.target.showPicker) e.target.showPicker(); }}
                    style={{ width: '100%', cursor: 'pointer' }} 
                  />
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowVersionModal(false)} style={{ padding: '8px 24px', color: '#000' }}>Done</button>
            </div>
          </div>
        </div>,
        document.body
      )}

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
    </div>
  );
}
