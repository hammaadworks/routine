// @ts-nocheck
import * as React from 'react';
import {useEffect, useState} from 'react';
import {Activity, Clock, Palette, Pencil, Plus, Rocket, Target} from 'lucide-react';
import SearchSortBar from './SearchSortBar';
import ConfirmModal from './ConfirmModal';
import BaseModal from './BaseModal';
import {validateColor, getCardBgStyle} from '../utils';

interface RoutineGoal {
    id: string;
    text: string;
    color?: string;
    completed?: boolean;
    lifeGoalId?: string;
    desc?: string;
}

interface Habit {
    id: string;
    routineGoalId?: string;
    task: string;
    desc?: string;
}

interface TemplateBlock {
    routineGoalId?: string;
    color?: string;
    startTime: number;
    duration?: number;
}

interface Template {
    id: string;
    blocks: TemplateBlock[];
}

interface LifeGoal {
    id: string;
    text: string;
}

interface ConfirmConfig {
    title: string;
    message: string;
    isDanger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

interface RoutineGoalPaneProps {
    routineGoals: RoutineGoal[];
    setRoutineGoals: React.Dispatch<React.SetStateAction<RoutineGoal[]>>;
    habits?: Habit[];
    setHabits?: React.Dispatch<React.SetStateAction<Habit[]>>;
    templates?: Template[];
    setTemplates?: React.Dispatch<React.SetStateAction<Template[]>>;
    activeTemplateId?: string;
    onRoutineGoalBadgeClick?: (id: string) => void;
    lifeGoals?: LifeGoal[];
    headerTabs?: React.ReactNode;
}

const PRESET_COLORS = ['#FF595E', '#FF9F1C', '#FFCA3A', '#8AC926', '#00F5D4', '#1982C4', '#4361EE', '#6A4C93', '#F15BB5'];

export default function RoutineGoalPane({
                                            routineGoals,
                                            setRoutineGoals,
                                            habits,
                                            setHabits,
                                            templates,
                                            setTemplates,
                                            activeTemplateId,
                                            onRoutineGoalBadgeClick,
                                            lifeGoals,
                                            headerTabs
                                        }: RoutineGoalPaneProps) {
    const [showRoutineGoalModal, setShowRoutineGoalModal] = useState(false);
    const [editingRoutineGoalId, setEditingRoutineGoalId] = useState<string | null>(null);
    const [routineGoalForm, setRoutineGoalForm] = useState({text: '', color: '', lifeGoalId: '', desc: ''});
    const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);
    const [colorError, setColorError] = useState('');

    const openAddRoutineGoal = () => {
        setEditingRoutineGoalId(null);
        const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)] || "#FF595E";
        setRoutineGoalForm({text: '', color: randomColor, lifeGoalId: '', desc: ''});
        setShowRoutineGoalModal(true);
    };

    useEffect(() => {
        const handleFab = () => openAddRoutineGoal();
        window.addEventListener('fab:add-strategy', handleFab);
        return () => window.removeEventListener('fab:add-strategy', handleFab);
    }, []);


    const openEditRoutineGoal = (goal: RoutineGoal) => {
        setEditingRoutineGoalId(goal.id);
        setColorError('');
        const goalColor = goal.color || PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)] || "#FF595E";
        setRoutineGoalForm({
            text: goal.text, color: goalColor, lifeGoalId: goal.lifeGoalId || '', desc: goal.desc || ''
        });
        setShowRoutineGoalModal(true);
    };

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const hex = e.target.value;
        const {isValid, error} = validateColor(hex);
        if (!isValid) {
            setColorError(error);
        } else {
            setColorError('');
            setRoutineGoalForm({...routineGoalForm, color: hex.toUpperCase()});
        }
    };

    const saveRoutineGoal = (e: React.FormEvent) => {
        e.preventDefault();
        if (!routineGoalForm.text.trim()) return;
        const cleanText = routineGoalForm.text.trim();
        if (editingRoutineGoalId) {
            setRoutineGoals(prev => prev.map((g: RoutineGoal) => g.id === editingRoutineGoalId ? {
                ...g,
                text: cleanText,
                color: routineGoalForm.color,
                lifeGoalId: routineGoalForm.lifeGoalId || "",
                desc: routineGoalForm.desc || ""
            } : g));

            if (templates && setTemplates && habits) {
                const linkedRoutineGoalIds = habits.filter((g: Habit) => g.routineGoalId === editingRoutineGoalId).map(g => g.id);
                const updatedTemplates = templates.map((t: Template) => ({
                    ...t, blocks: t.blocks.map((b: TemplateBlock) => {
                        if (b.routineGoalId && linkedRoutineGoalIds.includes(b.routineGoalId)) {
                            return {...b, color: routineGoalForm.color || ""};
                        }
                        return b;
                    })
                }));
                setTemplates(updatedTemplates);
            }
        } else {
            setRoutineGoals([...routineGoals, {
                id: 'sg-' + Date.now(),
                text: cleanText,
                color: routineGoalForm.color,
                completed: false,
                lifeGoalId: routineGoalForm.lifeGoalId || "",
                desc: routineGoalForm.desc || ""
            }]);
        }
        setShowRoutineGoalModal(false);
    };

    const toggleRoutineGoal = (id: string) => {
        setRoutineGoals(routineGoals.map((g: RoutineGoal) => g.id === id ? {...g, completed: !g.completed} : g));
    };

    const deleteRoutineGoal = (id: string, text: string) => {
        setConfirmConfig({
            title: 'Delete Routine Goal',
            message: `Are you sure you want to delete the routine goal: "${text}"? Routine goals and calendar blocks linked to it will be unlinked (turned white).`,
            isDanger: true,
            onConfirm: () => {
                setRoutineGoals(routineGoals.filter((g: RoutineGoal) => g.id !== id));

                // 1. Unlink habits
                if (habits && setHabits) {
                    setHabits(habits.map((g: Habit) => g.routineGoalId === id ? {...g, routineGoalId: ''} : g));
                }

                // 2. Unlink (turn white) calendar blocks linked to those habits
                if (templates && setTemplates && habits) {
                    const linkedRoutineGoalIds = habits.filter((g: Habit) => g.routineGoalId === id).map(g => g.id);
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
            },
            onCancel: () => setConfirmConfig(null)
        });
    };

    const [searchQuery, setSearchQuery] = useState('');
    const [sortByName, setSortByName] = useState(false);

    const getLinkedCount = (goal: RoutineGoal) => {
        const txt = goal.text.toLowerCase().trim();
        if (!txt) return 0;
        const linkedGoals = (habits || []).filter(g => g.routineGoalId === goal.id || g.task.toLowerCase().trim() === txt || (g.desc && g.desc.toLowerCase().trim() === txt));
        return linkedGoals.length;
    };

    // Metrics Calculations
    let unallocatedMins = 24 * 60;
    if (activeTemplateId && templates) {
        const t = templates.find(temp => temp.id === activeTemplateId);
        if (t && t.blocks) {
            const intervals = (t.blocks || []).map((b: TemplateBlock) => [b.startTime ?? 0, (b.startTime ?? 0) + (b.duration || 0)]);
            intervals.sort((a, b) => a[0] - b[0]);

            let allocated = 0;
            let currentStart = -1;
            let currentEnd = -1;

            for (const [start, end] of (intervals as [number, number][])) {
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

    const formatDuration = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${h}h ${m}m`;
    };

    let displayedGoals = routineGoals.filter((g: RoutineGoal) => g.text.toLowerCase().includes(searchQuery.toLowerCase()));
    if (sortByName) {
        displayedGoals.sort((a, b) => a.text.localeCompare(b.text));
    }

    const isCustomColor = routineGoalForm.color && !PRESET_COLORS.some(c => c.toLowerCase() === routineGoalForm.color.toLowerCase());

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
                    onClick={openAddRoutineGoal} className="secondary"
                    style={{
                        width: '100%',
                        marginBottom: '16px',
                        display: 'flex',
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
                    onFilterClear={() => {}}
                />
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    overflowY: 'auto',
                    flex: 1,
                    padding: '8px 12px 8px 4px',
                    marginTop: '-8px'
                }}>
                    {displayedGoals.map(goal => {
                        const linkedCount = getLinkedCount(goal);
                        const hex = goal.color || '#eab308';
                        const bgStyle = getCardBgStyle(hex);

                        return (<div key={goal.id} className={`item-card ${goal.completed ? 'scratched' : ''}`} style={{
                            cursor: 'default',
                            position: 'relative',
                            minHeight: '48px',
                            padding: '10px 12px',
                            display: 'flex',
                            alignItems: 'center', ...bgStyle
                        }}>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%'
                            }}>
                                <div style={{
                                    display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: 0
                                }}>
                                    <input
                                        type="checkbox"
                                        className="checkbox-square"
                                        checked={goal.completed || false}
                                        onChange={() => toggleRoutineGoal(goal.id)}
                                        style={{ "--accent": hex, flexShrink: 0 } as React.CSSProperties}
                                    />
                                    <div style={{
                                        flex: 1,
                                        minWidth: 0,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center'
                                    }}>
                      <span className="item-title" style={{
                          color: hex,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontSize: '13px',
                          fontWeight: '500'
                      }} title={goal.text}>
                        {goal.text}
                      </span>
                                        {goal.desc && (<span style={{
                                            fontSize: '11px',
                                            color: 'var(--text-secondary)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            marginTop: '2px'
                                        }} title={goal.desc}>
                          {goal.desc}
                        </span>)}
                                    </div>
                                </div>
                                <div style={{display: 'flex', gap: '4px', flexShrink: 0, marginLeft: '4px'}}>
                                    <button className="icon-btn" onClick={() => openEditRoutineGoal(goal)}
                                            style={{padding: '4px'}}>
                                        <Pencil size={14}/>
                                    </button>
                                </div>
                            </div>

                            <div
                                onClick={() => onRoutineGoalBadgeClick && onRoutineGoalBadgeClick(goal.id)}
                                title="Filter Habits"
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
                                    boxShadow: linkedCount > 0 ? `0 4px 8px ${hex}4D` : '0 2px 8px rgba(255,255,255,0.4)',
                                    border: '2px solid var(--panel-bg)',
                                    zIndex: 10
                                }}>
                                {linkedCount}
                            </div>
                        </div>);
                    })}
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
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)'
                }}>
                    <Activity size={14} color="var(--accent)"/>
                    Routine Insights:
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '20px'}}>
                    <Clock size={14} color="var(--text-secondary)"/>
                    <span style={{fontSize: '12px', color: 'var(--text-secondary)'}}>Time left:</span>
                    <span style={{
                        fontSize: '13px', fontWeight: '600', color: '#fff'
                    }}>{formatDuration(unallocatedMins)}</span>
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
            >
                <form onSubmit={saveRoutineGoal} style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                    <div>
                        <label style={{
                            fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px'
                        }}>Goal Title</label>
                        <input
                            type="text" placeholder="e.g. Launch v2.0" value={routineGoalForm.text}
                            onChange={(e) => setRoutineGoalForm({...routineGoalForm, text: e.target.value})}
                            style={{width: '100%'}}
                        />
                    </div>
                    <div>
                        <label style={{
                            fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px'
                        }}>Goal Description <span style={{opacity: 0.5}}>(optional)</span></label>
                        <textarea
                            placeholder="Add more details about this goal..." value={routineGoalForm.desc}
                            onChange={(e) => setRoutineGoalForm({...routineGoalForm, desc: e.target.value})}
                            style={{width: '100%', minHeight: '80px', resize: 'vertical'}}
                        />
                    </div>

                    <div>
                        <label style={{
                            fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px'
                        }}>
                            Link to Life Goal <span style={{opacity: 0.5}}>(optional)</span>
                        </label>
                        <select
                            value={routineGoalForm.lifeGoalId}
                            onChange={(e) => setRoutineGoalForm({...routineGoalForm, lifeGoalId: e.target.value})}
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                fontSize: '14px',
                                background: 'var(--bg)',
                                border: '1px solid var(--panel-border)',
                                borderRadius: '8px',
                                color: '#fff'
                            }}
                        >
                            <option value="">No Life Goal Linked</option>
                            {(lifeGoals || []).map((lg: LifeGoal) => (<option key={lg.id} value={lg.id}>{lg.text}</option>))}
                        </select>
                    </div>

                    <div>
                        <label style={{
                            fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px'
                        }}>
                            Theme Color
                            {colorError && <span style={{color: '#ef4444', marginLeft: '8px'}}>{colorError}</span>}
                        </label>
                        <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center'}}>
                            {PRESET_COLORS.map(c => {
                                const isSelected = routineGoalForm.color && routineGoalForm.color.toLowerCase() === c.toLowerCase();
                                return (<button
                                    key={c}
                                    type="button"
                                    onClick={() => {
                                        setColorError('');
                                        setRoutineGoalForm({...routineGoalForm, color: c});
                                    }}
                                    style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        padding: 0,
                                        background: c,
                                        border: `2px solid ${isSelected ? '#fff' : 'transparent'}`,
                                        cursor: 'pointer',
                                        transition: 'transform 0.1s',
                                        transform: isSelected ? 'scale(1.1)' : 'scale(1)'
                                    }}
                                />);
                            })}

                            {/* Custom Color Picker */}
                            <div style={{
                                position: 'relative',
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: isCustomColor ? routineGoalForm.color : 'rgba(255, 255, 255, 0.1)',
                                border: `2px solid ${isCustomColor ? '#fff' : 'transparent'}`,
                                cursor: 'pointer',
                                transition: 'all 0.1s',
                                transform: isCustomColor ? 'scale(1.1)' : 'scale(1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: isCustomColor ? '#fff' : 'var(--text-secondary)'
                            }}>
                                {!isCustomColor && <Palette size={12}/>}
                                <input
                                    type="color"
                                    value={routineGoalForm.color ? routineGoalForm.color.toLowerCase() : '#ffffff'}
                                    onChange={handleColorChange}
                                    style={{
                                        position: 'absolute',
                                        top: '-10px',
                                        left: '-10px',
                                        width: '44px',
                                        height: '44px',
                                        cursor: 'pointer',
                                        opacity: 0
                                    }}
                                    title="Custom Color"
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{display: 'flex', gap: '8px', marginTop: '16px', width: '100%', padding: '8px 0'}}>
                        {editingRoutineGoalId && (<button type="button" onClick={() => {
                            deleteRoutineGoal(editingRoutineGoalId, routineGoalForm.text);
                            setShowRoutineGoalModal(false);
                        }} style={{
                            flex: '0 0 20%',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            padding: '10px 0',
                            borderRadius: '6px',
                            fontWeight: '500'
                        }}>Delete</button>)}
                        <button type="button" onClick={() => setShowRoutineGoalModal(false)} className="secondary"
                                style={{
                                    flex: editingRoutineGoalId ? '0 0 25%' : '0 0 30%',
                                    padding: '10px 0',
                                    borderRadius: '6px',
                                    fontWeight: '500'
                                }}>Cancel
                        </button>
                        <button type="submit" className="primary" style={{
                            flex: 1, padding: '10px 0', borderRadius: '6px', fontWeight: 'bold'
                        }}>{editingRoutineGoalId ? 'Update' : 'Save'}</button>
                    </div>
                </form>
            </BaseModal>

            {/* Confirm Modal */}
            {confirmConfig && (<ConfirmModal
                title={confirmConfig.title}
                message={confirmConfig.message}
                isDanger={confirmConfig.isDanger}
                onConfirm={confirmConfig.onConfirm}
                onCancel={confirmConfig.onCancel}
                image={undefined}
            />)}

        </div>);
}
