import * as React from 'react';
import { Plus, GripVertical, CheckCircle2, Clock, Copy, Pencil, ListTodo } from 'lucide-react';
import SearchSortBar from '../SearchSortBar';
import { getGoalColor, getCardBgStyle, parseDuration } from '../../utils';

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
    handleReorderDragStart?: (e: React.DragEvent, position: number) => void;
    handleReorderDragEnter?: (e: React.DragEvent, position: number) => void;
    handleReorderDragEnd?: () => void;
    dragItemIndex?: number | null;
    dragOverItemIndex?: number | null;
    toggleDailyGoal: (date: string, id: string) => void;
    duplicateHabit: (goal: any) => void;
    openEditHabit: (goal: any) => void;
    setConfirmConfig: (config: any) => void;
    habits: any[];
    setHabits: (h: any[]) => void;
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
    handleReorderDragStart,
    handleReorderDragEnter,
    handleReorderDragEnd,
    dragItemIndex,
    dragOverItemIndex,
    toggleDailyGoal,
    duplicateHabit,
    openEditHabit,
    setConfirmConfig,
    habits,
    setHabits
}: HabitListProps) {
    const getIsCompleted = (goal: any) => effectiveDate ? ((dailyLogs as any)?.[effectiveDate as string]?.[goal.id] || false) : (goal.completed || false);
    const activeGoals = displayedRoutineGoals.filter(g => !getIsCompleted(g));
    const completedGoals = displayedRoutineGoals.filter(g => getIsCompleted(g));

    const renderGoal = (goal: any) => {
        const isAddressed = checkRoutineAddressed(goal);
        const hexes = getGoalColor(goal, routineGoals, lifeGoals, moneyGoals);
        const hasColor = !!goal.color;
        const bgStyle = getCardBgStyle(hexes, hasColor);

        const baseMins = typeof goal.duration === 'number' && goal.duration > 0 ? goal.duration : (goal.time ? parseDuration(goal.time) : 0);
        let scheduledMins = 0;
        if (currentTemplate) {
            currentTemplate.blocks.forEach((b: any) => {
                if (String(b.routineGoalId) === String(goal.id)) scheduledMins += b.duration;
            });
        }
        const count = goalCounts[goal.id] || 0;
        const timeDiff = count > 0 ? (scheduledMins - (baseMins * count)) : 0;

        const isCompletedForView = getIsCompleted(goal);
        const isReorderable = !searchQuery && !sortByName && !effectiveDate;
        const absoluteIndex = (habits || []).findIndex((h: any) => h.id === goal.id);
        const isDragging = dragItemIndex === absoluteIndex;
        const isDragOver = dragOverItemIndex === absoluteIndex && dragItemIndex !== absoluteIndex;
        let dropDirection: 'up' | 'down' | undefined = undefined;
        if (isDragOver && dragItemIndex !== null && dragItemIndex !== undefined) {
            dropDirection = dragItemIndex > absoluteIndex ? 'up' : 'down';
        }

        return (<div
            key={goal.id}
            className={`item-card ${isCompletedForView ? 'scratched' : ''} ${isDragging ? 'dragging' : ''}`}
            draggable={!effectiveDate}
            onDragStart={!effectiveDate ? (e) => handleDragStart(e, goal) : undefined}
            onDragEnter={(e) => {
                if (isReorderable && handleReorderDragEnter && dragItemIndex !== null && dragItemIndex !== undefined) {
                    handleReorderDragEnter(e, absoluteIndex);
                }
            }}
            onDragOver={(e) => {
                if (dragItemIndex !== null && dragItemIndex !== undefined) {
                    e.preventDefault();
                }
            }}
            onDrop={(e) => {
                if (dragItemIndex !== null && dragItemIndex !== undefined) {
                    e.preventDefault();
                    handleReorderDragEnd?.();
                }
            }}
            onDragEnd={() => {
                if (dragItemIndex !== null && dragItemIndex !== undefined) {
                    handleReorderDragEnd?.();
                }
            }}
            style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                minHeight: '52px',
                padding: '8px 12px',
                opacity: isDragging ? 0.4 : 1,
                borderTop: isDragOver && dropDirection === 'up' ? `2px solid ${hexes[0] || 'var(--accent)'}` : 'none',
                borderBottom: isDragOver && dropDirection === 'down' ? `2px solid ${hexes[0] || 'var(--accent)'}` : 'none',
                transform: isDragOver && dropDirection === 'up' ? 'translateY(2px)' : (isDragOver && dropDirection === 'down' ? 'translateY(-2px)' : 'none'),
                transition: 'border 0.2s, transform 0.2s, opacity 0.2s',
                ...bgStyle
            }}
            title={goal.desc ? `${goal.name}\n\n${goal.desc}` : goal.name}
        >
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%'
            }}>
                <div style={{
                    display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: 0
                }}>
                    {!effectiveDate && (
                        <div
                            draggable={isReorderable}
                            onDragStart={(e) => {
                                e.stopPropagation();
                                const parent = e.currentTarget.closest('.item-card') as HTMLDivElement;
                                if (parent) e.dataTransfer.setDragImage(parent, 20, 20);
                                if (handleReorderDragStart) {
                                    handleReorderDragStart(e, absoluteIndex);
                                }
                            }}
                            style={{
                                cursor: isReorderable ? 'grab' : 'default',
                                display: 'flex',
                                alignItems: 'center',
                                flexShrink: 0,
                                touchAction: 'none'
                            }}
                            title={isReorderable ? 'Drag to reorder habit' : undefined}
                        >
                            <GripVertical
                                size={16}
                                color="var(--text-secondary)"
                                style={{
                                    flexShrink: 0,
                                    opacity: isReorderable ? 0.6 : 0.2
                                }}
                            />
                        </div>
                    )}
                    {effectiveDate ? (<input name="auto_field_28"
                                             type="checkbox"
                                             className="checkbox-square"
                                             style={{
                                                 flexShrink: 0, '--accent': hexes[0] || '#ffffff'
                                             } as React.CSSProperties}
                                             checked={isCompletedForView}
                                             onChange={() => toggleDailyGoal(effectiveDate as string, goal.id)}
                    />) : null}
                    <div style={{
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        justifyContent: 'center'
                    }}>
                        <div style={{display: 'flex', alignItems: 'flex-start', gap: '6px'}}>
      <span className="item-title" style={{
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          lineHeight: 1.4,
          color: '#fff',
          fontSize: '13px',
          fontWeight: '600'
      }}>
        {goal.name}
      </span>
                            {isAddressed && (<CheckCircle2 size={12} color={hexes[0] || '#ffffff'}
                                                           style={{
                                                               flexShrink: 0, marginTop: '2px'
                                                           }}/>)}
                        </div>

                        <div style={{
                            display: 'flex',
                            flexWrap: 'nowrap',
                            gap: '6px',
                            alignItems: 'center',
                            overflow: 'hidden'
                        }}>
                            {(goal.time || goal.duration) && (<div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                color: 'var(--text-secondary)',
                                fontSize: '11px',
                                whiteSpace: 'nowrap'
                            }}>
                                <Clock
                                    size={10}/> {goal.time || (typeof goal.duration === 'number' ? `${goal.duration}m` : goal.duration)}
                            </div>)}
                            {(goalCounts[goal.id] || 0) > 1 && (<div style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '2px 6px',
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '4px',
                                color: 'var(--text-secondary)',
                                fontSize: '10px',
                                fontWeight: 'bold'
                            }}>
                                x{goalCounts[goal.id] || 0}
                            </div>)}
                            {timeDiff !== 0 && (<div style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '2px 6px',
                                background: timeDiff > 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                borderRadius: '4px',
                                color: timeDiff > 0 ? '#4ade80' : '#f87171',
                                fontSize: '10px',
                                fontWeight: 'bold'
                            }}>
                                {timeDiff > 0 ? '+' : ''}{timeDiff}m
                            </div>)}
                        </div>
                    </div>
                </div>

                <div style={{
                    display: 'flex',
                    gap: '6px',
                    flexShrink: 0,
                    marginLeft: '6px',
                    alignItems: 'center'
                }}>
                    {!effectiveDate && (<>
                        <button className="icon-btn" onClick={(e) => {
                            e.stopPropagation();
                            duplicateHabit(goal);
                        }} style={{padding: '6px', cursor: 'pointer'}}>
                            <Copy size={14}/>
                        </button>
                        <button className="icon-btn"
                                onClick={() => openEditHabit(goal)}
                                style={{padding: '6px', cursor: 'pointer'}}>
                            <Pencil size={14}/>
                        </button>
                    </>)}
                </div>
            </div>
        </div>);
    };

    return (
        <>
            <button
                onClick={openAddHabit} className={`secondary ${isCalendarTab ? '' : 'desktop-only-btn'}`}
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
                <Plus size={16}/> Add Habit
            </button>

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
                    paddingRight: '4px'
                }}>

                {activeGoals.map(renderGoal)}
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
                    <div style={{flex: 1, height: '1px', background: 'var(--panel-border)'}}></div>
                    {!effectiveDate && (<button
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
                        }}>
                        Delete all
                    </button>)}
                </div>)}
                {completedGoals.map(renderGoal)}
                {displayedRoutineGoals.length === 0 && (<div style={{
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
                </div>)}
            </div>
        </>
    );
}
