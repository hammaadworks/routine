import React from 'react';
import { Layers, Plus, Settings, Copy, Download, Trash2 } from 'lucide-react';
import BaseModal from './BaseModal';

export interface Routine {
  id: string;
  name: string;
  desc: string;
  start: string;
  end: string;
  routineGoals: any[];
  habits: any[];
  templates: any[];
  activeTemplateId: string;
  dayMapping: Record<string, string>;
}

export interface ConfirmConfig {
  title: string;
  message: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface RoutineModalProps {
  showRoutineModal: boolean;
  setShowRoutineModal: (show: boolean) => void;
  routineModalView: 'list' | 'edit';
  setRoutineModalView: (view: 'list' | 'edit') => void;
  routines: Routine[];
  setRoutines: (routines: Routine[]) => void;
  activeRoutineId: string;
  setActiveRoutineId: (id: string) => void;
  editingRoutineId: string | null;
  setEditingRoutineId: (id: string | null) => void;
  activeRoutine: Routine;
  lifeGoals: any[];
  setConfirmConfig: (config: ConfirmConfig | null) => void;
}

export default function RoutineModal({
  showRoutineModal,
  setShowRoutineModal,
  routineModalView,
  setRoutineModalView,
  routines,
  setRoutines,
  activeRoutineId,
  setActiveRoutineId,
  editingRoutineId,
  setEditingRoutineId,
  activeRoutine,
  lifeGoals,
  setConfirmConfig
}: RoutineModalProps) {
  const editRoutine = routines.find((r: Routine) => r.id === (editingRoutineId || activeRoutineId)) || activeRoutine;
  
  const handleUpdate = (updates: Partial<Routine>) => {
    setRoutines(routines.map((r: Routine) => r.id === editRoutine.id ? { ...r, ...updates } : r));
  };

  return (
    <BaseModal
      isOpen={showRoutineModal}
      onClose={() => setShowRoutineModal(false)}
      maxWidth="480px"
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Layers size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: 'var(--accent)' }} /> 
          {routineModalView === 'edit' ? 'Edit Routine' : 'Your Routines'}
        </div>
      }
    >
      {routineModalView === 'list' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {routines.map((r: Routine) => (
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
                onClick={(e: React.MouseEvent) => {
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Routine Name</label>
            <input type="text" value={editRoutine.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdate({ name: e.target.value })} onBlur={(e: React.FocusEvent<HTMLInputElement>) => handleUpdate({ name: e.target.value.trim() })} style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', borderRadius: '8px', color: '#fff', fontSize: '14px' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Description (optional)</label>
            <input type="text" value={editRoutine.desc || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdate({ desc: e.target.value })} onBlur={(e: React.FocusEvent<HTMLInputElement>) => handleUpdate({ desc: e.target.value.trim() })} style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', borderRadius: '8px', color: '#fff', fontSize: '14px' }} />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Start Date</label>
              <input 
                type="date" 
                value={editRoutine.start || ''} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const newStart = e.target.value;
                  const updates: Partial<Routine> = { start: newStart };
                  if (!newStart) {
                    updates.end = '';
                  } else if (editRoutine.end && newStart > editRoutine.end) {
                    updates.end = newStart;
                  }
                  handleUpdate(updates);
                }} 
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.preventDefault()}
                onClick={(e: React.MouseEvent<HTMLInputElement>) => { if ('showPicker' in e.currentTarget) { (e.currentTarget as any).showPicker(); } }}
                style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', borderRadius: '8px', color: '#fff', cursor: 'pointer' }} 
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>End Date</label>
              <input 
                type="date" 
                min={editRoutine.start || ''}
                value={editRoutine.end || ''} 
                disabled={!editRoutine.start}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const newEnd = e.target.value;
                  if (editRoutine.start && newEnd && newEnd < editRoutine.start) {
                    handleUpdate({ end: editRoutine.start });
                  } else {
                    handleUpdate({ end: newEnd });
                  }
                }}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.preventDefault()}
                onClick={(e: React.MouseEvent<HTMLInputElement>) => { if ('showPicker' in e.currentTarget && editRoutine.start) { (e.currentTarget as any).showPicker(); } }}
                style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', borderRadius: '8px', color: '#fff', cursor: editRoutine.start ? 'pointer' : 'not-allowed', opacity: editRoutine.start ? 1 : 0.5 }} 
              />
            </div>
          </div>

          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => {
                setRoutineModalView('list');
              }} 
              className="primary" 
              style={{ flex: '1 1 100%', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}
            >
              Save Routine
            </button>

            <button 
              onClick={() => {
                const newId = Date.now().toString();
                const plans = localStorage.getItem(`whatchadoin_plans_${editRoutine.id}`);
                if (plans) localStorage.setItem(`whatchadoin_plans_${newId}`, plans);
                const folders = localStorage.getItem(`whatchadoin_plans_folders_${editRoutine.id}`);
                if (folders) localStorage.setItem(`whatchadoin_plans_folders_${newId}`, folders);
                setRoutines([...routines, { ...editRoutine, id: newId, name: `${editRoutine?.name} (Copy)` }]);
                setActiveRoutineId(newId);
                setRoutineModalView('list');
              }} 
              className="secondary" 
              style={{ flex: '1 1 calc(50% - 4px)', padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', borderRadius: '8px', fontSize: '13px', border: '1px solid var(--panel-border)' }}
            >
              <Copy size={14} /> Duplicate
            </button>
            
            <button 
              onClick={() => {
                const plans = JSON.parse(localStorage.getItem(`whatchadoin_plans_${editRoutine.id}`) || '[]');
                const plansFolders = JSON.parse(localStorage.getItem(`whatchadoin_plans_folders_${editRoutine.id}`) || '[]');
                const backupData = { routine: editRoutine, plans, plansFolders, lifeGoals };
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
                const a = document.createElement('a');
                a.href = dataStr;
                a.download = `whatchadoin_routine_${editRoutine?.name?.replace(/[^a-z0-9]/gi, '_')?.toLowerCase() || 'unnamed'}.json`;
                a.click();
              }} 
              className="secondary" 
              style={{ flex: '1 1 calc(50% - 4px)', padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', borderRadius: '8px', fontSize: '13px', border: '1px solid var(--panel-border)' }}
            >
              <Download size={14} /> Export
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
                    const newRoutines = routines.filter((v: Routine) => v.id !== editRoutine.id);
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
              style={{ flex: '1 1 100%', padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', borderRadius: '8px', color: 'var(--danger)', fontSize: '13px', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)' }}
            >
              <Trash2 size={14} /> Delete Routine
            </button>
          </div>
        </div>
      )}
    </BaseModal>
  );
}
