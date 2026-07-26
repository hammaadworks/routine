import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Target, CheckCircle2, Plus, Trash2, Edit2, Activity, Clock, Layers, Copy, Settings, X } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

const COLORS = ['#FF595E', '#FF9F1C', '#FFCA3A', '#8AC926', '#00F5D4', '#1982C4', '#4361EE', '#6A4C93', '#F15BB5', '#E07A5F'];

export default function SprintPane({ 
  sprintGoals, setSprintGoals, 
  routineGoals, templates, setTemplates, 
  activeTemplateId, dayMapping,
  onSprintBadgeClick
}) {
  const [showSprintGoalModal, setShowSprintGoalModal] = useState(false);
  const [editingSprintGoalId, setEditingSprintGoalId] = useState(null);
  const [sprintGoalForm, setSprintGoalForm] = useState({ text: '', color: '' });
  const [confirmConfig, setConfirmConfig] = useState(null);

  const openAddSprintGoal = () => {
    setEditingSprintGoalId(null);
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    setSprintGoalForm({ text: '', color: randomColor });
    setShowSprintGoalModal(true);
  };

  const openEditSprintGoal = (goal) => {
    setEditingSprintGoalId(goal.id);
    const goalColor = goal.color || COLORS[Math.floor(Math.random() * COLORS.length)];
    setSprintGoalForm({ text: goal.text, color: goalColor });
    setShowSprintGoalModal(true);
  };

  const saveSprintGoal = (e) => {
    e.preventDefault();
    if (!sprintGoalForm.text.trim()) return;
    if (editingSprintGoalId) {
      setSprintGoals(prev => prev.map(g => g.id === editingSprintGoalId ? { ...g, text: sprintGoalForm.text, color: sprintGoalForm.color } : g));
    } else {
      setSprintGoals([...sprintGoals, { id: 'sg-' + Date.now(), text: sprintGoalForm.text, color: sprintGoalForm.color, completed: false }]);
    }
    setShowSprintGoalModal(false);
  };

  const toggleSprint = (id) => {
    setSprintGoals(sprintGoals.map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  };

  const deleteSprint = (id, text) => {
    setConfirmConfig({
      title: 'Delete Sprint Goal',
      message: `Are you sure you want to delete the sprint goal: "${text}"?`,
      isDanger: true,
      onConfirm: () => {
        setSprintGoals(sprintGoals.filter(g => g.id !== id));
        if (templates && setTemplates) {
          const lowerText = text.toLowerCase();
          const updatedTemplates = templates.map(t => ({
            ...t,
            blocks: t.blocks.filter(b => b.sprintGoalId !== id && !b.name.toLowerCase().includes(lowerText))
          }));
          setTemplates(updatedTemplates);
        }
        setConfirmConfig(null);
      },
      onCancel: () => setConfirmConfig(null)
    });
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [sortByName, setSortByName] = useState(false);

  const getLinkedCount = (goal) => {
    const txt = goal.text.toLowerCase().trim();
    if (!txt) return 0;
    const linkedGoals = (routineGoals || []).filter(g => 
      g.sprintGoalId === goal.id || 
      g.task.toLowerCase().trim() === txt || 
      (g.desc && g.desc.toLowerCase().trim() === txt)
    );
    return linkedGoals.length;
  };

  // Metrics Calculations
  let unallocatedMins = 24 * 60;
  if (activeTemplateId) {
    const t = templates.find(temp => temp.id === activeTemplateId);
    if (t && t.blocks) {
      const intervals = t.blocks.map(b => [b.startTime, b.startTime + (b.duration || 0)]);
      intervals.sort((a, b) => a[0] - b[0]);
      
      let allocated = 0;
      let currentStart = -1;
      let currentEnd = -1;
      
      for (const [start, end] of intervals) {
        if (currentEnd < start) {
          if (currentStart !== -1) {
            allocated += currentEnd - currentStart;
          }
          currentStart = start;
          currentEnd = end;
        } else {
          currentEnd = Math.max(currentEnd, end);
        }
      }
      
      if (currentStart !== -1) {
        allocated += currentEnd - currentStart;
      }
      
      unallocatedMins -= allocated;
    }
  }
  
  const formatDuration = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  let displayedGoals = sprintGoals.filter(g => g.text.toLowerCase().includes(searchQuery.toLowerCase()));
  if (sortByName) {
    displayedGoals.sort((a, b) => a.text.localeCompare(b.text));
  }

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
      
      {/* Top Section: Sprint Goals (Flex grows to take available space) */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '24px', overflow: 'hidden', minHeight: 0 }}>
        
        {/* Sprint Goals */}
        <h2 style={{ marginBottom: '16px' }}><Target size={18} color="var(--accent)" /> Sprint Goals</h2>
        
        <button 
          onClick={openAddSprintGoal} className="secondary" 
          style={{ width: '100%', marginBottom: '16px', display: 'flex', justifyContent: 'center', gap: '8px', padding: '12px', borderStyle: 'dashed' }}
        >
          <Plus size={16} /> Add Sprint Goal
        </button>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', display: 'flex', color: 'var(--text-secondary)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
            <input 
              type="text" 
              placeholder="Find by name..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '32px', fontSize: '13px' }}
            />
          </div>
          <button 
            className={`secondary ${sortByName ? 'sort-active-glow' : ''}`}
            onClick={() => setSortByName(!sortByName)}
            style={{ 
              padding: '8px 12px', 
              background: sortByName ? 'var(--accent)' : '',
              boxShadow: sortByName ? '0 0 12px var(--accent)' : 'none',
              color: sortByName ? '#000' : 'currentColor',
              borderColor: sortByName ? 'var(--accent)' : ''
            }}
            title="Sort by Name"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M7 12h10"></path><path d="M10 18h4"></path></svg>
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, padding: '8px 12px 8px 4px', marginTop: '-8px' }}>
          {displayedGoals.map(goal => {
            const linkedCount = getLinkedCount(goal);
            const hex = goal.color || '#eab308';
            const r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
            const bgStyle = {
              borderLeft: `4px solid ${hex}`,
              background: `rgba(${r},${g},${b},0.1)`,
            };

            return (
              <div key={goal.id} className={`item-card ${goal.completed ? 'scratched' : ''}`} style={{ cursor: 'default', position: 'relative', height: '48px', padding: '0 12px', display: 'flex', alignItems: 'center', ...bgStyle }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <input 
                      type="checkbox" 
                      className="checkbox-square" 
                      checked={goal.completed || false} 
                      onChange={() => toggleSprint(goal.id)} 
                      style={{ '--accent': hex, flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
                      <span className="item-title" style={{ color: hex, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '13px', fontWeight: '500' }} title={goal.text}>
                        {goal.text}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0, marginLeft: '4px' }}>
                    <button className="icon-btn" onClick={() => openEditSprintGoal(goal)} style={{ padding: '4px' }}>
                      <Edit2 size={14} />
                    </button>
                  </div>
                </div>
                
                  <div 
                  onClick={() => onSprintBadgeClick && onSprintBadgeClick(goal.id)}
                  title="Filter Routine Goals"
                  style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  cursor: 'pointer',
                  background: linkedCount > 0 ? hex : '#fff',
                  color: '#000',
                  fontSize: '11px',
                  fontWeight: '900',
                  minWidth: '22px',
                  height: '22px',
                  padding: '0 6px',
                  borderRadius: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: linkedCount > 0 ? `0 4px 8px rgba(${r},${g},${b},0.3)` : '0 2px 8px rgba(255,255,255,0.4)',
                  border: '2px solid var(--panel-bg)',
                  zIndex: 10
                }}>
                  {linkedCount}
                </div>
              </div>
            );
          })}
          {sprintGoals.length === 0 && (
            <div style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
              padding: '40px 20px', color: 'var(--text-secondary)', textAlign: 'center', 
              border: '1px dashed var(--panel-border)', borderRadius: '12px', marginTop: '8px'
            }}>
              <Target size={32} style={{ marginBottom: '12px', opacity: 0.5, color: 'var(--accent)' }} />
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#fff' }}>No sprint goals yet</div>
              <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>Add major goals you want to achieve during this period.</div>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM METRICS: Sprint Insights */}
      <div style={{ flex: 'none', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid var(--panel-border)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <Activity size={14} color="var(--accent)" />
          Sprint Insights: 
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '20px' }}>
          <Clock size={14} color="var(--text-secondary)" />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Time left:</span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>{formatDuration(unallocatedMins)}</span>
        </div>
      </div>

      {/* Sprint Goal Modal */}
      {showSprintGoalModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowSprintGoalModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={18} color="var(--accent)" /> 
                {editingSprintGoalId ? 'Edit Sprint Goal' : 'New Sprint Goal'}
              </h3>
              <button onClick={() => setShowSprintGoalModal(false)} className="icon-btn" style={{ padding: '4px' }}><X size={18} /></button>
            </div>
            
            <form onSubmit={saveSprintGoal} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Goal Description</label>
                <input 
                  type="text" placeholder="e.g. Launch v2.0" value={sprintGoalForm.text}
                  onChange={(e) => setSprintGoalForm({ ...sprintGoalForm, text: e.target.value })} 
                  style={{ width: '100%' }} autoFocus
                />
              </div>
              
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Theme Color</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSprintGoalForm({...sprintGoalForm, color: c})}
                      style={{
                        width: '24px', height: '24px', borderRadius: '50%', padding: 0,
                        background: c, border: `2px solid ${sprintGoalForm.color === c ? '#fff' : 'transparent'}`,
                        cursor: 'pointer', transition: 'transform 0.1s',
                        transform: sprintGoalForm.color === c ? 'scale(1.1)' : 'scale(1)'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', marginTop: '16px', width: '100%', padding: '8px 0' }}>
                <div style={{ width: '5%' }} />
                {editingSprintGoalId ? (
                  <button type="button" onClick={() => { deleteSprint(editingSprintGoalId, sprintGoalForm.text); setShowSprintGoalModal(false); }} style={{ width: '20%', background: '#ef4444', color: 'white', border: 'none', padding: '10px 0' }}>Delete</button>
                ) : (
                  <div style={{ width: '20%' }} />
                )}
                <div style={{ width: '5%' }} />
                <button type="button" onClick={() => setShowSprintGoalModal(false)} className="secondary" style={{ width: '20%', padding: '10px 0' }}>Cancel</button>
                <div style={{ width: '5%' }} />
                <button type="submit" className="primary" style={{ width: '40%', padding: '10px 0' }}>{editingSprintGoalId ? 'Update' : 'Save'}</button>
                <div style={{ width: '5%' }} />
              </div>
            </form>
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
        />
      )}

    </div>
  );
}
