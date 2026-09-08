import * as React from 'react';
import { useState, useEffect } from 'react';
import { Star, Plus, Pencil, Activity, Palette } from 'lucide-react';
import SearchSortBar from './SearchSortBar';
import ConfirmModal from './ConfirmModal';
import BaseModal from './BaseModal';
import { validateColor, getCardBgStyle } from '../utils';

const PRESET_COLORS = ['#FF595E', '#FF9F1C', '#FFCA3A', '#8AC926', '#00F5D4', '#1982C4', '#4361EE', '#6A4C93', '#F15BB5'];

interface Goal {
  id: string;
  text: string;
  color?: string;
  completed?: boolean;
  desc?: string;
  lifeGoalId?: string;
}

interface LifePaneProps {
  lifeGoals: Goal[];
  setLifeGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
  routineGoals?: Goal[];
  setRoutineGoals?: React.Dispatch<React.SetStateAction<Goal[]>>;
  habits?: Goal[];
  setHabits?: React.Dispatch<React.SetStateAction<Goal[]>>;
  headerTabs?: React.ReactNode;
}

interface ConfirmConfig {
  title: string;
  message: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function LifePane({ 
  lifeGoals, setLifeGoals,
  routineGoals, setRoutineGoals, 
  habits, setHabits, headerTabs
}: LifePaneProps) {
  const [showLifeGoalModal, setShowLifeGoalModal] = useState(false);
  const [editingLifeGoalId, setEditingLifeGoalId] = useState<string | null>(null);
  const [lifeGoalForm, setLifeGoalForm] = useState({ text: '', color: '', desc: '' });
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);
  const [colorError, setColorError] = useState('');

  useEffect(() => {
    const handleFab = () => openAddLifeGoal();
    window.addEventListener('fab:add-strategy', handleFab);
    return () => window.removeEventListener('fab:add-strategy', handleFab);
  }, []);

  const openAddLifeGoal = () => {
    setEditingLifeGoalId(null);
    const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)] || '#FF595E';
    setLifeGoalForm({ text: '', color: randomColor, desc: '' });
    setShowLifeGoalModal(true);
  };

  const openEditLifeGoal = (goal: Goal) => {
    setEditingLifeGoalId(goal.id);
    setColorError('');
    const goalColor = goal.color || PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)] || '#FF595E';
    setLifeGoalForm({ text: goal.text, color: goalColor, desc: goal.desc || '' });
    setShowLifeGoalModal(true);
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    const { isValid, error } = validateColor(hex);
    if (!isValid) {
      setColorError(error || 'Invalid color');
    } else {
      setColorError('');
      setLifeGoalForm({...lifeGoalForm, color: hex.toUpperCase()});
    }
  };

  const saveLifeGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lifeGoalForm.text.trim()) return;
    const cleanText = lifeGoalForm.text.trim();
    
    if (editingLifeGoalId) {
      setLifeGoals(prev => prev.map(g => g.id === editingLifeGoalId ? { ...g, text: cleanText, color: lifeGoalForm.color, desc: lifeGoalForm.desc } : g));
    } else {
      setLifeGoals([...lifeGoals, { id: 'lg-' + Date.now(), text: cleanText, color: lifeGoalForm.color, completed: false, desc: lifeGoalForm.desc }]);
    }
    setShowLifeGoalModal(false);
  };

  const toggleLife = (id: string) => {
    setLifeGoals(lifeGoals.map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  };

  const deleteLifeGoal = (id: string, text: string) => {
    setConfirmConfig({
      title: 'Delete Life Goal',
      message: `Are you sure you want to delete the life goal: "${text}"? Routine and habits linked to it will be unlinked.`,
      isDanger: true,
      onConfirm: () => {
        setLifeGoals(lifeGoals.filter(g => g.id !== id));
        
        if (routineGoals && setRoutineGoals) {
          setRoutineGoals(routineGoals.map(g => g.lifeGoalId === id ? { ...g, lifeGoalId: '' } : g));
        }

        if (habits && setHabits) {
          setHabits(habits.map(g => g.lifeGoalId === id ? { ...g, lifeGoalId: '' } : g));
        }
        
        setConfirmConfig(null);
      },
      onCancel: () => setConfirmConfig(null)
    });
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [sortByName, setSortByName] = useState(false);

  const getLinkedCount = (goal: Goal) => {
    let count = 0;
    if (routineGoals) {
      count += routineGoals.filter(g => g.lifeGoalId === goal.id).length;
    }
    if (habits) {
      count += habits.filter(g => g.lifeGoalId === goal.id).length;
    }
    return count;
  };

  let displayedGoals = lifeGoals.filter(g => g.text.toLowerCase().includes(searchQuery.toLowerCase()));
  if (sortByName) {
    displayedGoals.sort((a, b) => a.text.localeCompare(b.text));
  }

  const isCustomColor = lifeGoalForm.color && !PRESET_COLORS.some(c => c.toLowerCase() === lifeGoalForm.color.toLowerCase());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: 0, overflow: 'hidden', minHeight: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '24px', paddingTop: '16px', overflow: 'hidden', minHeight: 0 }}>
        {headerTabs}
        
        <button 
          onClick={openAddLifeGoal} className="secondary" 
          style={{ width: '100%', marginBottom: '16px', display: 'flex', justifyContent: 'center', gap: '8px', padding: '12px', borderStyle: 'dashed' }}
        >
          <Plus size={16} /> Add Life Goal
        </button>

        <SearchSortBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          sortByName={sortByName}
          setSortByName={setSortByName}
          isFilterActive={searchQuery.length > 0 || sortByName}
          onFilterClear={() => { setSearchQuery(''); setSortByName(false); }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, padding: '8px 12px 8px 4px', marginTop: '-8px' }}>
          {displayedGoals.map(goal => {
            const linkedCount = getLinkedCount(goal);
            const hex = goal.color || '#eab308';
            const bgStyle = getCardBgStyle(hex);

            return (
              <div key={goal.id} className={`item-card ${goal.completed ? 'scratched' : ''}`} style={{ cursor: 'default', position: 'relative', minHeight: '48px', padding: '10px 12px', display: 'flex', alignItems: 'center', ...bgStyle }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <input 
                      type="checkbox" 
                      className="checkbox-square" 
                      checked={goal.completed || false} 
                      onChange={() => toggleLife(goal.id)} 
                      style={{ '--accent': hex, flexShrink: 0 } as React.CSSProperties}
                    />
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <span className="item-title" style={{ color: hex, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '13px', fontWeight: '500' }} title={goal.text}>
                        {goal.text}
                      </span>
                      {goal.desc && (
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }} title={goal.desc}>
                          {goal.desc}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0, marginLeft: '4px' }}>
                    <button className="icon-btn" onClick={() => openEditLifeGoal(goal)} style={{ padding: '4px' }}>
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
                
                  <div 
                  title="Total Linked Routine & Habits"
                  style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
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
                  boxShadow: linkedCount > 0 ? `0 4px 8px ${hex}4D` : '0 2px 8px rgba(255,255,255,0.4)',
                  border: '2px solid var(--panel-bg)',
                  zIndex: 10
                }}>
                  {linkedCount}
                </div>
              </div>
            );
          })}
          {lifeGoals.length === 0 && (
            <div style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
              padding: '40px 20px', color: 'var(--text-secondary)', textAlign: 'center', 
              border: '1px dashed var(--panel-border)', borderRadius: '12px', marginTop: '8px'
            }}>
              <Star size={32} style={{ marginBottom: '12px', opacity: 0.5, color: 'var(--accent)' }} />
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#fff' }}>No life goals yet</div>
              <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>Add long-term aspirations that transcend routine routines.</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 'none', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid var(--panel-border)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <Activity size={14} color="var(--accent)" />
          Life Insights: 
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '20px' }}>
          <Star size={14} color="var(--text-secondary)" />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Active Life Goals:</span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>{lifeGoals.filter(g => !g.completed).length}</span>
        </div>
      </div>

      {/* Life Goal Modal */}
      <BaseModal 
        isOpen={showLifeGoalModal} 
        onClose={() => setShowLifeGoalModal(false)}
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Star size={18} color="var(--accent)" /> 
            {editingLifeGoalId ? 'Edit Life Goal' : 'What you wanna achieve in life?'}
          </span>
        }
      >
        <form onSubmit={saveLifeGoal} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Goal Title</label>
            <input 
              type="text" placeholder="e.g. Write a Book" value={lifeGoalForm.text}
              onChange={(e) => setLifeGoalForm({ ...lifeGoalForm, text: e.target.value })} 
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Goal Description <span style={{ opacity: 0.5 }}>(optional)</span></label>
            <textarea 
              placeholder="Add more details about this goal..." value={lifeGoalForm.desc}
              onChange={(e) => setLifeGoalForm({ ...lifeGoalForm, desc: e.target.value })} 
              style={{ width: '100%', minHeight: '120px', resize: 'vertical' }}
            />
          </div>
          
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
              Theme Color
              {colorError && <span style={{ color: '#ef4444', marginLeft: '8px' }}>{colorError}</span>}
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {PRESET_COLORS.map(c => {
                const isSelected = lifeGoalForm.color && lifeGoalForm.color.toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setColorError(''); setLifeGoalForm({...lifeGoalForm, color: c}); }}
                    style={{
                      width: '24px', height: '24px', borderRadius: '50%', padding: 0,
                      background: c, border: `2px solid ${isSelected ? '#fff' : 'transparent'}`,
                      cursor: 'pointer', transition: 'transform 0.1s',
                      transform: isSelected ? 'scale(1.1)' : 'scale(1)'
                    }}
                  />
                );
              })}
              
              <div style={{
                position: 'relative',
                width: '24px', height: '24px', borderRadius: '50%',
                background: isCustomColor ? lifeGoalForm.color : 'rgba(255, 255, 255, 0.1)',
                border: `2px solid ${isCustomColor ? '#fff' : 'transparent'}`,
                cursor: 'pointer', transition: 'all 0.1s',
                transform: isCustomColor ? 'scale(1.1)' : 'scale(1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isCustomColor ? '#fff' : 'var(--text-secondary)'
              }}>
                {!isCustomColor && <Palette size={12} />}
                <input 
                  type="color"
                  value={lifeGoalForm.color ? lifeGoalForm.color.toLowerCase() : '#ffffff'}
                  onChange={handleColorChange}
                  style={{
                    position: 'absolute', top: '-10px', left: '-10px', width: '44px', height: '44px',
                    cursor: 'pointer', opacity: 0
                  }}
                  title="Custom Color"
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', width: '100%', padding: '8px 0' }}>
            {editingLifeGoalId && (
              <button type="button" onClick={() => { deleteLifeGoal(editingLifeGoalId, lifeGoalForm.text); setShowLifeGoalModal(false); }} style={{ flex: '0 0 20%', background: '#ef4444', color: 'white', border: 'none', padding: '10px 0', borderRadius: '6px', fontWeight: '500' }}>Delete</button>
            )}
            <button type="button" onClick={() => setShowLifeGoalModal(false)} className="secondary" style={{ flex: editingLifeGoalId ? '0 0 25%' : '0 0 30%', padding: '10px 0', borderRadius: '6px', fontWeight: '500' }}>Cancel</button>
            <button type="submit" className="primary" style={{ flex: 1, padding: '10px 0', borderRadius: '6px', fontWeight: 'bold' }}>{editingLifeGoalId ? 'Update' : 'Save'}</button>
          </div>
        </form>
      </BaseModal>

      {confirmConfig && (
        <ConfirmModal 
          title={confirmConfig.title}
          message={confirmConfig.message}
          isDanger={confirmConfig.isDanger}
          onConfirm={confirmConfig.onConfirm}
          onCancel={confirmConfig.onCancel}
          image={undefined}
        />
      )}

    </div>
  );
}
