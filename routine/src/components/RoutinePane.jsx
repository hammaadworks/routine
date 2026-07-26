import { useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckSquare, Plus, Trash2, Clock, AlignLeft, GripVertical, CheckCircle2, Target, Edit2, X, Activity } from 'lucide-react';
import Dropdown from './Dropdown';

const COLORS = ['#FF595E', '#FF9F1C', '#FFCA3A', '#8AC926', '#00F5D4', '#1982C4', '#4361EE', '#6A4C93', '#F15BB5', '#E07A5F'];

export default function RoutinePane({ 
  routineGoals, setRoutineGoals, 
  templates, setTemplates, 
  sprintGoals, setSprintGoals, 
  activeTemplateId,
  routineFilterSprintId, setRoutineFilterSprintId
}) {
  const [showRoutineGoalModal, setShowRoutineGoalModal] = useState(false);
  const [editingRoutineGoalId, setEditingRoutineGoalId] = useState(null);
  const [routineGoalForm, setRoutineGoalForm] = useState({ task: '', desc: '', timeValue: '', sprintGoalId: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortByName, setSortByName] = useState(false);

  const checkSprintAddressed = (goal) => {
    const explicitlyReferenced = (routineGoals || []).some(g => g.sprintGoalId === goal.id);
    if (explicitlyReferenced) return true;
    const txt = goal.text.toLowerCase();
    const inGoals = (routineGoals || []).some(g => g.task.toLowerCase().includes(txt) || (g.desc && g.desc.toLowerCase().includes(txt)));
    const inTimeline = templates?.some(t => t.blocks.some(b => b.name.toLowerCase().includes(txt)));
    return inGoals || inTimeline;
  };

  const openAddRoutineGoal = () => {
    setEditingRoutineGoalId(null);
    setRoutineGoalForm({ task: '', desc: '', timeValue: '', sprintGoalId: '' });
    setShowRoutineGoalModal(true);
  };

  const openEditRoutineGoal = (goal) => {
    setEditingRoutineGoalId(goal.id);
    setRoutineGoalForm({ 
      task: goal.task || '', 
      desc: goal.desc || '', 
      timeValue: goal.time || '', 
      sprintGoalId: goal.sprintGoalId || '' 
    });
    setShowRoutineGoalModal(true);
  };

  const saveRoutineGoal = (e) => {
    e.preventDefault();
    if (!routineGoalForm.task.trim()) return;
    
    let timeString = '';
    if (routineGoalForm.timeValue) {
      timeString = routineGoalForm.timeValue.toString();
    }

    const goalData = {
      task: routineGoalForm.task,
      desc: routineGoalForm.desc,
      time: timeString,
      sprintGoalId: routineGoalForm.sprintGoalId
    };

    if (editingRoutineGoalId) {
      setRoutineGoals((routineGoals || []).map(g => g.id === editingRoutineGoalId ? { ...g, ...goalData } : g));
    } else {
      const newGoal = {
        ...goalData,
        id: 'rg-' + Date.now(),
        completed: false,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
      };
      setRoutineGoals([...(routineGoals || []), newGoal]);
    }
    setShowRoutineGoalModal(false);
  };

  const toggleGoal = (id) => {
    setRoutineGoals((routineGoals || []).map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  };

  const handleDragStart = (e, goal) => {
    const linkedSprintGoal = sprintGoals?.find(sg => sg.id === goal.sprintGoalId);
    const hex = linkedSprintGoal?.color || goal.color || '#eab308';
    
    e.dataTransfer.setData('source', 'sidebar');
    e.dataTransfer.setData('task', goal.task);
    e.dataTransfer.setData('desc', goal.desc);
    e.dataTransfer.setData('time', goal.time);
    e.dataTransfer.setData('color', hex);
    e.dataTransfer.setData('routineGoalId', goal.id);
  };

  const checkRoutineAddressed = (goal) => {
    if (!templates) return false;
    
    // 1. Check explicit linking
    const explicitlyReferenced = templates.some(t => t.blocks.some(b => b.routineGoalId === goal.id));
    if (explicitlyReferenced) return true;

    // 2. Fallback to text matching
    const txt = goal.task.toLowerCase();
    return templates.some(t => t.blocks.some(b => b.name.toLowerCase().includes(txt)));
  };

  const openGoalCount = (routineGoals || []).filter(g => !g.completed && !checkRoutineAddressed(g)).length;

  const deleteGoal = (id, taskName) => {
    // 1. Delete the goal from the pane
    setRoutineGoals((routineGoals || []).filter(g => g.id !== id));

    // 2. Cascade delete blocks with matching names from the timeline
    if (templates && setTemplates) {
      const lowerTask = taskName.toLowerCase();
      const updatedTemplates = templates.map(t => ({
        ...t,
        blocks: t.blocks.filter(b => b.name.toLowerCase() !== lowerTask)
      }));
      setTemplates(updatedTemplates);
    }
  };

  let displayedRoutineGoals = (routineGoals || []).filter(g => g.task.toLowerCase().includes(searchQuery.toLowerCase()));
  if (routineFilterSprintId) {
    const sprintGoal = sprintGoals?.find(sg => sg.id === routineFilterSprintId);
    if (sprintGoal) {
      const txt = sprintGoal.text.toLowerCase();
      displayedRoutineGoals = displayedRoutineGoals.filter(g => 
        g.sprintGoalId === routineFilterSprintId || 
        g.task.toLowerCase().includes(txt) || 
        (g.desc && g.desc.toLowerCase().includes(txt))
      );
    }
  }
  if (sortByName) {
    displayedRoutineGoals.sort((a, b) => a.task.localeCompare(b.task));
  }

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '24px', overflow: 'hidden', minHeight: 0 }}>
        <h2 style={{ marginBottom: '16px' }}><CheckSquare size={18} color="var(--accent)" /> Routine Goals</h2>
        
        <button 
          onClick={openAddRoutineGoal} className="secondary" 
          style={{ width: '100%', marginBottom: '16px', display: 'flex', justifyContent: 'center', gap: '8px', padding: '12px', borderStyle: 'dashed' }}
        >
          <Plus size={16} /> Add Goal
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
            className="secondary" 
            onClick={() => {
              if (routineFilterSprintId && setRoutineFilterSprintId) {
                setRoutineFilterSprintId(null);
              } else {
                setSortByName(!sortByName);
              }
            }}
            style={{ padding: '8px 12px', background: (routineFilterSprintId || sortByName) ? 'rgba(255,255,255,0.1)' : '' }}
            title={routineFilterSprintId ? "Clear Filter" : "Sort by Name"}
          >
            {routineFilterSprintId ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon><line x1="23" y1="13" x2="17" y2="19"></line><line x1="17" y1="13" x2="23" y2="19"></line></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={sortByName ? 'var(--accent)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M7 12h10"></path><path d="M10 18h4"></path></svg>
            )}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>

        {displayedRoutineGoals.map((goal) => {
          const isAddressed = checkRoutineAddressed(goal);
          const linkedSprintGoal = sprintGoals?.find(sg => sg.id === goal.sprintGoalId);
          const hex = linkedSprintGoal ? (linkedSprintGoal.color || '#eab308') : '#94a3b8';
          const r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
          
          const bgStyle = {
            background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
            border: `1px solid rgba(${r},${g},${b}, ${linkedSprintGoal ? '0.3' : '0.1'})`,
            borderLeft: `3px solid ${hex}`,
            boxShadow: `0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)`,
            borderRadius: '12px',
          };

          return (
            <div 
              key={goal.id} 
              className={`item-card ${goal.completed ? 'scratched' : ''}`}
              draggable={true}
              onDragStart={(e) => handleDragStart(e, goal)}
              style={{ display: 'flex', alignItems: 'center', height: '52px', padding: '0 12px', ...bgStyle }}
              title={goal.desc ? `${goal.task}\n\n${goal.desc}` : goal.task}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <GripVertical size={16} color="var(--text-secondary)" style={{ cursor: 'grab', flexShrink: 0, opacity: 0.5 }} />
                  <input 
                    type="checkbox" 
                    className="checkbox-square" 
                    style={{ flexShrink: 0, borderColor: hex, '--accent': hex }}
                    checked={goal.completed || false} 
                    onChange={() => toggleGoal(goal.id)} 
                  />
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="item-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff', fontSize: '13px', fontWeight: '600' }}>
                        {goal.task}
                      </span>
                      {isAddressed && (
                        <CheckCircle2 size={12} color={hex} style={{ flexShrink: 0 }} />
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '6px', alignItems: 'center', overflow: 'hidden' }}>
                      {goal.time && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--text-secondary)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                          <Clock size={10} /> {goal.time}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0, marginLeft: '4px' }}>
                  <button className="icon-btn" onClick={() => openEditRoutineGoal(goal)} style={{ padding: '4px' }}>
                    <Edit2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {(routineGoals || []).length === 0 && (
          <div style={{ 
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
            padding: '40px 20px', color: 'var(--text-secondary)', textAlign: 'center', 
            border: '1px dashed var(--panel-border)', borderRadius: '12px', marginTop: '8px'
          }}>
            <CheckSquare size={32} style={{ marginBottom: '12px', opacity: 0.5, color: 'var(--accent)' }} />
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#fff' }}>No goals yet</div>
            <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>Start adding goals and drag them to schedule.</div>
          </div>
        )}
        </div>
      </div>

      {/* BOTTOM METRICS: Routine Insights */}
      <div style={{ flex: 'none', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid var(--panel-border)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <Activity size={14} color="var(--accent)" />
          Routine Insights:
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '20px' }}>
          <CheckSquare size={14} color="var(--text-secondary)" />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Pending:</span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff', whiteSpace: 'nowrap' }}>
            {sprintGoals.filter(g => !g.completed && !checkSprintAddressed(g)).length} Sprint, {openGoalCount} Routine
          </span>
        </div>
      </div>

      {/* Routine Goal Modal */}
      {showRoutineGoalModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowRoutineGoalModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '460px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h3 style={{ color: '#fff', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px' }}>
                  <div style={{ background: 'rgba(234, 179, 8, 0.15)', padding: '8px', borderRadius: '8px' }}>
                    <CheckSquare size={20} color="var(--accent)" /> 
                  </div>
                  {editingRoutineGoalId ? `Edit Goal` : `New Goal`}
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Define your objective and connect it to the bigger picture.
                </p>
              </div>
              <button onClick={() => setShowRoutineGoalModal(false)} className="icon-btn" style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}><X size={16} /></button>
            </div>
            
            <form onSubmit={saveRoutineGoal} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Task Core Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Objective Name</label>
                  <input 
                    type="text" placeholder="e.g. Read 10 pages of Atomic Habits" value={routineGoalForm.task}
                    onChange={(e) => setRoutineGoalForm({ ...routineGoalForm, task: e.target.value })} required
                    style={{ width: '100%', fontSize: '14px', padding: '12px 14px' }} autoFocus
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Details / Notes <span style={{ opacity: 0.5, textTransform: 'none' }}>(optional)</span></label>
                  <input 
                    type="text" placeholder="Add any specific criteria for success..." value={routineGoalForm.desc}
                    onChange={(e) => setRoutineGoalForm({ ...routineGoalForm, desc: e.target.value })} 
                    style={{ width: '100%', fontSize: '14px', padding: '12px 14px' }}
                  />
                </div>
              </div>

              {/* Execution details */}
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: '0 0 100px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <Clock size={14} color="var(--accent)" /> Duration
                  </label>
                  <input 
                    type="text" placeholder="1:20" value={routineGoalForm.timeValue}
                    onChange={(e) => setRoutineGoalForm({ ...routineGoalForm, timeValue: e.target.value })} 
                    style={{ width: '100%', padding: '12px 14px', fontSize: '14px', textAlign: 'center' }}
                  />
                </div>
                
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <Target size={14} color="#3b82f6" /> Sprint Link
                  </label>
                  <Dropdown
                    value={routineGoalForm.sprintGoalId}
                    onChange={(val) => setRoutineGoalForm({ ...routineGoalForm, sprintGoalId: val })}
                    options={[
                      { value: '', label: 'No Sprint Goal Linked' },
                      ...(sprintGoals || []).map(sg => ({ value: sg.id, label: sg.text }))
                    ]}
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="secondary" style={{ flex: 1, padding: '12px', fontSize: '14px', fontWeight: '500' }} onClick={() => setShowRoutineGoalModal(false)}>Cancel</button>
                {editingRoutineGoalId && (
                  <button type="button" onClick={() => { deleteGoal(editingRoutineGoalId, routineGoalForm.task); setShowRoutineGoalModal(false); }} style={{ flex: 1, padding: '12px', fontSize: '14px', fontWeight: '500', background: '#ef4444', color: 'white', border: 'none' }}>Delete</button>
                )}
                <button type="submit" style={{ flex: 2, padding: '12px', fontSize: '14px', fontWeight: 'bold', color: '#000', boxShadow: '0 4px 12px rgba(234, 179, 8, 0.3)' }}>{editingRoutineGoalId ? 'Save Changes' : 'Create Goal'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
