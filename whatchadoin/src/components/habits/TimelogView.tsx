import * as React from 'react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Clock, Pencil, Trash2, Search, X, ChevronDown, Check } from 'lucide-react';
import { calcDurationMinutes, formatDuration, formatTime12h } from '../../utils';
import { fuzzyMatchScore } from '../Dropdown';
import SearchSortBar from '../SearchSortBar';

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

function getTagBadgeStyle(type?: string) {
    switch (type) {
        case 'Routine Goal':
            return {
                color: 'var(--accent)',
                bg: 'rgba(234, 179, 8, 0.15)',
                border: 'rgba(234, 179, 8, 0.3)'
            };
        case 'Habit':
            return {
                color: '#60a5fa',
                bg: 'rgba(59, 130, 246, 0.15)',
                border: 'rgba(59, 130, 246, 0.3)'
            };
        case 'Life Goal':
            return {
                color: '#c084fc',
                bg: 'rgba(168, 85, 247, 0.15)',
                border: 'rgba(168, 85, 247, 0.3)'
            };
        case 'Money Goal':
            return {
                color: '#34d399',
                bg: 'rgba(16, 185, 129, 0.15)',
                border: 'rgba(16, 185, 129, 0.3)'
            };
        default:
            return {
                color: '#94a3b8',
                bg: 'rgba(100, 116, 139, 0.15)',
                border: 'rgba(100, 116, 139, 0.3)'
            };
    }
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

    // Search bar state for Tag / Goal / Habit in quick form
    const [tagSearchQuery, setTagSearchQuery] = useState('');
    const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
    const [highlightedTagIndex, setHighlightedTagIndex] = useState(0);

    // Search bar state for logged entries list
    const [logSearchQuery, setLogSearchQuery] = useState('');

    const tagSelectorRef = useRef<HTMLDivElement>(null);
    const tagInputRef = useRef<HTMLInputElement>(null);
    const tagMenuRef = useRef<HTMLDivElement>(null);
    const tagItemRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Determine current selected goal object
    const selectedGoal = useMemo(() => {
        if (!timeLogForm.tagGoalId) return null;
        return allGoals.find(g => String(g.id) === String(timeLogForm.tagGoalId) || g.name === timeLogForm.tagGoalId) || null;
    }, [allGoals, timeLogForm.tagGoalId]);

    // Viewport coordinates for portaled tag dropdown
    const [tagCoords, setTagCoords] = useState<{
        left: number;
        top: number;
        width: number;
        openUpwards: boolean;
        maxHeight: number;
    } | null>(null);

    const updateTagCoords = () => {
        if (tagSelectorRef.current) {
            const rect = tagSelectorRef.current.getBoundingClientRect();
            const menuMaxHeight = 240;
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const openUpwards = spaceBelow < menuMaxHeight && spaceAbove > spaceBelow;
            const availableHeight = openUpwards ? spaceAbove - 16 : spaceBelow - 16;
            const maxHeight = Math.max(120, Math.min(menuMaxHeight, availableHeight));

            setTagCoords({
                left: rect.left,
                top: openUpwards ? rect.top - 4 : rect.bottom + 4,
                width: rect.width,
                openUpwards,
                maxHeight
            });
        }
    };

    useEffect(() => {
        if (isTagDropdownOpen) {
            updateTagCoords();
            window.addEventListener('resize', updateTagCoords);
            window.addEventListener('scroll', updateTagCoords, true);
            return () => {
                window.removeEventListener('resize', updateTagCoords);
                window.removeEventListener('scroll', updateTagCoords, true);
            };
        }
    }, [isTagDropdownOpen]);

    // Close tag dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (tagSelectorRef.current && !tagSelectorRef.current.contains(event.target as Node)) {
                if (tagMenuRef.current && !tagMenuRef.current.contains(event.target as Node)) {
                    setIsTagDropdownOpen(false);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter goals based on tagSearchQuery
    const filteredGoals = useMemo(() => {
        if (!tagSearchQuery.trim()) {
            return allGoals;
        }
        const scored = allGoals.map(g => {
            const textToSearch = `[${g.type || ''}] ${g.name || ''}`;
            const score = Math.max(
                fuzzyMatchScore(tagSearchQuery, textToSearch),
                fuzzyMatchScore(tagSearchQuery, g.name || '')
            );
            return { g, score };
        }).filter(item => item.score > 0);

        scored.sort((a, b) => b.score - a.score);
        return scored.map(item => item.g);
    }, [allGoals, tagSearchQuery]);

    // Reset highlight index when query or open state changes
    useEffect(() => {
        setHighlightedTagIndex(0);
    }, [tagSearchQuery, isTagDropdownOpen]);

    // Scroll highlighted item into view
    useEffect(() => {
        if (isTagDropdownOpen && tagItemRefs.current[highlightedTagIndex]) {
            tagItemRefs.current[highlightedTagIndex]?.scrollIntoView({ block: 'nearest' });
        }
    }, [highlightedTagIndex, isTagDropdownOpen]);

    const handleSelectGoal = (goal: any | null) => {
        setTimeLogForm(prev => ({
            ...prev,
            tagGoalId: goal ? String(goal.id || goal.name) : ''
        }));
        setIsTagDropdownOpen(false);
        setTagSearchQuery('');
    };

    const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Total options in dropdown: 1 (No Tag) + filteredGoals.length
        const totalItems = 1 + filteredGoals.length;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isTagDropdownOpen) {
                setIsTagDropdownOpen(true);
            } else {
                setHighlightedTagIndex(prev => (prev + 1) % totalItems);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!isTagDropdownOpen) {
                setIsTagDropdownOpen(true);
            } else {
                setHighlightedTagIndex(prev => (prev - 1 + totalItems) % totalItems);
            }
        } else if (e.key === 'Enter') {
            if (isTagDropdownOpen) {
                e.preventDefault();
                if (highlightedTagIndex === 0) {
                    handleSelectGoal(null);
                } else if (filteredGoals[highlightedTagIndex - 1]) {
                    handleSelectGoal(filteredGoals[highlightedTagIndex - 1]);
                }
            }
        } else if (e.key === 'Escape' || e.key === 'Tab') {
            setIsTagDropdownOpen(false);
        }
    };

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

        let selected = null;
        if (timeLogForm.tagGoalId) {
            selected = allGoals.find(g => String(g.id) === String(timeLogForm.tagGoalId) || g.name === timeLogForm.tagGoalId);
        }

        const tagData = selected ? {
            tagGoalId: selected.id,
            tagName: selected.name,
            tagColor: selected.color || 'var(--accent)',
            tagType: selected.type
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
                        tagGoalId: selected ? selected.id : undefined,
                        tagName: selected ? selected.name : undefined,
                        tagColor: selected ? (selected.color || 'var(--accent)') : undefined,
                        tagType: selected ? selected.type : undefined
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
        setTagSearchQuery('');
        setIsTagDropdownOpen(false);
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
        setTagSearchQuery('');
        setIsTagDropdownOpen(false);
    };

    const handleCancelEdit = () => {
        setEditingTimeLogId(null);
        setTimeLogForm({
            startTime: '', endTime: '', tagGoalId: '', desc: ''
        });
        setTagSearchQuery('');
        setIsTagDropdownOpen(false);
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

    // Filter dayTimeLogs based on logSearchQuery
    const filteredTimeLogs = useMemo(() => {
        if (!logSearchQuery.trim()) return dayTimeLogs;
        const q = logSearchQuery.toLowerCase().trim();
        return dayTimeLogs.filter((log: any) => {
            const descMatch = (log.desc || '').toLowerCase().includes(q);
            const tagMatch = (log.tagName || '').toLowerCase().includes(q);
            const tagTypeMatch = (log.tagType || '').toLowerCase().includes(q);
            const timeMatch = (log.startTime || '').includes(q) || (log.endTime || '').includes(q);
            return descMatch || tagMatch || tagTypeMatch || timeMatch;
        });
    }, [dayTimeLogs, logSearchQuery]);

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

                {/* Row 2: Tag Goal / Habit Search Bar */}
                <div ref={tagSelectorRef} style={{ position: 'relative' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '4px'
                    }}>
                        <label htmlFor="timelog-tag-search-input" style={{
                            fontSize: '10px',
                            fontWeight: '600',
                            color: 'var(--text-secondary)',
                            textTransform: 'uppercase',
                            margin: 0,
                            display: 'block'
                        }}>
                            Tag Goal / Habit (Optional)
                        </label>
                        {selectedGoal && (
                            <button
                                type="button"
                                onClick={() => handleSelectGoal(null)}
                                style={{
                                    fontSize: '10px',
                                    color: 'var(--text-secondary)',
                                    background: 'none',
                                    border: 'none',
                                    padding: '0 4px',
                                    cursor: 'pointer',
                                    textDecoration: 'underline'
                                }}
                            >
                                Clear Tag
                            </button>
                        )}
                    </div>

                    {/* Active Selected Tag Pill */}
                    {selectedGoal && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '6px',
                            padding: '5px 8px',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: `1px solid ${selectedGoal.color ? `${selectedGoal.color}55` : 'var(--panel-border)'}`,
                            width: 'fit-content',
                            maxWidth: '100%'
                        }}>
                            <span style={{
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontWeight: 600,
                                background: getTagBadgeStyle(selectedGoal.type).bg,
                                color: getTagBadgeStyle(selectedGoal.type).color,
                                flexShrink: 0
                            }}>
                                {selectedGoal.type}
                            </span>
                            <span style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: selectedGoal.color || '#fff',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                {selectedGoal.name}
                            </span>
                            <button
                                type="button"
                                className="icon-btn"
                                onClick={() => handleSelectGoal(null)}
                                style={{ padding: '2px', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                title="Remove tag"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    )}

                    {/* Search Bar Input */}
                    <div style={{ position: 'relative', width: '100%' }}>
                        <div style={{
                            position: 'absolute',
                            left: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            display: 'flex',
                            color: 'var(--text-secondary)',
                            pointerEvents: 'none'
                        }}>
                            <Search size={14} />
                        </div>
                        <input
                            ref={tagInputRef}
                            id="timelog-tag-search-input"
                            type="text"
                            placeholder={selectedGoal ? `Change tag (${selectedGoal.name})...` : "Search tag, goal, habit..."}
                            value={tagSearchQuery}
                            onChange={e => {
                                setTagSearchQuery(e.target.value);
                                if (!isTagDropdownOpen) setIsTagDropdownOpen(true);
                            }}
                            onFocus={() => {
                                updateTagCoords();
                                setIsTagDropdownOpen(true);
                            }}
                            onKeyDown={handleTagInputKeyDown}
                            style={{
                                width: '100%',
                                paddingLeft: '32px',
                                paddingRight: (tagSearchQuery || isTagDropdownOpen) ? '32px' : '10px',
                                paddingTop: '8px',
                                paddingBottom: '8px',
                                fontSize: '13px',
                                borderRadius: '6px',
                                background: 'rgba(0, 0, 0, 0.4)',
                                border: '1px solid var(--panel-border)',
                                color: '#fff',
                                height: '36px'
                            }}
                        />
                        {tagSearchQuery ? (
                            <button
                                type="button"
                                className="icon-btn"
                                onClick={() => setTagSearchQuery('')}
                                style={{
                                    position: 'absolute',
                                    right: '8px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    padding: '4px',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer'
                                }}
                                title="Clear query"
                            >
                                <X size={13} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="icon-btn"
                                onClick={() => {
                                    updateTagCoords();
                                    setIsTagDropdownOpen(!isTagDropdownOpen);
                                    if (!isTagDropdownOpen) tagInputRef.current?.focus();
                                }}
                                style={{
                                    position: 'absolute',
                                    right: '8px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    padding: '4px',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer'
                                }}
                                title="Toggle goals list"
                            >
                                <ChevronDown
                                    size={13}
                                    style={{
                                        transform: isTagDropdownOpen ? 'rotate(180deg)' : 'none',
                                        transition: 'transform 0.2s'
                                    }}
                                />
                            </button>
                        )}
                    </div>

                    {/* Portaled Tag Dropdown List */}
                    {isTagDropdownOpen && tagCoords && createPortal(
                        <div
                            ref={tagMenuRef}
                            role="listbox"
                            style={{
                                position: 'fixed',
                                top: tagCoords.top,
                                left: tagCoords.left,
                                width: tagCoords.width,
                                transform: tagCoords.openUpwards ? 'translateY(-100%)' : 'none',
                                background: 'var(--bg, #121212)',
                                border: '1px solid var(--panel-border)',
                                borderRadius: '8px',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.85)',
                                zIndex: 10000,
                                maxHeight: `${tagCoords.maxHeight}px`,
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            {/* "No Tag (General)" Option */}
                            <div
                                ref={el => { tagItemRefs.current[0] = el; }}
                                onClick={() => handleSelectGoal(null)}
                                onMouseEnter={() => setHighlightedTagIndex(0)}
                                style={{
                                    padding: '9px 12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '8px',
                                    borderBottom: '1px solid var(--panel-border)',
                                    background: highlightedTagIndex === 0 ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
                                    color: !selectedGoal ? 'var(--accent)' : 'var(--text-secondary)'
                                }}
                            >
                                <span style={{ fontSize: '13px', fontWeight: !selectedGoal ? 'bold' : 'normal' }}>
                                    No Tag (General)
                                </span>
                                {!selectedGoal && <Check size={14} color="var(--accent)" />}
                            </div>

                            {/* Matching Goals / Habits */}
                            {filteredGoals.length === 0 ? (
                                <div style={{
                                    padding: '12px',
                                    fontSize: '12px',
                                    color: 'var(--text-secondary)',
                                    textAlign: 'center'
                                }}>
                                    No goals or habits found matching &ldquo;{tagSearchQuery}&rdquo;
                                </div>
                            ) : (
                                filteredGoals.map((g, idx) => {
                                    const itemIndex = idx + 1;
                                    const isHighlighted = highlightedTagIndex === itemIndex;
                                    const isCurrentSelected = selectedGoal && (String(selectedGoal.id) === String(g.id) || selectedGoal.name === g.name);
                                    const badgeStyle = getTagBadgeStyle(g.type);

                                    return (
                                        <div
                                            key={String(g.id || g.name || idx)}
                                            ref={el => { tagItemRefs.current[itemIndex] = el; }}
                                            onClick={() => handleSelectGoal(g)}
                                            onMouseEnter={() => setHighlightedTagIndex(itemIndex)}
                                            style={{
                                                padding: '8px 12px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '8px',
                                                background: isHighlighted ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
                                                transition: 'background 0.1s'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                                <span style={{
                                                    fontSize: '10px',
                                                    padding: '1px 6px',
                                                    borderRadius: '4px',
                                                    fontWeight: 600,
                                                    background: badgeStyle.bg,
                                                    color: badgeStyle.color,
                                                    flexShrink: 0
                                                }}>
                                                    {g.type}
                                                </span>
                                                <span style={{
                                                    fontSize: '13px',
                                                    color: g.color || '#fff',
                                                    fontWeight: isCurrentSelected ? 'bold' : 'normal',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {g.name}
                                                </span>
                                            </div>
                                            {isCurrentSelected && (
                                                <Check size={14} color="var(--accent)" style={{ flexShrink: 0 }} />
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>,
                        document.body
                    )}
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

            {/* Search Bar for Logged Time Entries */}
            {(dayTimeLogs.length > 0 || logSearchQuery.trim()) && (
                <div style={{ marginBottom: '12px', flexShrink: 0 }}>
                    <SearchSortBar
                        searchQuery={logSearchQuery}
                        setSearchQuery={setLogSearchQuery}
                        placeholder="Search logs by tag, goal, habit..."
                        isFilterActive={!!logSearchQuery}
                        onFilterClear={() => setLogSearchQuery('')}
                    />
                </div>
            )}

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
                {filteredTimeLogs.length === 0 ? (
                    dayTimeLogs.length === 0 ? (
                        <div style={{
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
                            <div style={{fontSize: '13px', fontWeight: '500', color: '#fff'}}>
                                No time logs for this date
                            </div>
                            <div style={{fontSize: '11px', marginTop: '4px', opacity: 0.7}}>
                                Fill out the quick form above to log your time.
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '32px 16px',
                            color: 'var(--text-secondary)',
                            textAlign: 'center',
                            border: '1px dashed var(--panel-border)',
                            borderRadius: '12px',
                            marginTop: '8px'
                        }}>
                            <div style={{fontSize: '13px', fontWeight: '500', color: '#fff'}}>
                                No time logs match &ldquo;{logSearchQuery}&rdquo;
                            </div>
                            <button
                                type="button"
                                className="secondary"
                                onClick={() => setLogSearchQuery('')}
                                style={{ marginTop: '10px', fontSize: '12px', padding: '6px 12px' }}
                            >
                                Clear search
                            </button>
                        </div>
                    )
                ) : (
                    filteredTimeLogs.map(log => {
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
                                    {log.tagName && (
                                        <span
                                            onClick={() => setLogSearchQuery(log.tagName)}
                                            style={{
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
                                                maxWidth: '160px',
                                                cursor: 'pointer'
                                            }}
                                            title="Click to filter logs by this tag"
                                        >
                                            {log.tagName}
                                        </span>
                                    )}
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
                    })
                )}
                <div style={{height: '16px'}}/>
            </div>
        </div>
    );
}
