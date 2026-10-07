import React, {useEffect, useState} from 'react';
import {Activity, Plus, Rocket, Target} from 'lucide-react';
import SearchSortBar from './SearchSortBar';
import ConfirmModal from './ConfirmModal';
import BaseModal from './BaseModal';
import GoalCard from './GoalCard';
import GoalForm from './GoalForm';
import {moveItemRelativeTo} from '../hooks/useDragReorder';
import {type GoalCategory, moveOrSaveGoal} from '../utils/goalTransfer';
import type {Habit, RoutineGoal, Template, TemplateBlock} from '../types/routine';
import type {LifeGoal} from '../types/goals';
import type {ConfirmConfig} from '../types/ui';
import GoalInfoModal from './GoalInfoModal';

interface RoutineGoalPaneProps {
    isPublicView?: boolean;
    routineGoals: RoutineGoal[];
    setRoutineGoals: React.Dispatch<React.SetStateAction<RoutineGoal[]>>;
    habits?: Habit[];
    setHabits?: React.Dispatch<React.SetStateAction<Habit[]>>;
    templates?: Template[];
    setTemplates?: React.Dispatch<React.SetStateAction<Template[]>>;
    activeTemplateId?: string;
    onRoutineGoalBadgeClick?: (id: string) => void;
    headerTabs?: React.ReactNode;
    lifeGoals?: LifeGoal[];
    setLifeGoals?: React.Dispatch<React.SetStateAction<any[]>>;
    moneyGoals?: any[];
    setMoneyGoals?: React.Dispatch<React.SetStateAction<any[]>>;
    setActiveLeftTab?: (tab: GoalCategory) => void;
    milestones?: Record<string, string>;
}

const PRESET_COLORS = ['#FF595E', '#FF9F1C', '#FFCA3A', '#8AC926', '#00F5D4', '#1982C4', '#4361EE', '#6A4C93', '#F15BB5'];

export default function RoutineGoalPane({
                                            isPublicView,
                                            routineGoals,
                                            setRoutineGoals,
                                            habits,
                                            setHabits,
                                            templates,
                                            setTemplates,
                                            onRoutineGoalBadgeClick,
                                            headerTabs,
                                            setLifeGoals,
                                            setMoneyGoals,
                                            setActiveLeftTab,
                                            milestones,
                                        }: RoutineGoalPaneProps) {
    const [showRoutineGoalModal, setShowRoutineGoalModal] = useState(false);
    const [editingRoutineGoalId, setEditingRoutineGoalId] = useState<string | null>(null);
    const [routineGoalForm, setRoutineGoalForm] = useState<{
        name: string;
        color: string;
        desc: string;
        cost: string;
        isPublic?: boolean;
        category?: GoalCategory
    }>({name: '', color: '', desc: '', cost: '', isPublic: false, category: 'routine'});
    const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);
    const [colorError, setColorError] = useState('');
    const [drawerRoutineGoalId, setDrawerRoutineGoalId] = useState<string | null>(null);
    const [infoGoalId, setInfoGoalId] = useState<string | null>(null);

    const openAddRoutineGoal = () => {
        setEditingRoutineGoalId(null);
        const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)] || '#1982C4';
        setRoutineGoalForm({name: '', isPublic: true, color: randomColor, desc: '', cost: '', category: 'routine'});
        setShowRoutineGoalModal(true);
    };

    useEffect(() => {
        const handleFab = () => openAddRoutineGoal();
        window.addEventListener('fab:add-routine-goal', handleFab);
        return () => window.removeEventListener('fab:add-routine-goal', handleFab);
    }, []);

    const openEditRoutineGoal = (goal: RoutineGoal) => {
        setEditingRoutineGoalId(goal.id);
        setColorError('');
        const goalColor = goal.color || PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)] || '#1982C4';
        const goalName = goal.name || '';
        setRoutineGoalForm({
            name: goalName,
            color: goalColor,
            desc: (goal.desc as string) || '',
            cost: goal.cost ? String(goal.cost) : '',
            isPublic: !!goal.isPublic,
            category: 'routine'
        });
        setShowRoutineGoalModal(true);
    };

    const saveRoutineGoal = (e: React.SyntheticEvent) => {
        e.preventDefault();
        const originalGoal = editingRoutineGoalId ? routineGoals.find(g => g.id === editingRoutineGoalId) : undefined;

        if (editingRoutineGoalId && (routineGoalForm.category || 'routine') === 'routine') {
            if (templates && setTemplates && habits) {
                const linkedRoutineGoalIds = habits.filter((g: Habit) => (g.routineGoalIds as string[] | undefined)?.includes(editingRoutineGoalId) || g.routineGoalId === editingRoutineGoalId).map(g => g.id);
                const updatedTemplates = templates.map((t: Template) => ({
                    ...t, blocks: t.blocks.map((b: TemplateBlock) => {
                        if (b.routineGoalId && linkedRoutineGoalIds.includes(b.routineGoalId)) {
                            return {...b, isPublic: !!routineGoalForm.isPublic, color: routineGoalForm.color || ""};
                        }
                        return b;
                    })
                }));
                setTemplates(updatedTemplates);
            }
        }

        moveOrSaveGoal({
            goalId: editingRoutineGoalId,
            sourceCategory: 'routine',
            targetCategory: routineGoalForm.category || 'routine',
            isDuplicate: false,
            formData: routineGoalForm,
            originalGoal,
            setLifeGoals,
            setMoneyGoals,
            setRoutineGoals: setRoutineGoals as any,
            setActiveLeftTab,
            onSuccess: () => setShowRoutineGoalModal(false)
        });
    };

    const handleDuplicateRoutineGoal = () => {
        if (!editingRoutineGoalId) return;
        const originalGoal = routineGoals.find(g => g.id === editingRoutineGoalId);
        moveOrSaveGoal({
            goalId: editingRoutineGoalId,
            sourceCategory: 'routine',
            targetCategory: routineGoalForm.category || 'routine',
            isDuplicate: true,
            formData: routineGoalForm,
            originalGoal,
            setLifeGoals,
            setMoneyGoals,
            setRoutineGoals: setRoutineGoals as any,
            setActiveLeftTab,
            onSuccess: () => setShowRoutineGoalModal(false)
        });
    };

    const toggleRoutineGoal = (id: string) => {
        const now = new Date().toISOString();
        setRoutineGoals(routineGoals.map((g: RoutineGoal) => {
            if (g.id !== id) return g;
            const isCompleting = !g.completed;
            return {
                ...g, completed: isCompleting, completedAt: isCompleting ? ((g as any).completedAt || now) : undefined
            };
        }));
    };

    const deleteRoutineGoal = (id: string, name: string) => {
        setConfirmConfig({
            title: 'Delete Routine Goal',
            message: `Are you sure you want to delete the routine goal: "${name}"? Routine goals and calendar blocks linked to it will be unlinked (turned white).`,
            isDanger: true,
            onConfirm: () => {
                setRoutineGoals(routineGoals.filter((g: RoutineGoal) => g.id !== id));

                // 1. Unlink habits
                if (habits && setHabits) {
                    setHabits(habits.map((g: Habit) => {
                        const existingIds = (g.routineGoalIds as string[] | undefined) || (g.routineGoalId ? [g.routineGoalId] : []);
                        const newRIds = existingIds.filter(rid => rid !== id);
                        return {...g, routineGoalIds: newRIds, routineGoalId: undefined};
                    }));
                }

                // 2. Unlink (turn white) calendar blocks linked to those habits
                if (templates && setTemplates && habits) {
                    const linkedRoutineGoalIds = habits.filter((g: Habit) => ((g.routineGoalIds as string[] | undefined)?.includes(id)) || g.routineGoalId === id).map(g => g.id);
                    const updatedTemplates = templates.map((t: Template) => ({
                        ...t, blocks: t.blocks.map((b: TemplateBlock) => {
                            if (b.routineGoalId && linkedRoutineGoalIds.includes(b.routineGoalId)) {
                                return {...b, color: '#ffffff'};
                            }
                            return b;
                        })
                    }));
                    setTemplates(updatedTemplates);
                }
                setConfirmConfig(null);
            }
        });
    };

    const [searchQuery, setSearchQuery] = useState('');
    const [sortByName, setSortByName] = useState(false);

    const getLinkedCount = (goal: RoutineGoal) => {
        const txt = (goal.name || '').toLowerCase().trim();
        const visibleHabits = (habits || []).filter(g => !isPublicView || g.isPublic || (g.name || '').includes('[public]'));
        const linkedGoals = visibleHabits.filter(g => {
            const rIds = Array.isArray(g.routineGoalIds) ? g.routineGoalIds : (g.routineGoalId ? [g.routineGoalId] : []);
            return rIds.includes(goal.id) || (txt && (g.name || '').toLowerCase().trim() === txt) || (txt && (g.desc as string | undefined) && (g.desc as string).toLowerCase().trim() === txt);
        });
        return linkedGoals.length;
    };

    const displayedGoals = routineGoals.filter((g: RoutineGoal) => (g.name || '').toLowerCase().includes(searchQuery.toLowerCase()) && (!isPublicView || g.isPublic || (g.name || '').includes('[public]')));
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
                    onClick={openAddRoutineGoal}
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
                    <Plus size={16}/> Add Routine Goal
                </button>

                <SearchSortBar
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    sortByName={sortByName}
                    setSortByName={setSortByName}
                    isFilterActive={false}
                    onFilterClear={() => {
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
                        const activeGoals = displayedGoals.filter((g) => !g.completed);
                        const completedGoals = displayedGoals.filter((g) => g.completed);
                        const isReorderDisabled = !!searchQuery || !!sortByName;

                        const renderGoalItem = (goal: RoutineGoal, idx: number, list: RoutineGoal[]) => {
                            const absoluteIndex = routineGoals.findIndex((g) => g.id === goal.id);
                            return (
                                <GoalCard
                                    key={goal.id}
                                    goal={goal}
                                    index={absoluteIndex}
                                    linkedCount={getLinkedCount(goal)}
                                    canMoveUp={idx > 0}
                                    canMoveDown={idx < list.length - 1}
                                    onMoveUp={() => setRoutineGoals(prev => moveItemRelativeTo(prev, goal, list[idx - 1], 'before'))}
                                    onMoveDown={() => setRoutineGoals(prev => moveItemRelativeTo(prev, goal, list[idx + 1], 'after'))}
                                    isReorderDisabled={isReorderDisabled}
                                    onToggle={toggleRoutineGoal}
                                    onEdit={openEditRoutineGoal}
                                    onCardClick={(g) => setInfoGoalId(g.id)}
                                    onBadgeClick={(id) => {
                                        if (window.innerWidth >= 1400) {
                                            if (onRoutineGoalBadgeClick) onRoutineGoalBadgeClick(id);
                                        } else {
                                            setDrawerRoutineGoalId(id);
                                        }
                                    }}
                                />
                            );
                        };

                        return (<>
                                {activeGoals.map((g, idx) => renderGoalItem(g, idx, activeGoals))}
                                {completedGoals.length > 0 && (<div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        margin: '16px 0 8px 0',
                                        justifyContent: 'space-between'
                                    }}>
                                        <span style={{
                                            padding: '0 12px 0 0',
                                            fontSize: '12px',
                                            color: 'var(--text-secondary)',
                                            fontWeight: 500
                                        }}>
                                            Completed
                                        </span>
                                        <div style={{flex: 1, height: '1px', background: 'var(--panel-border)'}}/>
                                        <button
                                            onClick={() => {
                                                setConfirmConfig({
                                                    title: 'Delete All Completed',
                                                    message: 'Are you sure you want to delete all completed routine goals? This cannot be undone.',
                                                    isDanger: true,
                                                    onConfirm: () => {
                                                        setRoutineGoals(routineGoals.filter((g) => !g.completed));
                                                        setConfirmConfig(null);
                                                    }
                                                });
                                            }}
                                            className="icon-btn"
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--danger)',
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                                padding: '4px 8px',
                                                fontWeight: 500,
                                                opacity: 0.8
                                            }}
                                        >
                                            Delete all
                                        </button>
                                    </div>)}
                                {completedGoals.map((g, idx) => renderGoalItem(g, idx, completedGoals))}
                            </>);
                    })()}
                    {routineGoals.length === 0 && (<div style={{
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
                            <Rocket size={32} style={{marginBottom: '12px', opacity: 0.5, color: 'var(--accent)'}}/>
                            <div style={{fontSize: '14px', fontWeight: '500', color: '#fff'}}>No routine goals yet</div>
                            <div style={{fontSize: '12px', marginTop: '4px', opacity: 0.7}}>Add major goals you want to
                                achieve during this period.
                            </div>
                        </div>)}
                </div>
            </div>

            {/* BOTTOM METRICS: Routine Insights */}
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
                        const visibleRoutineGoals = (routineGoals || []).filter((g: RoutineGoal) => !isPublicView || g.isPublic || (g.name || '').includes('[public]'));
                        return <>Routine Goals
                            : {visibleRoutineGoals.filter((g: RoutineGoal) => g.completed).length} / {visibleRoutineGoals.length}</>;
                    })()}
                </div>
            </div>

            {/* Routine Goal Modal */}
            <BaseModal
                isOpen={showRoutineGoalModal}
                onClose={() => setShowRoutineGoalModal(false)}
                title={<span style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <Target size={18} color="var(--accent)"/>
                    {editingRoutineGoalId ? 'Edit Routine Goal' : 'New Routine Goal'}
                </span>}
                bodyClassName="modal-body-fixed-footer"
            >
                <GoalForm
                    formData={routineGoalForm}
                    setFormData={(data) => setRoutineGoalForm({
                        name: data.name,
                        color: data.color,
                        desc: data.desc,
                        cost: String(data.cost ?? ''),
                        isPublic: data.isPublic,
                        category: data.category
                    })}
                    onSubmit={saveRoutineGoal}
                    onCancel={() => setShowRoutineGoalModal(false)}
                    onDelete={editingRoutineGoalId ? () => {
                        deleteRoutineGoal(editingRoutineGoalId, routineGoalForm.name);
                        setShowRoutineGoalModal(false);
                    } : undefined}
                    onDuplicate={editingRoutineGoalId ? handleDuplicateRoutineGoal : undefined}
                    isEditing={!!editingRoutineGoalId}
                    colorError={colorError}
                    setColorError={setColorError}
                    currentCategory="routine"
                />
            </BaseModal>

            {/* Confirm Modal */}
            {confirmConfig && (<ConfirmModal
                    title={confirmConfig.title}
                    message={confirmConfig.message}
                    isDanger={confirmConfig.isDanger}
                    onConfirm={confirmConfig.onConfirm}
                    onCancel={() => setConfirmConfig(null)}
                    image={undefined}
                />)}

            {drawerRoutineGoalId && (<BaseModal
                    isOpen={!!drawerRoutineGoalId}
                    onClose={() => setDrawerRoutineGoalId(null)}
                    title={<span style={{display: 'flex', alignItems: 'center', gap: '8px'}}>Linked Habits</span>}
                >
                    <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                        {(() => {
                            const linkedHabits = (habits || []).filter(g => ((g.routineGoalIds as string[] | undefined)?.includes(drawerRoutineGoalId) || g.routineGoalId === drawerRoutineGoalId) && (!isPublicView || g.isPublic || (g.name || '').includes('[public]')));
                            if (linkedHabits.length === 0) {
                                return <div style={{color: 'var(--text-secondary)'}}>No habits linked to this
                                    goal.</div>;
                            }
                            return (<div>
                                    {linkedHabits.map(h => (<div key={h.id} style={{
                                            padding: '8px',
                                            background: 'var(--surface-light)',
                                            borderRadius: '6px',
                                            marginBottom: '4px'
                                        }}>
                                            {h.name}
                                        </div>))}
                                </div>);
                        })()}
                    </div>
                </BaseModal>)}

            {(() => {
                const goal = infoGoalId ? routineGoals.find(g => g.id === infoGoalId) : null;
                const hex = goal?.color || '#1982C4';
                const linkedHabits = infoGoalId ? (habits || []).filter(h => ((h.routineGoalIds as string[] | undefined)?.includes(infoGoalId) || h.routineGoalId === infoGoalId) && (!isPublicView || h.isPublic || (h.name || '').includes('[public]'))) : [];

                return (
                    <GoalInfoModal
                        isOpen={!!infoGoalId}
                        onClose={() => setInfoGoalId(null)}
                        goal={goal}
                        icon={<Target size={18} color={hex} />}
                        costLabel="Estimated Cost"
                        linkedHabits={linkedHabits}
                        milestones={milestones}
                        onEdit={openEditRoutineGoal}
                    />
                );
            })()}
        </div>);
}
