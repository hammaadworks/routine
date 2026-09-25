import * as React from 'react';
import {useEffect, useState} from 'react';
import {Activity, Plus, Star, Clock, Pencil} from 'lucide-react';
import SearchSortBar from './SearchSortBar';
import ConfirmModal from './ConfirmModal';
import BaseModal from './BaseModal';
import GoalCard from './GoalCard';
import GoalForm from './GoalForm';
import { useDragReorder } from '../hooks/useDragReorder';
import { formatCompactDuration } from '../utils';

const PRESET_COLORS = ['#FF595E', '#FF9F1C', '#FFCA3A', '#8AC926', '#00F5D4', '#1982C4', '#4361EE', '#6A4C93', '#F15BB5'];

interface Goal {
    id: string;
    name: string;
    color?: string;
    completed?: boolean;
    desc?: string;
    lifeGoalId?: string;
    cost?: number;
    isPublic?: boolean;
    createdAt?: string;
    completedAt?: string;
}

interface LifePaneProps {
    isPublicView?: boolean;
    lifeGoals: Goal[];
    setLifeGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
    routineGoals?: Goal[];
    setRoutineGoals?: React.Dispatch<React.SetStateAction<Goal[]>>;
    habits?: any[];
    setHabits?: React.Dispatch<React.SetStateAction<any[]>>;
    headerTabs?: React.ReactNode;
    onLifeGoalBadgeClick?: (id: string) => void;
}

interface ConfirmConfig {
    title: string;
    message: string;
    isDanger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function LifePane({
    isPublicView,
                                     lifeGoals,
                                     setLifeGoals,
                                     routineGoals,
                                     setRoutineGoals,
                                     habits,
                                     setHabits,
                                     headerTabs,
                                     onLifeGoalBadgeClick
                                 }: LifePaneProps) {
    const [showLifeGoalModal, setShowLifeGoalModal] = useState(false);
    const [editingLifeGoalId, setEditingLifeGoalId] = useState<string | null>(null);
    const [lifeGoalForm, setLifeGoalForm] = useState<{name: string; color: string; desc: string; cost: string, isPublic?: boolean}>({name: '', color: '', desc: '', cost: ''});
    const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);
    const [colorError, setColorError] = useState('');
    const [drawerLifeGoalId, setDrawerLifeGoalId] = useState<string | null>(null);
    const [infoGoalId, setInfoGoalId] = useState<string | null>(null);

    const { handleDragStart, handleDragEnter, handleDragEnd, dragItemIndex, dragOverItemIndex } = useDragReorder(lifeGoals, setLifeGoals as any);

    useEffect(() => {
        const handleFab = () => openAddLifeGoal();
        window.addEventListener('fab:add-life-goal', handleFab);
        return () => {
            window.removeEventListener('fab:add-life-goal', handleFab);
        };
    }, []);

    const openAddLifeGoal = () => {
        setEditingLifeGoalId(null);
        const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)] || '#FF595E';
        setLifeGoalForm({name: '', isPublic: true, color: randomColor, desc: '', cost: ''});
        setShowLifeGoalModal(true);
    };

    const openEditLifeGoal = (goal: Goal) => {
        setEditingLifeGoalId(goal.id);
        setColorError('');
        const goalColor = goal.color || PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)] || '#FF595E';
        const goalName = goal.name || '';
        setLifeGoalForm({name: goalName, color: goalColor, desc: goal.desc || '', cost: goal.cost ? String(goal.cost) : '', isPublic: !!goal.isPublic});
        setShowLifeGoalModal(true);
    };

    const saveLifeGoal = (e: React.SyntheticEvent) => {
        e.preventDefault();
        const cleanName = lifeGoalForm.name.trim();
        if (!cleanName) return;
        const costValue = lifeGoalForm.cost ? parseFloat(String(lifeGoalForm.cost)) : undefined;

        if (editingLifeGoalId) {
            setLifeGoals(prev => prev.map(g => {
                if (g.id !== editingLifeGoalId) return g;
                const { text: _text, title: _title, task: _task, ...cleanG } = g as any;
                return {
                    ...cleanG,
                    name: cleanName,
                    isPublic: !!lifeGoalForm.isPublic, color: lifeGoalForm.color,
                    desc: lifeGoalForm.desc,
                    cost: costValue
                };
            }));
        } else {
            const now = new Date().toISOString();
            setLifeGoals([...lifeGoals, {
                id: 'lg-' + Date.now(),
                name: cleanName,
                isPublic: !!lifeGoalForm.isPublic, color: lifeGoalForm.color,
                completed: false,
                desc: lifeGoalForm.desc,
                cost: costValue,
                createdAt: now
            }]);
        }
        setShowLifeGoalModal(false);
    };

    const toggleLife = (id: string) => {
        const now = new Date().toISOString();
        setLifeGoals(lifeGoals.map(g => {
            if (g.id !== id) return g;
            const isCompleting = !g.completed;
            return {
                ...g,
                completed: isCompleting,
                completedAt: isCompleting ? ((g as any).completedAt || now) : undefined
            };
        }));
    };

    const deleteLifeGoal = (id: string, name: string) => {
        setConfirmConfig({
            title: 'Delete Life Goal',
            message: `Are you sure you want to delete the life goal: "${name}"? Routine and habits linked to it will be unlinked.`,
            isDanger: true,
            onConfirm: () => {
                setLifeGoals(lifeGoals.filter(g => g.id !== id));

                if (routineGoals && setRoutineGoals) {
                    setRoutineGoals(routineGoals.map(g => g.lifeGoalId === id ? {...g, lifeGoalId: ''} : g));
                }

                if (habits && setHabits) {
                    setHabits(habits.map(g => g.lifeGoalId === id ? {...g, lifeGoalId: ''} : g));
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
            count += routineGoals.filter(g => g.lifeGoalId === goal.id && (!isPublicView || g.isPublic || (g.name || '').includes('[public]'))).length;
        }
        if (habits) {
            count += habits.filter(g => g.lifeGoalId === goal.id && (!isPublicView || g.isPublic || (g.name || '').includes('[public]'))).length;
        }
        return count;
    };

    let displayedGoals = lifeGoals.filter((g: any) => (g.name || '').toLowerCase().includes(searchQuery.toLowerCase()) && (!isPublicView || g.isPublic || (g.name || '').includes('[public]')));
    if (sortByName) {
        displayedGoals.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }



    return (
        <div style={{display: 'flex', flexDirection: 'column', flex: 1, padding: 0, overflow: 'hidden', minHeight: 0}}>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                padding: '24px',
                paddingTop: '16px',
                overflow: 'hidden',
                minHeight: 0
            }}>
                {headerTabs}


                <button
                    onClick={openAddLifeGoal}
                    className="secondary desktop-only-btn"
                    style={{
                        width: '100%',
                        flexShrink: 0,
                        marginBottom: '16px',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px',
                        borderStyle: 'dashed'
                    }}
                >
                    <Plus size={16}/> Add Life Goal
                </button>

                <SearchSortBar
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    sortByName={sortByName}
                    setSortByName={setSortByName}
                    isFilterActive={searchQuery.length > 0 || sortByName}
                    onFilterClear={() => {
                        setSearchQuery('');
                        setSortByName(false);
                    }}
                />
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    overflowY: 'auto',
                    flex: 1,
                    padding: '12px 12px 12px 6px',
                    marginTop: '0px'
                }}>
                    {(() => {
                        const activeGoals = displayedGoals.filter(g => !g.completed);
                        const completedGoals = displayedGoals.filter(g => g.completed);

                        const renderGoal = (goal: Goal) => {
                            const absoluteIndex = lifeGoals.findIndex(g => g.id === goal.id);
                            const isDragging = dragItemIndex === absoluteIndex;
                            const isDragOver = dragOverItemIndex === absoluteIndex && dragItemIndex !== absoluteIndex;
                            let dropDirection: 'up' | 'down' | undefined = undefined;
                            if (isDragOver && dragItemIndex !== null) {
                                dropDirection = dragItemIndex > absoluteIndex ? 'up' : 'down';
                            }
                            return (<GoalCard
                                key={goal.id}
                                goal={goal}
                                index={absoluteIndex}
                                linkedCount={getLinkedCount(goal)}
                                draggable={!searchQuery && !sortByName}
                                onDragStart={handleDragStart}
                                onDragEnter={handleDragEnter}
                                onDragEnd={handleDragEnd}
                                onToggle={toggleLife}
                                onEdit={openEditLifeGoal}
                                onCardClick={(g) => setInfoGoalId(g.id)}
                                onBadgeClick={(id) => {
                                    if (window.innerWidth >= 1400) {
                                        if (onLifeGoalBadgeClick) onLifeGoalBadgeClick(id);
                                    } else {
                                        setDrawerLifeGoalId(id);
                                    }
                                }}
                                isDragging={isDragging}
                                isDragOver={isDragOver}
                                dropDirection={dropDirection}
                            />);
                        };

                        return (<>
                            {activeGoals.map(renderGoal)}
                            {completedGoals.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0 8px 0', justifyContent: 'space-between' }}>
                                  <span style={{ 
                                    padding: '0 12px 0 0', 
                                    fontSize: '12px', 
                                    color: 'var(--text-secondary)',
                                    fontWeight: 500
                                  }}>
                                    Completed
                                  </span>
                                  <div style={{ flex: 1, height: '1px', background: 'var(--panel-border)' }}></div>
                                  <button 
                                     onClick={() => {
                                        setConfirmConfig({
                                          title: 'Delete All Completed',
                                          message: 'Are you sure you want to delete all completed life goals? This cannot be undone.',
                                          isDanger: true,
                                          onConfirm: () => {
                                            setLifeGoals(lifeGoals.filter((g: any) => !g.completed));
                                            setConfirmConfig(null);
                                          },
                                          onCancel: () => setConfirmConfig(null)
                                        });
                                     }}
                                     className="icon-btn"
                                     style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '12px', cursor: 'pointer', padding: '4px 8px', fontWeight: 500, opacity: 0.8 }}>
                                     Delete all
                                  </button>
                              </div>)}
                            {completedGoals.map(renderGoal)}
                        </>);
                    })()}
                    {lifeGoals.length === 0 && (<div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '40px 20px',
                        color: 'var(--text-secondary)',
                        textAlign: 'center',
                        border: '1px dashed var(--panel-border)',
                        borderRadius: '12px',
                        marginTop: '8px'
                    }}>
                        <Star size={32} style={{marginBottom: '12px', opacity: 0.5, color: 'var(--accent)'}}/>
                        <div style={{fontSize: '14px', fontWeight: '500', color: '#fff'}}>No life goals yet</div>
                        <div style={{fontSize: '12px', marginTop: '4px', opacity: 0.7}}>Add long-term aspirations
                            that transcend routine routines.
                        </div>
                    </div>)}
                </div>
            </div>

            <div style={{
                flex: 'none',
                background: 'rgba(0,0,0,0.3)',
                borderTop: '1px solid var(--panel-border)',
                padding: '0 16px',
                minHeight: '44px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '8px'
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)'
                }}>
                    <Activity size={14} color="var(--accent)"/>
                    {(() => {
                        const visibleLifeGoals = (lifeGoals || []).filter((g: any) => !isPublicView || g.isPublic || (g.name || '').includes('[public]'));
                        return <>Life Goals : {visibleLifeGoals.filter((g: any) => g.completed).length} / {visibleLifeGoals.length}</>;
                    })()}
                </div>
            </div>

            {/* Life Goal Modal */}
            <BaseModal
                isOpen={showLifeGoalModal}
                onClose={() => setShowLifeGoalModal(false)}
                title={<span style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <Star size={18} color="var(--accent)"/>
                    {editingLifeGoalId ? 'Edit Life Goal' : 'What you wanna achieve in life?'}
          </span>}
            >
                <GoalForm
                    formData={lifeGoalForm}
                    setFormData={setLifeGoalForm as any}
                    onSubmit={saveLifeGoal}
                    onCancel={() => setShowLifeGoalModal(false)}
                    onDelete={editingLifeGoalId ? () => {
                        deleteLifeGoal(editingLifeGoalId, lifeGoalForm.name);
                        setShowLifeGoalModal(false);
                    } : undefined}
                    isEditing={!!editingLifeGoalId}
                    colorError={colorError}
                    setColorError={setColorError}
                />
            </BaseModal>

            {confirmConfig && (<ConfirmModal
                title={confirmConfig.title}
                message={confirmConfig.message}
                isDanger={confirmConfig.isDanger}
                onConfirm={confirmConfig.onConfirm}
                onCancel={confirmConfig.onCancel}
                image={undefined}
            />)}

            {drawerLifeGoalId && (<BaseModal
                isOpen={!!drawerLifeGoalId}
                onClose={() => setDrawerLifeGoalId(null)}
                title={<span style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              Linked Items
            </span>}
            >
                <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                    {(() => {
                        const linkedRoutines = (routineGoals || []).filter(g => g.lifeGoalId === drawerLifeGoalId && (!isPublicView || g.isPublic || (g.name || '').includes('[public]')));
                        const linkedHabits = (habits || []).filter(g => g.lifeGoalId === drawerLifeGoalId && (!isPublicView || g.isPublic || (g.name || '').includes('[public]')));
                        if (linkedRoutines.length === 0 && linkedHabits.length === 0) {
                            return <div style={{color: 'var(--text-secondary)'}}>No items linked to this
                                goal.</div>;
                        }
                        return (<>
                            {linkedRoutines.length > 0 && (<div>
                                <div style={{
                                    fontSize: '12px',
                                    color: 'var(--text-secondary)',
                                    marginBottom: '8px',
                                    fontWeight: 'bold'
                                }}>Routine Goals
                                </div>
                                {linkedRoutines.map(rg => (<div key={rg.id} style={{
                                    padding: '8px',
                                    background: 'var(--surface-light)',
                                    borderRadius: '6px',
                                    marginBottom: '4px'
                                }}>{rg.name}</div>))}
                            </div>)}
                            {linkedHabits.length > 0 && (<div>
                                <div style={{
                                    fontSize: '12px',
                                    color: 'var(--text-secondary)',
                                    marginBottom: '8px',
                                    fontWeight: 'bold'
                                }}>Habits
                                </div>
                                {linkedHabits.map(h => (<div key={h.id} style={{
                                    padding: '8px',
                                    background: 'var(--surface-light)',
                                    borderRadius: '6px',
                                    marginBottom: '4px'
                                }}>{h.name}</div>))}
                            </div>)}
                        </>);
                    })()}
                </div>
            </BaseModal>)}

            {infoGoalId && (() => {
                const goal = lifeGoals.find(g => g.id === infoGoalId);
                if (!goal) return null;
                const hex = goal.color || '#eab308';
                const timeInfo = formatCompactDuration(goal.createdAt, goal.completedAt, goal.completed, goal.id);
                const linkedRoutines = (routineGoals || []).filter(g => g.lifeGoalId === infoGoalId);
                const linkedHabits = (habits || []).filter(h => (h.lifeGoalIds || []).includes(infoGoalId) || h.lifeGoalId === infoGoalId);

                return (
                    <BaseModal
                        isOpen={true}
                        onClose={() => setInfoGoalId(null)}
                        title={
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hex }}>
                                <Star size={18} color={hex} />
                                {goal.name}
                            </span>
                        }
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {timeInfo && (
                                <div style={{
                                    background: `${hex}15`,
                                    border: `1px solid ${hex}40`,
                                    padding: '12px',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    color: 'var(--text-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <Clock size={16} color={hex} />
                                    <span>{timeInfo.fullText}</span>
                                </div>
                            )}

                            {goal.desc && (
                                <div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 'bold' }}>
                                        Description
                                    </div>
                                    <div style={{ background: 'var(--surface-light)', padding: '12px', borderRadius: '8px', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                                        {goal.desc}
                                    </div>
                                </div>
                            )}

                            {typeof goal.cost === 'number' && goal.cost > 0 && (
                                <div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 'bold' }}>
                                        Estimated Cost
                                    </div>
                                    <div style={{ background: 'var(--surface-light)', padding: '12px', borderRadius: '8px', fontSize: '14px' }}>
                                        ${goal.cost}
                                    </div>
                                </div>
                            )}

                            <div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 'bold' }}>
                                    Linked Habits & Routines ({linkedHabits.length + linkedRoutines.length})
                                </div>
                                {linkedHabits.length === 0 && linkedRoutines.length === 0 ? (
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No linked habits yet.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {linkedRoutines.map(r => (
                                            <span key={r.id} style={{ padding: '4px 8px', borderRadius: '6px', background: 'var(--surface-light)', fontSize: '12px', border: '1px solid var(--border)' }}>
                                                {r.name}
                                            </span>
                                        ))}
                                        {linkedHabits.map(h => (
                                            <span key={h.id} style={{ padding: '4px 8px', borderRadius: '6px', background: 'var(--surface-light)', fontSize: '12px', border: '1px solid var(--border)' }}>
                                                {h.name}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                <button
                                    type="button"
                                    className="secondary"
                                    onClick={() => setInfoGoalId(null)}
                                    style={{ flex: 1, padding: '10px 0', borderRadius: '6px', fontWeight: '500' }}
                                >
                                    Close
                                </button>
                                <button
                                    type="button"
                                    className="primary"
                                    onClick={() => {
                                        setInfoGoalId(null);
                                        openEditLifeGoal(goal);
                                    }}
                                    style={{ flex: 1, padding: '10px 0', borderRadius: '6px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                >
                                    <Pencil size={14} /> Edit Goal
                                </button>
                            </div>
                        </div>
                    </BaseModal>
                );
            })()}

        </div>);
}
