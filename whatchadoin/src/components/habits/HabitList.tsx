import * as React from 'react';
import { Plus, CheckCircle2, Clock, Copy, Pencil, ListTodo, Package, ChevronDown, Check, Info } from 'lucide-react';
import SearchSortBar from '../SearchSortBar';
import OrderControls from '../OrderControls';
import BundlesSection from './BundlesSection';
import type { HabitBundle } from '../../types/routine';
import { moveItemRelativeTo } from '../../hooks/useDragReorder';
import { getGoalColor, getCardBgStyle, parseDuration, getEffectiveHabitBlocks } from '@/utils.ts';
import { formatTime } from '@/features/timeline/timeUtils';

interface HabitListProps {
    openAddHabit: () => void;
    isCalendarTab: boolean;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    sortByName: boolean;
    setSortByName: (sort: boolean) => void;
    habitFilterRoutineGoalId: string | null;
    setHabitFilterRoutineGoalId?: (id: string | null) => void;
    habitFilterLifeGoalId?: string | null;
    setHabitFilterLifeGoalId?: (id: string | null) => void;
    effectiveDate: string | null;
    dailyLogs: any;
    displayedRoutineGoals: any[];
    checkRoutineAddressed: (goal: any) => boolean;
    routineGoals: any[];
    lifeGoals: any[];
    moneyGoals: any[];
    currentTemplate: any;
    goalCounts: Record<string, number>;
    isRoutineDrawerOpen?: boolean;
    handleDragStart: (e: any, goal: any) => void;
    toggleDailyGoal: (date: string, id: string) => void;
    duplicateHabit: (goal: any) => void;
    openEditHabit: (goal: any) => void;
    setConfirmConfig: (config: any) => void;
    habits: any[];
    setHabits: (h: any[]) => void;
    onCardClick?: (habit: any) => void;
    habitBundles?: HabitBundle[];
    toggleBundleCompletion?: (bundle: HabitBundle) => void;
    openEditBundle?: (bundle: HabitBundle) => void;
    deleteBundle?: (bundle: HabitBundle) => void;
    openAddBundle?: () => void;
    handleDragStartBundle?: (e: any, bundle: HabitBundle) => void;
    isPublicView?: boolean;
    updateActiveRoutine?: (updates: any) => void;
}

export default function HabitList({
    openAddHabit,
    isCalendarTab,
    searchQuery,
    setSearchQuery,
    sortByName,
    setSortByName,
    habitFilterRoutineGoalId,
    setHabitFilterRoutineGoalId,
    habitFilterLifeGoalId,
    setHabitFilterLifeGoalId,
    effectiveDate,
    dailyLogs,
    displayedRoutineGoals,
    checkRoutineAddressed,
    routineGoals,
    lifeGoals,
    moneyGoals,
    currentTemplate,
    goalCounts,
    isRoutineDrawerOpen: _isRoutineDrawerOpen,
    handleDragStart,
    toggleDailyGoal,
    duplicateHabit,
    openEditHabit,
    setConfirmConfig,
    habits,
    setHabits,
    onCardClick,
    habitBundles,
    toggleBundleCompletion,
    openEditBundle,
    deleteBundle,
    openAddBundle,
    handleDragStartBundle,
    isPublicView,
    updateActiveRoutine
}: HabitListProps) {
    const [expandedHabitIds, setExpandedHabitIds] = React.useState<Record<string, boolean>>({});

    const toggleExpanded = (habitId: string) => {
        setExpandedHabitIds(prev => ({
            ...prev,
            [habitId]: !prev[habitId]
        }));
    };

    const matchingBlocksMap = React.useMemo(() => {
        if (!currentTemplate) return {};
        const eff = getEffectiveHabitBlocks(currentTemplate.blocks || []);
        const map: Record<string, any[]> = {};
        eff.forEach((b: any) => {
            if (!b.routineGoalId) return;
            const gId = String(b.routineGoalId);
            if (!map[gId]) map[gId] = [];
            map[gId].push(b);
        });
        Object.keys(map).forEach(gId => {
            map[gId]?.sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
        });
        return map;
    }, [currentTemplate]);

    const getInstanceKey = (b: any, index: number) => {
        return b.id ? `instance_${b.id}` : `instance_idx_${index}_${b.startTime}`;
    };

    const isInstanceCompleted = (b: any, index: number, goalId: string) => {
        if (!effectiveDate) return false;
        const dayLog = (dailyLogs as any)?.[effectiveDate as string] || {};
        if (dayLog[goalId] === true) return true;
        const key = getInstanceKey(b, index);
        return !!dayLog[key];
    };

    const getHabitProgress = (goalId: string, blocks: any[]) => {
        const total = blocks.length;
        if (total <= 1) {
            const isDone = effectiveDate ? !!((dailyLogs as any)?.[effectiveDate as string]?.[goalId]) : false;
            return { total, completed: isDone ? total : 0, remaining: isDone ? 0 : total, isComplete: isDone };
        }
        const dayLog = (dailyLogs as any)?.[effectiveDate as string] || {};
        if (dayLog[goalId] === true) {
            return { total, completed: total, remaining: 0, isComplete: true };
        }
        const completed = blocks.filter((b: any, idx: number) => !!dayLog[getInstanceKey(b, idx)]).length;
        const remaining = Math.max(0, total - completed);
        return {
            total,
            completed,
            remaining,
            isComplete: completed === total && total > 0
        };
    };

    const getIsCompleted = React.useCallback((goal: any) => {
        if (!effectiveDate) return !!goal.completed;
        const dayLog = (dailyLogs as any)?.[effectiveDate as string] || {};
        if (dayLog[goal.id] === true) return true;
        const blocks = matchingBlocksMap[String(goal.id)] || [];
        if (blocks.length > 1) {
            return blocks.every((b: any, idx: number) => !!dayLog[getInstanceKey(b, idx)]);
        }
        return !!dayLog[goal.id];
    }, [effectiveDate, dailyLogs, matchingBlocksMap]);

    const handleMasterToggle = (goal: any, blocks: any[]) => {
        if (!effectiveDate) return;

        if (blocks.length <= 1) {
            toggleDailyGoal(effectiveDate, goal.id);
            return;
        }

        if (updateActiveRoutine) {
            updateActiveRoutine({
                dailyLogs: (prevLogs: any) => {
                    const currentLogs = prevLogs || {};
                    const dayLog = { ...(currentLogs[effectiveDate] || {}) };
                    const isCurrentlyComplete = dayLog[goal.id] === true || (blocks.length > 1 && blocks.every((b: any, idx: number) => !!dayLog[getInstanceKey(b, idx)]));
                    const targetState = !isCurrentlyComplete;

                    if (targetState) {
                        dayLog[goal.id] = true;
                        blocks.forEach((b: any, idx: number) => {
                            dayLog[getInstanceKey(b, idx)] = true;
                        });
                    } else {
                        delete dayLog[goal.id];
                        blocks.forEach((b: any, idx: number) => {
                            delete dayLog[getInstanceKey(b, idx)];
                        });
                    }

                    return {
                        ...currentLogs,
                        [effectiveDate]: dayLog
                    };
                }
            });
        } else {
            toggleDailyGoal(effectiveDate, goal.id);
        }
    };

    const toggleInstance = (dateStr: string, goalId: string, targetBlock: any, targetIndex: number, blocks: any[]) => {
        if (updateActiveRoutine) {
            updateActiveRoutine({
                dailyLogs: (prevLogs: any) => {
                    const currentLogs = prevLogs || {};
                    const dayLog = { ...(currentLogs[dateStr] || {}) };
                    const targetKey = getInstanceKey(targetBlock, targetIndex);

                    const wasGoalComplete = dayLog[goalId] === true;
                    const wasInstanceComplete = wasGoalComplete || !!dayLog[targetKey];
                    const willBeInstanceComplete = !wasInstanceComplete;

                    if (wasGoalComplete) {
                        delete dayLog[goalId];
                        blocks.forEach((b: any, idx: number) => {
                            const key = getInstanceKey(b, idx);
                            if (key === targetKey) {
                                delete dayLog[key];
                            } else {
                                dayLog[key] = true;
                            }
                        });
                    } else {
                        if (willBeInstanceComplete) {
                            dayLog[targetKey] = true;
                        } else {
                            delete dayLog[targetKey];
                        }

                        const allDone = blocks.length > 0 && blocks.every((b: any, idx: number) => {
                            const key = getInstanceKey(b, idx);
                            if (key === targetKey) return willBeInstanceComplete;
                            return !!dayLog[key];
                        });

                        if (allDone) {
                            dayLog[goalId] = true;
                        } else {
                            delete dayLog[goalId];
                        }
                    }

                    return {
                        ...currentLogs,
                        [dateStr]: dayLog
                    };
                }
            });
        }
    };

    const activeGoals = displayedRoutineGoals.filter(g => !getIsCompleted(g));
    const completedGoals = displayedRoutineGoals.filter(g => getIsCompleted(g));

    const renderGoal = (goal: any, idx: number, list: any[]) => {
        const isAddressed = checkRoutineAddressed(goal);
        const hexes = getGoalColor(goal, routineGoals, lifeGoals, moneyGoals);
        const hasColor = !!goal.color;
        const bgStyle = getCardBgStyle(hexes, hasColor);

        const blocks = matchingBlocksMap[String(goal.id)] || [];
        const baseMins = typeof goal.duration === 'number' && goal.duration > 0 ? goal.duration : (goal.time ? parseDuration(goal.time) : 0);
        let scheduledMins = 0;
        blocks.forEach((b: any) => {
            scheduledMins += (b.duration || 0);
        });

        const totalInstances = Math.max(blocks.length, goalCounts[goal.id] || 0);
        const hasMultipleInstances = totalInstances > 1;
        const isMultiInstance = !!effectiveDate && hasMultipleInstances;
        const timeDiff = totalInstances > 0 ? (scheduledMins - (baseMins * totalInstances)) : 0;

        const isCompletedForView = getIsCompleted(goal);
        const isReorderable = !searchQuery && !sortByName;
        const isExpanded = isMultiInstance && !!expandedHabitIds[goal.id];
        const progress = getHabitProgress(goal.id, blocks);

        return (
            <div
                key={goal.id}
                className={`item-card ${isCompletedForView ? 'scratched' : ''} ${isExpanded ? 'is-expanded' : ''}`}
                draggable={!effectiveDate}
                onDragStart={!effectiveDate ? (e) => handleDragStart(e, goal) : undefined}
                style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: isExpanded ? 'flex-start' : 'center',
                    minHeight: '52px',
                    height: 'auto',
                    padding: '8px 12px',
                    boxSizing: 'border-box',
                    flexShrink: 0,
                    transition: 'background-color 0.2s, border-color 0.2s, box-shadow 0.2s',
                    ...bgStyle
                }}
                title={goal.desc ? `${goal.name}\n\n${goal.desc}` : goal.name}
            >
                {/* Main Card Header Row */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    gap: '8px'
                }}>
                    <div style={{
                        display: 'flex', gap: '8px', alignItems: 'center', flex: 1, minWidth: 0
                    }}>
                        <OrderControls
                            canMoveUp={idx > 0}
                            canMoveDown={idx < list.length - 1}
                            onMoveUp={() => setHabits(moveItemRelativeTo(habits, goal, list[idx - 1], 'before'))}
                            onMoveDown={() => setHabits(moveItemRelativeTo(habits, goal, list[idx + 1], 'after'))}
                            disabled={!isReorderable}
                        />

                        {effectiveDate ? (
                            <input
                                name="auto_field_28"
                                type="checkbox"
                                className="checkbox-square"
                                style={{
                                    flexShrink: 0, '--accent': hexes[0] || '#ffffff', cursor: 'pointer'
                                } as React.CSSProperties}
                                checked={isCompletedForView}
                                onChange={() => handleMasterToggle(goal, blocks)}
                                title={isMultiInstance ? (isCompletedForView ? 'Mark all undone' : 'Mark all complete') : undefined}
                            />
                        ) : null}

                        {/* Title and details column - in mark habits toggles accordion/master; in habits view opens info modal */}
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isMultiInstance) {
                                    toggleExpanded(goal.id);
                                } else if (!effectiveDate) {
                                    if (onCardClick) onCardClick(goal);
                                } else {
                                    handleMasterToggle(goal, blocks);
                                }
                            }}
                            style={{
                                flex: 1,
                                minWidth: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '3px',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                userSelect: 'none'
                            }}
                        >
                            <div style={{display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0}}>
                                <span className="item-title" style={{
                                    wordBreak: 'break-word',
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: 1.3,
                                    color: '#fff',
                                    fontSize: '13px',
                                    fontWeight: '600'
                                }}>
                                    {goal.name}
                                </span>
                                {isAddressed && (
                                    <CheckCircle2
                                        size={12}
                                        color={hexes[0] || '#ffffff'}
                                        style={{ flexShrink: 0 }}
                                    />
                                )}
                            </div>

                            <div style={{
                                display: 'flex',
                                flexWrap: 'nowrap',
                                gap: '6px',
                                alignItems: 'center',
                                overflow: 'hidden'
                            }}>
                                {(goal.time || goal.duration) && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        color: 'var(--text-secondary)',
                                        fontSize: '11px',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        <Clock size={10}/> {goal.time || (typeof goal.duration === 'number' ? `${goal.duration}m` : goal.duration)}
                                    </div>
                                )}

                                {hasMultipleInstances && (
                                    effectiveDate ? (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleExpanded(goal.id);
                                            }}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '3px',
                                                padding: '1px 6px',
                                                background: progress.completed > 0 
                                                    ? (progress.remaining === 0 ? 'rgba(34, 197, 94, 0.22)' : 'rgba(16, 185, 129, 0.18)')
                                                    : 'rgba(255, 255, 255, 0.08)',
                                                border: `1px solid ${progress.completed > 0 
                                                    ? (progress.remaining === 0 ? 'rgba(34, 197, 94, 0.4)' : 'rgba(16, 185, 129, 0.35)')
                                                    : 'rgba(255, 255, 255, 0.12)'}`,
                                                borderRadius: '10px',
                                                color: progress.completed > 0 ? '#6ee7b7' : 'var(--text-secondary)',
                                                fontSize: '10px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                            title={`Accordion: ${progress.completed}/${totalInstances} completed (${progress.remaining} left)`}
                                        >
                                            <span>
                                                x{progress.remaining > 0 ? progress.remaining : totalInstances}
                                            </span>
                                            {progress.remaining === 0 ? (
                                                <Check size={9} strokeWidth={3} />
                                            ) : (
                                                <span style={{ fontSize: '9px', opacity: 0.8, fontWeight: 'normal' }}>
                                                    left
                                                </span>
                                            )}
                                        </button>
                                    ) : (
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onCardClick) onCardClick(goal);
                                            }}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                padding: '1px 6px',
                                                background: 'rgba(255, 255, 255, 0.08)',
                                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                                borderRadius: '10px',
                                                color: 'var(--text-secondary)',
                                                fontSize: '10px',
                                                fontWeight: 'bold',
                                                cursor: onCardClick ? 'pointer' : 'default'
                                            }}
                                            title={`${totalInstances} scheduled instances in template`}
                                        >
                                            x{totalInstances}
                                        </div>
                                    )
                                )}

                                {timeDiff !== 0 && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '1px 5px',
                                        background: timeDiff > 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                        borderRadius: '4px',
                                        color: timeDiff > 0 ? '#4ade80' : '#f87171',
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {timeDiff > 0 ? '+' : ''}{timeDiff}m
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions and Accordion Chevron on the Right */}
                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        flexShrink: 0,
                        alignItems: 'center'
                    }}>
                        {/* Dedicated Accordion Chevron for multi-instance habits */}
                        {isMultiInstance && (
                            <button
                                type="button"
                                className="icon-btn accordion-toggle-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpanded(goal.id);
                                }}
                                style={{
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: '5px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: isExpanded ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    cursor: 'pointer',
                                    color: isExpanded ? '#fff' : 'var(--text-secondary)',
                                    transition: 'all 0.2s ease',
                                    padding: 0
                                }}
                                title={isExpanded ? "Collapse instances" : `Expand ${totalInstances} instances`}
                            >
                                <ChevronDown
                                    size={15}
                                    style={{
                                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }}
                                />
                            </button>
                        )}

                        {onCardClick && !effectiveDate && (
                            <button
                                className="icon-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCardClick(goal);
                                }}
                                style={{padding: '5px', cursor: 'pointer'}}
                                title="View details"
                            >
                                <Info size={13}/>
                            </button>
                        )}

                        <button className="icon-btn desktop-only-btn" onClick={(e) => {
                            e.stopPropagation();
                            duplicateHabit(goal);
                        }} style={{padding: '5px', cursor: 'pointer'}} title="Duplicate habit">
                            <Copy size={13}/>
                        </button>
                        <button className="icon-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openEditHabit(goal);
                                }}
                                style={{padding: '5px', cursor: 'pointer'}} title="Edit habit">
                            <Pencil size={13}/>
                        </button>
                    </div>
                </div>

                {/* Accordion Drawer Content */}
                {isExpanded && isMultiInstance && (
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            marginTop: '10px',
                            padding: '10px 12px',
                            background: '#161c23',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.25)',
                            position: 'relative',
                            zIndex: 2
                        }}
                    >
                        {/* Drawer Header with Progress Bar */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '4px',
                            paddingBottom: '6px',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '11px',
                                color: 'var(--text-secondary)',
                                fontWeight: 600,
                                letterSpacing: '0.2px',
                                textTransform: 'uppercase'
                            }}>
                                <Clock size={11} style={{ opacity: 0.7 }} />
                                <span>Instances ({progress.completed}/{totalInstances})</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                    width: '45px',
                                    height: '5px',
                                    borderRadius: '3px',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${totalInstances > 0 ? (progress.completed / totalInstances) * 100 : 0}%`,
                                        height: '100%',
                                        background: progress.completed === totalInstances ? '#22c55e' : (hexes[0] || 'var(--accent)'),
                                        transition: 'width 0.25s ease'
                                    }} />
                                </div>
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: progress.remaining > 0 ? '#34d399' : 'var(--text-secondary)'
                                }}>
                                    {progress.remaining > 0 ? `${progress.remaining} left` : 'All Done ✓'}
                                </span>
                            </div>
                        </div>

                        {/* List of Instance Blocks */}
                        {blocks.map((b: any, bIdx: number) => {
                            const isInstDone = isInstanceCompleted(b, bIdx, goal.id);
                            const startStr = formatTime(b.startTime);
                            const endStr = formatTime((b.startTime + b.duration) % 1440);

                            return (
                                <div
                                    key={b.id ? `inst-${b.id}` : `inst-${bIdx}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (effectiveDate) {
                                            toggleInstance(effectiveDate, goal.id, b, bIdx, blocks);
                                        }
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '7px 10px',
                                        borderRadius: '6px',
                                        background: isInstDone ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)',
                                        border: `1px solid ${isInstDone ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.07)'}`,
                                        cursor: effectiveDate ? 'pointer' : 'default',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                                        {effectiveDate && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleInstance(effectiveDate, goal.id, b, bIdx, blocks);
                                                }}
                                                style={{
                                                    width: '18px',
                                                    height: '18px',
                                                    borderRadius: '4px',
                                                    border: `1.5px solid ${isInstDone ? (hexes[0] || 'var(--accent)') : 'rgba(255, 255, 255, 0.3)'}`,
                                                    background: isInstDone ? (hexes[0] || 'var(--accent)') : 'transparent',
                                                    color: isInstDone ? '#000' : 'transparent',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    padding: 0,
                                                    flexShrink: 0,
                                                    transition: 'all 0.15s ease'
                                                }}
                                                title={isInstDone ? "Mark incomplete" : "Mark instance complete"}
                                            >
                                                <Check size={12} strokeWidth={3} />
                                            </button>
                                        )}

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flexWrap: 'wrap' }}>
                                            <span style={{
                                                fontSize: '12px',
                                                color: isInstDone ? 'var(--text-secondary)' : '#ffffff',
                                                textDecoration: isInstDone ? 'line-through' : 'none',
                                                fontWeight: isInstDone ? 'normal' : '500',
                                                opacity: isInstDone ? 0.65 : 1
                                            }}>
                                                {startStr} – {endStr}
                                            </span>

                                            {b.bundleName && (
                                                <span style={{
                                                    fontSize: '10px',
                                                    padding: '1px 5px',
                                                    borderRadius: '3px',
                                                    background: 'rgba(255,255,255,0.08)',
                                                    color: 'var(--text-secondary)',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {b.bundleName}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                        <span style={{
                                            fontSize: '11px',
                                            color: 'var(--text-secondary)',
                                            padding: '1px 5px',
                                            borderRadius: '3px',
                                            background: 'rgba(255,255,255,0.04)'
                                        }}>
                                            {b.duration}m
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexShrink: 0 }}>
                <button
                    onClick={openAddHabit} className={`secondary ${isCalendarTab ? '' : 'desktop-only-btn'}`}
                    style={{
                        flex: 1,
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '10px',
                        borderStyle: 'dashed'
                    }}
                >
                    <Plus size={15}/> Add Habit
                </button>
                {openAddBundle && (
                    <button
                        onClick={openAddBundle} className={`secondary ${isCalendarTab ? '' : 'desktop-only-btn'}`}
                        style={{
                            flex: 1,
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '10px',
                            borderStyle: 'dashed',
                            borderColor: 'var(--accent)',
                            color: 'var(--accent)'
                        }}
                    >
                        <Package size={15}/> Add Bundle
                    </button>
                )}
            </div>

            <SearchSortBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                sortByName={sortByName}
                setSortByName={setSortByName}
                isFilterActive={!!habitFilterRoutineGoalId || !!habitFilterLifeGoalId}
                onFilterClear={() => {
                    if (setHabitFilterRoutineGoalId) setHabitFilterRoutineGoalId(null);
                    if (setHabitFilterLifeGoalId) setHabitFilterLifeGoalId(null);
                }}
            />

            <div
                className="habits-list-scroll-container"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    overflowY: 'auto',
                    flex: 1,
                    minHeight: 0,
                    paddingRight: '4px'
                }}>

                {habitBundles && (
                    <BundlesSection
                        bundles={habitBundles}
                        habits={habits}
                        effectiveDate={effectiveDate}
                        dailyLogs={dailyLogs}
                        toggleBundleCompletion={toggleBundleCompletion || (() => {})}
                        openEditBundle={openEditBundle || (() => {})}
                        deleteBundle={deleteBundle || (() => {})}
                        onDragStartBundle={handleDragStartBundle || (() => {})}
                        isPublicView={isPublicView}
                        openAddBundle={openAddBundle || (() => {})}
                    />
                )}

                {activeGoals.map((g, idx) => renderGoal(g, idx, activeGoals))}
                {completedGoals.length > 0 && (
                    <div style={{
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
                        <div style={{flex: 1, height: '1px', background: 'var(--panel-border)'}}></div>
                        {!effectiveDate && (
                            <button
                                onClick={() => {
                                    setConfirmConfig({
                                        title: 'Delete All Completed',
                                        message: 'Are you sure you want to delete all completed habits? This cannot be undone.',
                                        isDanger: true,
                                        onConfirm: () => {
                                            setHabits(habits.filter((g: any) => !g.completed));
                                            setConfirmConfig(null);
                                        },
                                        onCancel: () => setConfirmConfig(null)
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
                        )}
                    </div>
                )}
                {completedGoals.map((g, idx) => renderGoal(g, idx, completedGoals))}
                {displayedRoutineGoals.length === 0 && (
                    <div style={{
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
                        <ListTodo size={32}
                                  style={{marginBottom: '12px', opacity: 0.5, color: 'var(--accent)'}}/>
                        <div style={{fontSize: '14px', fontWeight: '500', color: '#fff'}}>
                            {effectiveDate ? 'No habits scheduled for this day' : 'No goals yet'}
                        </div>
                        <div style={{fontSize: '12px', marginTop: '4px', opacity: 0.7}}>
                            {effectiveDate ? 'Assign a template with habits to this day in My Day.' : 'Start adding goals and drag them to schedule.'}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
