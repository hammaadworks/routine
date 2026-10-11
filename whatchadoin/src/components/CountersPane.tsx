import React, { useState, useEffect, useMemo } from 'react';
import {
    Plus,
    Minus,
    CheckCircle2,
    Target,
    Clock,
    Pencil,
    Trash2,
    X,
    Maximize2,
    RotateCcw,
    MessageSquare,
    Hash
} from 'lucide-react';
import type { CounterItem, CounterCadence } from '../types/counter';
import SearchSortBar from './SearchSortBar';
import OrderControls from './OrderControls';
import { moveItemRelativeTo } from '../hooks/useDragReorder';
import {
    loadCounters,
    saveCounters,
    getTodayDateStr,
    formatDisplayDate,
    getTargetForDate,
    updateCounterTarget,
    recordCounterDelta,
    resetCounterDay,
    calculateCounterStats
} from '../utils/counterStore';

const COLOR_PALETTE = [
    '#FF595E', '#FF9F1C', '#FFCA3A', '#8AC926',
    '#00F5D4', '#1982C4', '#4361EE', '#6A4C93',
    '#F15BB5', '#E07A5F'
];

interface CountersPaneProps {
    isPublicView?: boolean;
}

export default function CountersPane({ isPublicView: _isPublicView }: CountersPaneProps) {
    const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr);
    const [counters, setCounters] = useState<CounterItem[]>(loadCounters);

    // Search and sort states matching Goals/Habits
    const [searchQuery, setSearchQuery] = useState('');
    const [sortByName, setSortByName] = useState(false);

    // Modal state for Add / Edit Counter definition
    const [showCounterModal, setShowCounterModal] = useState(false);
    const [editingCounter, setEditingCounter] = useState<CounterItem | null>(null);
    const [counterForm, setCounterForm] = useState<{
        name: string;
        cadence: CounterCadence;
        targetCount: number;
        unit: string;
        step: number;
        quickSteps: string;
        color: string;
        notes: string;
        isNegative: boolean;
    }>({
        name: '',
        cadence: 'daily',
        targetCount: 100,
        unit: 'reps',
        step: 1,
        quickSteps: '1, 5, 10, 25',
        color: '#00F5D4',
        notes: '',
        isNegative: false
    });

    // Modal state for changing Target with scope prompt
    const [targetChangeModal, setTargetChangeModal] = useState<{
        counter: CounterItem;
        prevTarget: number;
        newTarget: number;
        scope: 'from_today' | 'all';
    } | null>(null);

    // Log with Reason ("When & Why") modal
    const [reasonModal, setReasonModal] = useState<{
        counter: CounterItem;
        amount: number;
        why: string;
    } | null>(null);

    // Focus Fullscreen Clicker state
    const [focusClickerCounter, setFocusClickerCounter] = useState<CounterItem | null>(null);

    // Drawer state for expanded event history per counter
    const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

    // Listen to updates from other windows/components
    useEffect(() => {
        const handleCountersUpdate = () => setCounters(loadCounters());
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'whatchadoin_counters' && e.newValue) {
                setCounters(loadCounters());
            }
        };

        window.addEventListener('whatchadoin_counters_updated', handleCountersUpdate);
        window.addEventListener('storage', handleStorage);
        return () => {
            window.removeEventListener('whatchadoin_counters_updated', handleCountersUpdate);
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    // Midnight rollover timer: checks every 30 seconds so at 12:00 AM counts reset and backlog updates seamlessly
    useEffect(() => {
        const interval = setInterval(() => {
            const today = getTodayDateStr();
            setSelectedDate(current => {
                if (current !== today) {
                    return today;
                }
                return current;
            });
            setCounters(loadCounters());
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    // Trigger haptic feedback if available
    const triggerHaptic = () => {
        if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
            try {
                navigator.vibrate(20);
            } catch {
                // Ignore vibration errors
            }
        }
    };

    // Increment / Decrement
    const handleDelta = (counter: CounterItem, amount: number) => {
        triggerHaptic();
        const updated = recordCounterDelta(counters, counter.id, amount);
        setCounters(updated);
        // If focus clicker is open for this counter, update it
        if (focusClickerCounter && focusClickerCounter.id === counter.id) {
            const updatedActive = updated.find(c => c.id === counter.id);
            if (updatedActive) setFocusClickerCounter(updatedActive);
        }
    };

    // Open Reason Modal
    const handleOpenReasonModal = (counter: CounterItem, amount = 1) => {
        setReasonModal({ counter, amount, why: '' });
    };

    const handleSaveReasonDelta = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reasonModal) return;
        triggerHaptic();
        const updated = recordCounterDelta(
            counters,
            reasonModal.counter.id,
            reasonModal.amount,
            reasonModal.why
        );
        setCounters(updated);
        setReasonModal(null);
    };

    // Reset Day
    const handleResetDay = (counter: CounterItem) => {
        if (window.confirm(`Reset ${counter.name} count to 0 for today?`)) {
            const updated = resetCounterDay(counters, counter.id);
            setCounters(updated);
        }
    };

    // Delete Counter
    const handleDeleteCounter = (counterId: string) => {
        if (window.confirm('Are you sure you want to delete this counter?')) {
            const filtered = counters.filter(c => c.id !== counterId);
            setCounters(filtered);
            saveCounters(filtered);
        }
    };

    // Open Counter Create / Edit Modal
    const handleOpenAddCounter = () => {
        setEditingCounter(null);
        setCounterForm({
            name: '',
            cadence: 'daily',
            targetCount: 100,
            unit: 'reps',
            step: 10,
            quickSteps: '1, 5, 10, 25',
            color: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)] || '#00F5D4',
            notes: '',
            isNegative: false
        });
        setShowCounterModal(true);
    };

    const handleOpenEditCounter = (counter: CounterItem) => {
        setEditingCounter(counter);
        setCounterForm({
            name: counter.name,
            cadence: counter.cadence,
            targetCount: getTargetForDate(counter, selectedDate),
            unit: counter.unit || 'reps',
            step: counter.step || 1,
            quickSteps: (counter.quickSteps || [1, 5, 10]).join(', '),
            color: counter.color || '#00F5D4',
            notes: counter.notes || '',
            isNegative: !!counter.isNegative
        });
        setShowCounterModal(true);
    };

    const handleSaveCounterForm = (e: React.FormEvent) => {
        e.preventDefault();
        if (!counterForm.name.trim()) return;

        const parsedQuickSteps = counterForm.quickSteps
            .split(',')
            .map(s => Number(s.trim()))
            .filter(n => !isNaN(n) && n > 0);

        if (editingCounter) {
            const oldTarget = getTargetForDate(editingCounter, selectedDate);
            const targetChanged = counterForm.targetCount !== oldTarget;

            if (targetChanged) {
                // If target changed, prompt user with Target Scope Modal
                const baseUpdated: CounterItem = {
                    ...editingCounter,
                    name: counterForm.name.trim(),
                    cadence: counterForm.cadence,
                    unit: counterForm.unit.trim() || undefined,
                    step: Number(counterForm.step) || 1,
                    quickSteps: parsedQuickSteps.length > 0 ? parsedQuickSteps : [1, 5, 10],
                    color: counterForm.color,
                    notes: counterForm.notes.trim() || undefined,
                    isNegative: counterForm.isNegative
                };
                setShowCounterModal(false);
                setTargetChangeModal({
                    counter: baseUpdated,
                    prevTarget: oldTarget,
                    newTarget: Number(counterForm.targetCount) || 1,
                    scope: 'from_today' // Default: Set from today!
                });
                return;
            }

            // Target not changed, direct update
            const updated = counters.map(c => {
                if (c.id === editingCounter.id) {
                    return {
                        ...c,
                        name: counterForm.name.trim(),
                        cadence: counterForm.cadence,
                        unit: counterForm.unit.trim() || undefined,
                        step: Number(counterForm.step) || 1,
                        quickSteps: parsedQuickSteps.length > 0 ? parsedQuickSteps : [1, 5, 10],
                        color: counterForm.color,
                        notes: counterForm.notes.trim() || undefined,
                        isNegative: counterForm.isNegative
                    };
                }
                return c;
            });
            setCounters(updated);
            saveCounters(updated);
        } else {
            // New counter
            const todayStr = getTodayDateStr();
            const newCounter: CounterItem = {
                id: `cnt-${Date.now()}`,
                name: counterForm.name.trim(),
                cadence: counterForm.cadence,
                targetCount: Number(counterForm.targetCount) || 100,
                unit: counterForm.unit.trim() || undefined,
                step: Number(counterForm.step) || 1,
                quickSteps: parsedQuickSteps.length > 0 ? parsedQuickSteps : [1, 5, 10],
                color: counterForm.color,
                notes: counterForm.notes.trim() || undefined,
                isNegative: counterForm.isNegative,
                createdAt: Date.now(),
                startDate: todayStr,
                backlog: 0,
                todayCount: 0,
                lastActiveDate: todayStr,
                pastDaysCount: 0,
                pastTotalDid: 0,
                todayEvents: []
            };
            const updated = [...counters, newCounter];
            setCounters(updated);
            saveCounters(updated);
        }

        setShowCounterModal(false);
    };

    // Open Target Change Modal directly
    const handleOpenChangeTarget = (counter: CounterItem) => {
        const prevTarget = getTargetForDate(counter, selectedDate);
        setTargetChangeModal({
            counter,
            prevTarget,
            newTarget: prevTarget,
            scope: 'from_today'
        });
    };

    // Confirm Target Scope Change
    const handleConfirmTargetChange = () => {
        if (!targetChangeModal) return;
        const { counter, newTarget, scope } = targetChangeModal;

        // Apply any updated metadata first
        const baseList = counters.map(c => c.id === counter.id ? counter : c);

        const updated = updateCounterTarget(
            baseList,
            counter.id,
            newTarget,
            scope,
            selectedDate
        );

        setCounters(updated);
        setTargetChangeModal(null);
    };

    // Derive filtered and sorted counters matching Goals / Habits design
    const isReorderDisabled = Boolean(searchQuery.trim()) || sortByName;

    const displayedCounters = useMemo(() => {
        let list = counters.filter(c => {
            const query = searchQuery.trim().toLowerCase();
            if (!query) return true;
            const nameMatch = (c.name || '').toLowerCase().includes(query);
            const notesMatch = (c.notes || '').toLowerCase().includes(query);
            return nameMatch || notesMatch;
        });

        if (sortByName) {
            list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }

        return list;
    }, [counters, searchQuery, sortByName]);

    // Handlers for counter reordering
    const handleMoveCounterUp = (counter: CounterItem, idx: number) => {
        if (idx <= 0) return;
        const target = displayedCounters[idx - 1];
        const reordered = moveItemRelativeTo(counters, counter, target, 'before');
        setCounters(reordered);
        saveCounters(reordered);
    };

    const handleMoveCounterDown = (counter: CounterItem, idx: number) => {
        if (idx >= displayedCounters.length - 1) return;
        const target = displayedCounters[idx + 1];
        const reordered = moveItemRelativeTo(counters, counter, target, 'after');
        setCounters(reordered);
        saveCounters(reordered);
    };

    // Calculate Summary stats across all counters for selectedDate
    const overallSummary = useMemo(() => {
        let metCount = 0;
        let totalCount = counters.length;

        counters.forEach(c => {
            const stats = calculateCounterStats(c, selectedDate);
            if (stats.isMet) metCount++;
        });

        return { metCount, totalCount };
    }, [counters, selectedDate]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            background: 'var(--panel-bg)',
            borderRadius: '16px',
            border: '1px solid var(--panel-border)'
        }}>
            {/* Top Toolbar: SearchSortBar + Summary + Add Button */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                borderBottom: '1px solid var(--panel-border)',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                {/* Left: Search & Alphabetical Sort Bar */}
                <div style={{ flex: 1, minWidth: '220px', maxWidth: '460px' }}>
                    <SearchSortBar
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        sortByName={sortByName}
                        setSortByName={setSortByName}
                        placeholder="Search counters..."
                        isFilterActive={false}
                    />
                </div>

                {/* Right: Summary pill + Add Counter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
                    {counters.length > 0 && (
                        <div style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            background: overallSummary.metCount === overallSummary.totalCount && overallSummary.totalCount > 0
                                ? 'rgba(16, 185, 129, 0.15)'
                                : 'rgba(255, 255, 255, 0.05)',
                            color: overallSummary.metCount === overallSummary.totalCount && overallSummary.totalCount > 0
                                ? '#10B981'
                                : 'var(--text-secondary)',
                            border: '1px solid var(--panel-border)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap'
                        }}>
                            <Target size={14} color="var(--accent)" />
                            <span>{overallSummary.metCount} of {overallSummary.totalCount} Targets Met</span>
                        </div>
                    )}

                    <button
                        className="primary"
                        onClick={handleOpenAddCounter}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '7px 14px',
                            borderRadius: '8px',
                            fontWeight: '600',
                            fontSize: '13px',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        <Plus size={16} />
                        <span>Add Counter</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                {counters.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '48px 20px',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <Hash size={42} color="var(--accent)" style={{ opacity: 0.6 }} />
                        <h3 style={{ margin: 0, color: '#fff' }}>No Counters Yet</h3>
                        <p style={{ maxWidth: '400px', fontSize: '13px', lineHeight: 1.5 }}>
                            Track daily pushups, zikr, or distractions like Instagram doomscrolling. Space-efficient backlog calculation keeps track of your overall target.
                        </p>
                        <button className="primary" onClick={handleOpenAddCounter} style={{ padding: '8px 18px', borderRadius: '8px' }}>
                            <Plus size={16} /> Create Your First Counter
                        </button>
                    </div>
                ) : displayedCounters.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: 'var(--text-secondary)'
                    }}>
                        No counters match your search &ldquo;{searchQuery}&rdquo;.
                    </div>
                ) : (
                    <div className="counters-grid">
                        {displayedCounters.map((counter, idx) => {
                            const stats = calculateCounterStats(counter, selectedDate);
                            const hexColor = counter.color || '#00F5D4';
                            const isExpanded = expandedHistoryId === counter.id;

                            return (
                                <div
                                    key={counter.id}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        border: `1px solid ${stats.isMet ? 'rgba(16, 185, 129, 0.4)' : 'var(--panel-border)'}`,
                                        borderRadius: '14px',
                                        padding: '16px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '14px',
                                        boxShadow: stats.isMet ? '0 0 12px rgba(16, 185, 129, 0.1)' : 'none',
                                        transition: 'all 0.2s ease',
                                        position: 'relative'
                                    }}
                                >
                                    {/* Card Header with OrderControls */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                            <OrderControls
                                                canMoveUp={idx > 0}
                                                canMoveDown={idx < displayedCounters.length - 1}
                                                onMoveUp={() => handleMoveCounterUp(counter, idx)}
                                                onMoveDown={() => handleMoveCounterDown(counter, idx)}
                                                disabled={isReorderDisabled}
                                            />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                    <span style={{
                                                        width: '10px',
                                                        height: '10px',
                                                        borderRadius: '50%',
                                                        background: hexColor,
                                                        flexShrink: 0
                                                    }} />
                                                    <h3 style={{
                                                        margin: 0,
                                                        fontSize: '16px',
                                                        fontWeight: '700',
                                                        color: '#fff',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}>
                                                        {counter.name}
                                                    </h3>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                    <span style={{
                                                        fontSize: '11px',
                                                        fontWeight: '600',
                                                        textTransform: 'uppercase',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        background: 'rgba(255, 255, 255, 0.08)',
                                                        color: 'var(--text-secondary)'
                                                    }}>
                                                        {counter.cadence}
                                                    </span>

                                                    {counter.isNegative && (
                                                        <span style={{
                                                            fontSize: '11px',
                                                            fontWeight: '600',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            background: 'rgba(239, 68, 68, 0.15)',
                                                            color: '#EF4444'
                                                        }}>
                                                            Distraction / Limit
                                                        </span>
                                                    )}

                                                    {counter.notes && (
                                                        <span style={{
                                                            fontSize: '11px',
                                                            color: 'var(--text-secondary)',
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            maxWidth: '160px'
                                                        }}>
                                                            {counter.notes}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions: Edit, Focus, Delete */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <button
                                                className="icon-btn"
                                                onClick={() => setFocusClickerCounter(counter)}
                                                title="Focus Fullscreen Clicker"
                                                style={{ padding: '6px', color: 'var(--accent)' }}
                                            >
                                                <Maximize2 size={15} />
                                            </button>
                                            <button
                                                className="icon-btn"
                                                onClick={() => handleOpenEditCounter(counter)}
                                                title="Edit Counter"
                                                style={{ padding: '6px' }}
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            <button
                                                className="icon-btn"
                                                onClick={() => handleDeleteCounter(counter.id)}
                                                title="Delete Counter"
                                                style={{ padding: '6px', color: '#EF4444' }}
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Prominent Count & Status Display */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'baseline',
                                        justifyContent: 'space-between',
                                        background: 'rgba(0, 0, 0, 0.25)',
                                        borderRadius: '10px',
                                        padding: '10px 14px',
                                        border: '1px solid var(--panel-border)'
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                                <span style={{
                                                    fontSize: '32px',
                                                    fontWeight: '800',
                                                    color: stats.isMet ? '#10B981' : hexColor,
                                                    lineHeight: 1
                                                }}>
                                                    {stats.todayCount}
                                                </span>
                                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                    {counter.unit || 'reps'}
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                Logged on {formatDisplayDate(selectedDate)}
                                            </span>
                                        </div>

                                        <div style={{ textAlign: 'right' }}>
                                            {stats.isMet ? (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    color: '#10B981',
                                                    fontWeight: '700',
                                                    fontSize: '13px'
                                                }}>
                                                    <CheckCircle2 size={16} />
                                                    <span>Target Met!</span>
                                                </div>
                                            ) : (
                                                <div style={{
                                                    fontSize: '13px',
                                                    fontWeight: '600',
                                                    color: 'var(--text-secondary)'
                                                }}>
                                                    <span style={{ color: '#fff', fontWeight: '700' }}>
                                                        {stats.remainingToday}
                                                    </span> to go
                                                </div>
                                            )}
                                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                {stats.percentage}% completed
                                            </span>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div style={{
                                        width: '100%',
                                        height: '6px',
                                        borderRadius: '3px',
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            width: `${Math.min(100, stats.percentage)}%`,
                                            height: '100%',
                                            background: stats.isMet ? '#10B981' : hexColor,
                                            borderRadius: '3px',
                                            transition: 'width 0.3s ease'
                                        }} />
                                    </div>

                                    {/* Metrics Grid: Today Target & Backlog */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(2, 1fr)',
                                        gap: '10px',
                                        background: 'rgba(255, 255, 255, 0.02)',
                                        padding: '12px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--panel-border)'
                                    }}>
                                        {/* Column 1: Today Target */}
                                        <div>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                marginBottom: '3px'
                                            }}>
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600' }}>
                                                    Today Target
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenChangeTarget(counter)}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: 'var(--accent)',
                                                        cursor: 'pointer',
                                                        padding: 0,
                                                        fontSize: '10px',
                                                        fontWeight: '600',
                                                        textDecoration: 'underline'
                                                    }}
                                                    title="Change Target (Prompt scope)"
                                                >
                                                    Change
                                                </button>
                                            </div>
                                            <div style={{ fontWeight: '800', color: '#fff', fontSize: '15px' }}>
                                                {stats.todayTarget} <span style={{ fontSize: '11px', fontWeight: '400', color: 'var(--text-secondary)' }}>{counter.unit || 'reps'}</span>
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                                                Did Today: <strong style={{ color: '#fff' }}>{stats.todayCount}</strong>
                                            </div>
                                        </div>

                                        {/* Column 2: Backlog */}
                                        <div>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>
                                                Backlog
                                            </div>
                                            <div style={{
                                                fontWeight: '800',
                                                fontSize: '15px',
                                                color: stats.backlog > 0 ? '#FF9F1C' : (stats.backlog === 0 ? '#10B981' : '#00F5D4')
                                            }}>
                                                {stats.backlog > 0 ? `+${stats.backlog}` : stats.backlog} <span style={{ fontSize: '11px', fontWeight: '400' }}>{counter.unit || 'reps'}</span>
                                            </div>
                                            <div style={{
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                color: stats.backlog > 0 ? '#FF9F1C' : (stats.backlog === 0 ? '#10B981' : '#00F5D4'),
                                                marginTop: '3px'
                                            }}>
                                                {stats.backlog > 0 ? 'Behind target' : (stats.backlog === 0 ? 'On track 🎯' : `Ahead by ${Math.abs(stats.backlog)} 🚀`)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Play Controls */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        flexWrap: 'wrap'
                                    }}>
                                        {/* Decrement Button */}
                                        <button
                                            className="secondary"
                                            onClick={() => handleDelta(counter, -(counter.step || 1))}
                                            disabled={stats.todayCount <= 0}
                                            title={`Minus ${counter.step || 1}`}
                                            style={{
                                                padding: '7px 10px',
                                                borderRadius: '8px',
                                                opacity: stats.todayCount <= 0 ? 0.4 : 1
                                            }}
                                        >
                                            <Minus size={15} />
                                        </button>

                                        {/* Quick Step Increment Buttons */}
                                        {(counter.quickSteps || [1, 5, 10]).map(step => (
                                            <button
                                                key={step}
                                                className="secondary"
                                                onClick={() => handleDelta(counter, step)}
                                                style={{
                                                    padding: '7px 12px',
                                                    borderRadius: '8px',
                                                    fontWeight: '700',
                                                    fontSize: '12px',
                                                    flex: 1,
                                                    minWidth: '42px',
                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                    border: '1px solid var(--panel-border)',
                                                    color: '#fff'
                                                }}
                                            >
                                                +{step}
                                            </button>
                                        ))}

                                        {/* Distraction / Reason Log button */}
                                        <button
                                            className="secondary"
                                            onClick={() => handleOpenReasonModal(counter, counter.step || 1)}
                                            title="Add with Reason (When & Why)"
                                            style={{
                                                padding: '7px 10px',
                                                borderRadius: '8px',
                                                color: counter.isNegative ? '#EF4444' : 'var(--accent)'
                                            }}
                                        >
                                            <MessageSquare size={14} />
                                        </button>

                                        {/* Reset Count Button */}
                                        <button
                                            className="icon-btn"
                                            onClick={() => handleResetDay(counter)}
                                            title="Reset Day's Count"
                                            style={{ padding: '7px', opacity: 0.7 }}
                                        >
                                            <RotateCcw size={14} />
                                        </button>
                                    </div>

                                    {/* Bottom Links: History and Change Target */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        paddingTop: '4px'
                                    }}>
                                        <button
                                            type="button"
                                            onClick={() => setExpandedHistoryId(isExpanded ? null : counter.id)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: 'var(--text-secondary)',
                                                cursor: 'pointer',
                                                padding: 0,
                                                fontSize: '11px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            <Clock size={12} />
                                            <span>
                                                {stats.events.length} logs today {isExpanded ? '▲' : '▼'}
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleOpenChangeTarget(counter)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: 'var(--text-secondary)',
                                                cursor: 'pointer',
                                                padding: 0,
                                                fontSize: '11px',
                                                textDecoration: 'underline'
                                            }}
                                            title="Quick change target with scope"
                                        >
                                            Change Target
                                        </button>
                                    </div>

                                    {/* Expanded History List */}
                                    {isExpanded && (
                                        <div style={{
                                            background: 'rgba(0, 0, 0, 0.3)',
                                            borderRadius: '8px',
                                            padding: '8px 10px',
                                            maxHeight: '140px',
                                            overflowY: 'auto',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '6px'
                                        }}>
                                            {stats.events.length === 0 ? (
                                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                    No entries recorded for this date.
                                                </span>
                                            ) : (
                                                stats.events.map(ev => (
                                                    <div
                                                        key={ev.id}
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            fontSize: '11px'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span style={{ color: 'var(--text-secondary)' }}>{ev.timeStr}</span>
                                                            <span style={{
                                                                fontWeight: '700',
                                                                color: ev.amount >= 0 ? '#10B981' : '#EF4444'
                                                            }}>
                                                                {ev.amount >= 0 ? `+${ev.amount}` : ev.amount}
                                                            </span>
                                                        </div>
                                                        {ev.why && (
                                                            <span style={{
                                                                color: 'var(--accent)',
                                                                fontStyle: 'italic',
                                                                maxWidth: '180px',
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis'
                                                            }}>
                                                                "{ev.why}"
                                                            </span>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal 1: Add / Edit Counter Definition */}
            {showCounterModal && (
                <div className="modal-overlay" onClick={() => setShowCounterModal(false)} style={{ zIndex: 1000 }}>
                    <div
                        className="modal-container"
                        onClick={e => e.stopPropagation()}
                        style={{
                            maxWidth: '460px',
                            width: '90%',
                            background: 'var(--panel-bg)',
                            borderRadius: '16px',
                            border: '1px solid var(--panel-border)',
                            padding: '22px'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#fff' }}>
                                {editingCounter ? 'Edit Counter' : 'New Counter'}
                            </h2>
                            <button className="icon-btn" onClick={() => setShowCounterModal(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveCounterForm} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                    Name *
                                </label>
                                <input
                                    type="text"
                                    value={counterForm.name}
                                    onChange={e => setCounterForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g. Pushups, SubhanAllah, Instagram Doomscroll"
                                    required
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '14px' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                        Cadence
                                    </label>
                                    <select
                                        value={counterForm.cadence}
                                        onChange={e => setCounterForm(prev => ({ ...prev, cadence: e.target.value as CounterCadence }))}
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '14px' }}
                                    >
                                        <option value="daily">Daily Target</option>
                                        <option value="weekly">Weekly Target (Starts Sun)</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                        Target Count
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={counterForm.targetCount}
                                        onChange={e => setCounterForm(prev => ({ ...prev, targetCount: Number(e.target.value) || 0 }))}
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '14px' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                        Unit Label
                                    </label>
                                    <input
                                        type="text"
                                        value={counterForm.unit}
                                        onChange={e => setCounterForm(prev => ({ ...prev, unit: e.target.value }))}
                                        placeholder="reps, zikr, glasses, times"
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '14px' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                        Default Step
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={counterForm.step}
                                        onChange={e => setCounterForm(prev => ({ ...prev, step: Number(e.target.value) || 1 }))}
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '14px' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                    Quick Step Buttons (comma separated)
                                </label>
                                <input
                                    type="text"
                                    value={counterForm.quickSteps}
                                    onChange={e => setCounterForm(prev => ({ ...prev, quickSteps: e.target.value }))}
                                    placeholder="1, 5, 10, 25, 33"
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '14px' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                                    Accent Color
                                </label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {COLOR_PALETTE.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setCounterForm(prev => ({ ...prev, color: c }))}
                                            style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '50%',
                                                background: c,
                                                border: counterForm.color === c ? '3px solid #fff' : '2px solid transparent',
                                                cursor: 'pointer'
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                    Notes / Intention (optional)
                                </label>
                                <input
                                    type="text"
                                    value={counterForm.notes}
                                    onChange={e => setCounterForm(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="e.g. Set of 25 morning, noon, and night"
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '14px' }}
                                />
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#fff' }}>
                                <input
                                    type="checkbox"
                                    checked={counterForm.isNegative}
                                    onChange={e => setCounterForm(prev => ({ ...prev, isNegative: e.target.checked }))}
                                />
                                <span>Track as Vice/Distraction (e.g. doomscrolling, smoking)</span>
                            </label>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                                <button type="button" className="secondary" onClick={() => setShowCounterModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="primary" style={{ padding: '8px 18px', borderRadius: '8px' }}>
                                    {editingCounter ? 'Update Counter' : 'Create Counter'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 2: Target Scope Change Prompt (1. Show prev target, 2. Accept new target, 3. Ask whether to set from today or change for all) */}
            {targetChangeModal && (
                <div className="modal-overlay" onClick={() => setTargetChangeModal(null)} style={{ zIndex: 1100 }}>
                    <div
                        className="modal-container"
                        onClick={e => e.stopPropagation()}
                        style={{
                            maxWidth: '440px',
                            width: '90%',
                            background: 'var(--panel-bg)',
                            borderRadius: '16px',
                            border: '1px solid var(--panel-border)',
                            padding: '22px'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#fff' }}>
                                Change Target for "{targetChangeModal.counter.name}"
                            </h3>
                            <button className="icon-btn" onClick={() => setTargetChangeModal(null)}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* 1. Show Previous Target */}
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            borderRadius: '10px',
                            padding: '12px 14px',
                            border: '1px solid var(--panel-border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '16px'
                        }}>
                            <div>
                                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '700', letterSpacing: '0.5px' }}>
                                    Previous Target
                                </span>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                    Active for {formatDisplayDate(selectedDate)}
                                </div>
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>
                                {targetChangeModal.prevTarget} <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>{targetChangeModal.counter.unit || 'reps'}</span>
                            </div>
                        </div>

                        {/* 2. Accept New Target */}
                        <div style={{ marginBottom: '18px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                                New Target ({targetChangeModal.counter.unit || 'reps'}) *
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={targetChangeModal.newTarget}
                                onChange={e => setTargetChangeModal(prev => prev ? { ...prev, newTarget: Number(e.target.value) || 0 } : null)}
                                autoFocus
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    fontSize: '18px',
                                    fontWeight: '800',
                                    background: 'rgba(0, 0, 0, 0.3)',
                                    border: '1px solid var(--panel-border)',
                                    color: 'var(--accent)'
                                }}
                            />
                        </div>

                        {/* 3. Ask whether to set from today or change for all */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                                Target Application Scope
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {/* Option 1: DEFAULT - Set from today */}
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '10px',
                                    padding: '12px',
                                    borderRadius: '10px',
                                    background: targetChangeModal.scope === 'from_today' ? 'rgba(0, 245, 212, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                                    border: `1px solid ${targetChangeModal.scope === 'from_today' ? 'var(--accent)' : 'var(--panel-border)'}`,
                                    cursor: 'pointer'
                                }}>
                                    <input
                                        type="radio"
                                        name="targetScope"
                                        checked={targetChangeModal.scope === 'from_today'}
                                        onChange={() => setTargetChangeModal(prev => prev ? { ...prev, scope: 'from_today' } : null)}
                                        style={{ marginTop: '3px' }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: '700', fontSize: '13px', color: '#fff' }}>
                                            Set this target from today (Default) ⭐
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                                            Preserves previous target ({targetChangeModal.prevTarget}) for historical dates; applies {targetChangeModal.newTarget} from {formatDisplayDate(selectedDate)} onwards.
                                        </div>
                                    </div>
                                </label>

                                {/* Option 2: Change for all */}
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '10px',
                                    padding: '12px',
                                    borderRadius: '10px',
                                    background: targetChangeModal.scope === 'all' ? 'rgba(0, 245, 212, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                                    border: `1px solid ${targetChangeModal.scope === 'all' ? 'var(--accent)' : 'var(--panel-border)'}`,
                                    cursor: 'pointer'
                                }}>
                                    <input
                                        type="radio"
                                        name="targetScope"
                                        checked={targetChangeModal.scope === 'all'}
                                        onChange={() => setTargetChangeModal(prev => prev ? { ...prev, scope: 'all' } : null)}
                                        style={{ marginTop: '3px' }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: '700', fontSize: '13px', color: '#fff' }}>
                                            Change for all dates
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                                            Retroactively updates target to {targetChangeModal.newTarget} across all past, present, and future dates.
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button className="secondary" onClick={() => setTargetChangeModal(null)}>
                                Cancel
                            </button>
                            <button
                                className="primary"
                                onClick={handleConfirmTargetChange}
                                style={{ padding: '8px 20px', borderRadius: '8px', fontWeight: '700' }}
                            >
                                Apply Target
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal 3: Log with Reason (When & Why) */}
            {reasonModal && (
                <div className="modal-overlay" onClick={() => setReasonModal(null)} style={{ zIndex: 1100 }}>
                    <div
                        className="modal-container"
                        onClick={e => e.stopPropagation()}
                        style={{
                            maxWidth: '380px',
                            width: '90%',
                            background: 'var(--panel-bg)',
                            borderRadius: '16px',
                            border: '1px solid var(--panel-border)',
                            padding: '20px'
                        }}
                    >
                        <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#fff' }}>
                            Log {reasonModal.counter.name}
                        </h3>

                        <form onSubmit={handleSaveReasonDelta} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                    Amount to add
                                </label>
                                <input
                                    type="number"
                                    value={reasonModal.amount}
                                    onChange={e => setReasonModal(prev => prev ? { ...prev, amount: Number(e.target.value) || 1 } : null)}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '14px' }}
                                    required
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                    Why / Trigger Reason (optional)
                                </label>
                                <input
                                    type="text"
                                    value={reasonModal.why}
                                    onChange={e => setReasonModal(prev => prev ? { ...prev, why: e.target.value } : null)}
                                    placeholder="e.g. Bored waiting for build, Tired after lunch"
                                    autoFocus
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '14px' }}
                                />
                            </div>

                            {/* Preset Reason Quick Chips */}
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {['Bored', 'Procrastinating', 'Tired', 'Habit', 'Stressed'].map(reason => (
                                    <button
                                        key={reason}
                                        type="button"
                                        onClick={() => setReasonModal(prev => prev ? { ...prev, why: reason } : null)}
                                        style={{
                                            padding: '4px 8px',
                                            fontSize: '11px',
                                            borderRadius: '6px',
                                            background: 'rgba(255, 255, 255, 0.06)',
                                            border: '1px solid var(--panel-border)',
                                            color: 'var(--text-secondary)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {reason}
                                    </button>
                                ))}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                                <button type="button" className="secondary" onClick={() => setReasonModal(null)}>
                                    Cancel
                                </button>
                                <button type="submit" className="primary" style={{ padding: '8px 18px', borderRadius: '8px' }}>
                                    Record Entry
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 4: Fullscreen Focus Clicker */}
            {focusClickerCounter && (() => {
                const stats = calculateCounterStats(focusClickerCounter, selectedDate);
                const hexColor = focusClickerCounter.color || '#00F5D4';

                return (
                    <div
                        className="modal-overlay"
                        onClick={() => setFocusClickerCounter(null)}
                        style={{
                            zIndex: 1200,
                            background: 'rgba(0, 0, 0, 0.85)',
                            backdropFilter: 'blur(8px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '16px'
                        }}
                    >
                        <div
                            onClick={e => e.stopPropagation()}
                            style={{
                                width: '100%',
                                maxWidth: '420px',
                                background: 'var(--panel-bg)',
                                borderRadius: '24px',
                                border: '1px solid var(--panel-border)',
                                padding: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '20px',
                                textAlign: 'center',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                            }}
                        >
                            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    color: hexColor,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    {focusClickerCounter.cadence} Clicker
                                </span>
                                <button className="icon-btn" onClick={() => setFocusClickerCounter(null)}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div>
                                <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: '800', color: '#fff' }}>
                                    {focusClickerCounter.name}
                                </h2>
                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    Target: {stats.todayTarget} {focusClickerCounter.unit || 'reps'}
                                </span>
                            </div>

                            {/* Huge Tap Surface */}
                            <button
                                onClick={() => handleDelta(focusClickerCounter, focusClickerCounter.step || 1)}
                                style={{
                                    width: '200px',
                                    height: '200px',
                                    borderRadius: '50%',
                                    background: stats.isMet
                                        ? 'radial-gradient(circle, #10B981 0%, #059669 100%)'
                                        : `radial-gradient(circle, ${hexColor} 0%, rgba(0,0,0,0.6) 100%)`,
                                    border: '4px solid rgba(255, 255, 255, 0.2)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#000',
                                    cursor: 'pointer',
                                    boxShadow: `0 0 30px ${stats.isMet ? 'rgba(16, 185, 129, 0.4)' : hexColor + '55'}`,
                                    transition: 'transform 0.1s ease',
                                    userSelect: 'none',
                                    WebkitUserSelect: 'none'
                                }}
                                onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
                                onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                                onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.96)')}
                                onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
                            >
                                <span style={{ fontSize: '48px', fontWeight: '900', lineHeight: 1 }}>
                                    {stats.todayCount}
                                </span>
                                <span style={{ fontSize: '13px', fontWeight: '700', marginTop: '6px' }}>
                                    TAP (+{focusClickerCounter.step || 1})
                                </span>
                            </button>

                            {/* Sub Status */}
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                {stats.isMet ? (
                                    <span style={{ color: '#10B981', fontWeight: '700' }}>
                                        🎉 Target Met! ({stats.todayCount} / {stats.todayTarget})
                                    </span>
                                ) : (
                                    <span>
                                        {stats.remainingToday} {focusClickerCounter.unit || 'reps'} remaining today
                                    </span>
                                )}
                            </div>

                            {/* Quick Step Buttons */}
                            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                <button
                                    className="secondary"
                                    onClick={() => handleDelta(focusClickerCounter, -(focusClickerCounter.step || 1))}
                                    disabled={stats.todayCount <= 0}
                                    style={{ flex: 1, padding: '10px', borderRadius: '10px' }}
                                >
                                    -{focusClickerCounter.step || 1}
                                </button>
                                {(focusClickerCounter.quickSteps || [1, 5, 10]).map(step => (
                                    <button
                                        key={step}
                                        className="primary"
                                        onClick={() => handleDelta(focusClickerCounter, step)}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            borderRadius: '10px',
                                            fontWeight: '700'
                                        }}
                                    >
                                        +{step}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
