import * as React from 'react';
import { useState } from 'react';
import { Clock, Pencil, Trash2 } from 'lucide-react';
import { calcDurationMinutes, formatDuration, formatTime12h } from '../../utils';

interface TimelogViewProps {
    isCalendarTab: boolean;
    timelogDate: string;
    dayTimeLogs: any[];
    allGoals: any[];
    currentTimeLogs: Record<string, any[]>;
    updateActiveRoutine?: (updates: any) => void;
    formatHeaderDate: (dateString: string) => string;
    setConfirmConfig: (config: any) => void;
}

export default function TimelogView({
    isCalendarTab,
    timelogDate,
    dayTimeLogs,
    allGoals,
    currentTimeLogs,
    updateActiveRoutine,
    formatHeaderDate,
    setConfirmConfig
}: TimelogViewProps) {
    const [timeLogForm, setTimeLogForm] = useState<{
        startTime: string; endTime: string; tagGoalId: string; desc: string;
    }>({
        startTime: '', endTime: '', tagGoalId: '', desc: ''
    });
    const [editingTimeLogId, setEditingTimeLogId] = useState<string | null>(null);

    const handlePreFillNow = () => {
        const now = new Date();
        const curH = String(now.getHours()).padStart(2, '0');
        const curM = String(now.getMinutes()).padStart(2, '0');
        const nowStr = `${curH}:${curM}`;

        let newStart = timeLogForm.startTime;
        if (!newStart) {
            if (dayTimeLogs.length > 0) {
                const sortedLogs = [...dayTimeLogs].sort((a, b) => a.startTime.localeCompare(b.startTime));
                const lastLog = sortedLogs[sortedLogs.length - 1];
                if (lastLog && lastLog.endTime) {
                    newStart = lastLog.endTime;
                }
            }
            if (!newStart) {
                const prev = new Date(now.getTime() - 60 * 60 * 1000);
                newStart = `${String(prev.getHours()).padStart(2, '0')}:${String(prev.getMinutes()).padStart(2, '0')}`;
            }
        }
        setTimeLogForm(prev => ({
            ...prev, startTime: newStart, endTime: nowStr
        }));
    };

    const handleSaveTimeLog = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!timeLogForm.startTime || !timeLogForm.endTime) return;

        let selectedGoal = null;
        if (timeLogForm.tagGoalId) {
            selectedGoal = allGoals.find(g => String(g.id) === String(timeLogForm.tagGoalId) || g.name === timeLogForm.tagGoalId);
        }

        const tagData = selectedGoal ? {
            tagGoalId: selectedGoal.id,
            tagName: selectedGoal.name,
            tagColor: selectedGoal.color || 'var(--accent)',
            tagType: selectedGoal.type
        } : {};

        let updatedDay: any[];
        if (editingTimeLogId) {
            updatedDay = dayTimeLogs.map(entry => {
                if (entry.id === editingTimeLogId) {
                    return {
                        ...entry,
                        startTime: timeLogForm.startTime,
                        endTime: timeLogForm.endTime,
                        desc: timeLogForm.desc.trim(), ...tagData,
                        tagGoalId: selectedGoal ? selectedGoal.id : undefined,
                        tagName: selectedGoal ? selectedGoal.name : undefined,
                        tagColor: selectedGoal ? (selectedGoal.color || 'var(--accent)') : undefined,
                        tagType: selectedGoal ? selectedGoal.type : undefined
                    };
                }
                return entry;
            });
        } else {
            const newLog = {
                id: `tl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                startTime: timeLogForm.startTime,
                endTime: timeLogForm.endTime,
                desc: timeLogForm.desc.trim(), ...tagData,
                createdAt: Date.now()
            };
            updatedDay = [...dayTimeLogs, newLog];
        }

        updatedDay.sort((a, b) => a.startTime.localeCompare(b.startTime));
        const updatedTimeLogs = {
            ...currentTimeLogs, [timelogDate]: updatedDay
        };

        if (updateActiveRoutine) {
            updateActiveRoutine({timeLogs: updatedTimeLogs});
        }

        setTimeLogForm({
            startTime: timeLogForm.endTime, endTime: '', tagGoalId: '', desc: ''
        });
        setEditingTimeLogId(null);
    };

    const handleEditTimeLog = (log: any) => {
        setEditingTimeLogId(log.id);
        setTimeLogForm({
            startTime: log.startTime || '',
            endTime: log.endTime || '',
            tagGoalId: log.tagGoalId || log.tagName || '',
            desc: log.desc || ''
        });
    };

    const handleCancelEdit = () => {
        setEditingTimeLogId(null);
        setTimeLogForm({
            startTime: '', endTime: '', tagGoalId: '', desc: ''
        });
    };

    const handleDeleteTimeLog = (id: string) => {
        setConfirmConfig({
            title: 'Delete Time Log',
            message: 'Are you sure you want to delete this time log entry?',
            isDanger: true,
            onConfirm: () => {
                const updatedDay = dayTimeLogs.filter((entry: any) => entry.id !== id);
                const updatedTimeLogs = {
                    ...currentTimeLogs, [timelogDate]: updatedDay
                };
                if (updateActiveRoutine) {
                    updateActiveRoutine({timeLogs: updatedTimeLogs});
                }
                if (editingTimeLogId === id) {
                    handleCancelEdit();
                }
                setConfirmConfig(null);
            },
            onCancel: () => setConfirmConfig(null)
        });
    };

    return (
        <div className="timelog-tab-container" style={{
            flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0
        }}>
            {/* Inline Quick Form */}
            <form
                onSubmit={handleSaveTimeLog}
                className="timelog-inline-form"
                style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '12px',
                    padding: '12px',
                    marginBottom: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    flexShrink: 0
                }}
            >
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <span style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: 'var(--accent)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        {editingTimeLogId ? 'Edit Time Log' : 'Quick Log Time'}
                    </span>
                    <span style={{fontSize: '11px', color: 'var(--text-secondary)'}}>
                        {isCalendarTab ? formatHeaderDate(timelogDate) : `Today (${formatHeaderDate(timelogDate)})`}
                    </span>
                </div>

                {/* Row 1: Start Time, End Time, Now Button */}
                <div style={{display: 'flex', alignItems: 'flex-end', gap: '8px'}}>
                    <div style={{flex: 1, minWidth: 0}}>
                        <label htmlFor="timelog-start-time" style={{
                            fontSize: '10px',
                            fontWeight: '600',
                            color: 'var(--text-secondary)',
                            textTransform: 'uppercase',
                            marginBottom: '4px',
                            display: 'block'
                        }}>
                            Start
                        </label>
                        <input
                            id="timelog-start-time"
                            type="time"
                            value={timeLogForm.startTime}
                            onChange={e => setTimeLogForm(prev => ({...prev, startTime: e.target.value}))}
                            style={{width: '100%', padding: '6px 8px', fontSize: '13px', borderRadius: '6px'}}
                            required
                        />
                    </div>
                    <div style={{flex: 1, minWidth: 0}}>
                        <label htmlFor="timelog-end-time" style={{
                            fontSize: '10px',
                            fontWeight: '600',
                            color: 'var(--text-secondary)',
                            textTransform: 'uppercase',
                            marginBottom: '4px',
                            display: 'block'
                        }}>
                            End
                        </label>
                        <input
                            id="timelog-end-time"
                            type="time"
                            value={timeLogForm.endTime}
                            onChange={e => setTimeLogForm(prev => ({...prev, endTime: e.target.value}))}
                            style={{width: '100%', padding: '6px 8px', fontSize: '13px', borderRadius: '6px'}}
                            required
                        />
                    </div>
                    <button
                        type="button"
                        className="secondary"
                        onClick={handlePreFillNow}
                        style={{
                            padding: '7px 10px',
                            fontSize: '12px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap',
                            height: '34px',
                            flexShrink: 0
                        }}
                        title="Fill with current time"
                    >
                        <Clock size={12}/> Now
                    </button>
                </div>

                {/* Row 2: Tag selector */}
                <div>
                    <label htmlFor="timelog-tag-goal" style={{
                        fontSize: '10px',
                        fontWeight: '600',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        marginBottom: '4px',
                        display: 'block'
                    }}>
                        Tag Goal / Habit (Optional)
                    </label>
                    <select
                        id="timelog-tag-goal"
                        value={timeLogForm.tagGoalId}
                        onChange={e => setTimeLogForm(prev => ({...prev, tagGoalId: e.target.value}))}
                        style={{
                            width: '100%',
                            padding: '8px 10px',
                            fontSize: '13px',
                            borderRadius: '6px',
                            background: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid var(--panel-border)',
                            color: '#fff',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="">No Tag (General)</option>
                        {allGoals.map(g => (<option key={String(g.id || g.name)} value={String(g.id || '')}>
                            [{g.type}] {g.name}
                        </option>))}
                    </select>
                </div>

                {/* Row 3: Description input & Submit button */}
                <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                    <input
                        id="timelog-desc"
                        type="text"
                        aria-label="Time log activity description"
                        placeholder="What did you do? (e.g. read 20 pages)"
                        value={timeLogForm.desc}
                        onChange={e => setTimeLogForm(prev => ({...prev, desc: e.target.value}))}
                        style={{
                            flex: 1, minWidth: 0, padding: '8px 10px', fontSize: '13px', borderRadius: '6px'
                        }}
                    />
                    <button
                        type="submit"
                        className="primary"
                        disabled={!timeLogForm.startTime || !timeLogForm.endTime}
                        style={{
                            padding: '8px 14px',
                            fontSize: '13px',
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                            opacity: (!timeLogForm.startTime || !timeLogForm.endTime) ? 0.5 : 1,
                            cursor: (!timeLogForm.startTime || !timeLogForm.endTime) ? 'not-allowed' : 'pointer',
                            flexShrink: 0
                        }}
                    >
                        {editingTimeLogId ? 'Update' : '+ Log'}
                    </button>
                    {editingTimeLogId && (<button
                        type="button"
                        className="secondary"
                        onClick={handleCancelEdit}
                        style={{padding: '8px 10px', fontSize: '12px', flexShrink: 0}}
                    >
                        Cancel
                    </button>)}
                </div>
            </form>

            {/* Scrollable Logs List */}
            <div
                className="timelog-list-scroll-container"
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    overflowY: 'auto',
                    paddingRight: '4px',
                    minHeight: 0
                }}
            >
                {dayTimeLogs.length === 0 ? (<div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '36px 16px',
                    color: 'var(--text-secondary)',
                    textAlign: 'center',
                    border: '1px dashed var(--panel-border)',
                    borderRadius: '12px',
                    marginTop: '8px'
                }}>
                    <Clock size={28} style={{marginBottom: '8px', opacity: 0.5, color: 'var(--accent)'}}/>
                    <div style={{fontSize: '13px', fontWeight: '500', color: '#fff'}}>No time logs for this
                        date
                    </div>
                    <div style={{fontSize: '11px', marginTop: '4px', opacity: 0.7}}>Fill out the quick form
                        above to log your time.
                    </div>
                </div>) : (dayTimeLogs.map(log => {
                    const durationMins = calcDurationMinutes(log.startTime, log.endTime);
                    return (<div
                        key={log.id}
                        className="item-card"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            gap: '10px',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--panel-border)',
                            borderLeft: log.tagColor ? `4px solid ${log.tagColor}` : '4px solid var(--accent)'
                        }}
                    >
                        <div style={{
                            display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0
                        }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap'
                            }}>
                                <span style={{
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    color: '#fff',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {formatTime12h(log.startTime)} – {formatTime12h(log.endTime)}
                                </span>
                                <span style={{
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    color: 'var(--text-secondary)',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {formatDuration(durationMins)}
                                </span>
                                {log.tagName && (<span style={{
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    background: `${log.tagColor || 'var(--accent)'}22`,
                                    color: log.tagColor || 'var(--accent)',
                                    border: `1px solid ${log.tagColor || 'var(--accent)'}44`,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: '160px'
                                }}>
                                    {log.tagName}
                                </span>)}
                            </div>
                            {log.desc && (<div style={{
                                fontSize: '13px',
                                color: '#fff',
                                wordBreak: 'break-word',
                                opacity: 0.9,
                                lineHeight: 1.4
                            }}>
                                {log.desc}
                            </div>)}
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0}}>
                            <button
                                type="button"
                                className="icon-btn"
                                onClick={() => handleEditTimeLog(log)}
                                style={{padding: '6px', cursor: 'pointer'}}
                                title="Edit Log"
                            >
                                <Pencil size={13}/>
                            </button>
                            <button
                                type="button"
                                className="icon-btn"
                                onClick={() => handleDeleteTimeLog(log.id)}
                                style={{padding: '6px', cursor: 'pointer', color: 'var(--danger)'}}
                                title="Delete Log"
                            >
                                <Trash2 size={13}/>
                            </button>
                        </div>
                    </div>);
                }))}
                <div style={{height: '16px'}}/>
            </div>
        </div>
    );
}
