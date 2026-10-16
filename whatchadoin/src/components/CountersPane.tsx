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
    Hash,
    Copy
} from 'lucide-react';
import type { CounterItem, CounterCadence } from '../types/counter';
import BaseModal from './BaseModal';
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
        currentCount: number;
        unit: string;
        step: number;
        quickSteps: string;
        color: string;
        notes: string;
        isNegative: boolean;
        backlog: number;
    }>({
        name: '',
        cadence: 'daily',
        targetCount: 100,
        currentCount: 0,
        unit: 'reps',
        step: 1,
        quickSteps: '1, 5, 10, 25',
        color: '#00F5D4',
        notes: '',
        isNegative: false,
        backlog: 0
    });

    // Modal state for changing Target with scope prompt
    const [targetChangeModal, setTargetChangeModal] = useState<{
        counter: CounterItem;
        prevTarget: number;
        newTarget: number;
        scope: 'from_today' | 'all';
    } | null>(null);

    // Modal state for directly editing/adjusting Backlog
    const [backlogEditModal, setBacklogEditModal] = useState<{
        counter: CounterItem;
        currentBacklog: number;
        newBacklog: number;
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
        const handleFabAdd = () => {
            handleOpenAddCounter();
        };

        window.addEventListener('whatchadoin_counters_updated', handleCountersUpdate);
        window.addEventListener('storage', handleStorage);
        window.addEventListener('fab:add-counter', handleFabAdd);
        return () => {
            window.removeEventListener('whatchadoin_counters_updated', handleCountersUpdate);
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('fab:add-counter', handleFabAdd);
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
        const msg = counter.cadence === 'total'
            ? `Reset ${counter.name} count to 0?`
            : `Reset ${counter.name} count to 0 for today?`;
        if (window.confirm(msg)) {
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

    // Duplicate Counter
    const handleDuplicateCounter = (counter: CounterItem) => {
        const today = getTodayDateStr();
        const duplicated: CounterItem = {
            ...counter,
            id: `cnt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: `${counter.name} (Copy)`,
            createdAt: Date.now(),
            todayCount: 0,
            backlog: 0,
            lastActiveDate: today,
            todayEvents: [],
            pastDaysCount: 0,
            pastTotalDid: 0
        };
        const updated = [...counters, duplicated];
        setCounters(updated);
        saveCounters(updated);
    };

    // Open Counter Create / Edit Modal
    const handleOpenAddCounter = () => {
        setEditingCounter(null);
        setCounterForm({
            name: '',
            cadence: 'daily',
            targetCount: 100,
            currentCount: 0,
            unit: 'reps',
            step: 1,
            quickSteps: '1, 5, 10, 25',
            color: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)] || '#00F5D4',
            notes: '',
            isNegative: false,
            backlog: 0
        });
        setShowCounterModal(true);
    };

    const handleOpenEditCounter = (counter: CounterItem) => {
        setEditingCounter(counter);
        setCounterForm({
            name: counter.name,
            cadence: counter.cadence,
            targetCount: counter.cadence === 'total' ? counter.targetCount : getTargetForDate(counter, selectedDate),
            currentCount: counter.todayCount || 0,
            unit: counter.unit || 'reps',
            step: counter.step !== undefined && counter.step > 0 ? counter.step : 1,
            quickSteps: (counter.quickSteps || [1, 5, 10]).join(', '),
            color: counter.color || '#00F5D4',
            notes: counter.notes || '',
            isNegative: !!counter.isNegative,
            backlog: counter.backlog || 0
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

        const validatedStep = Number(counterForm.step) > 0 ? Number(counterForm.step) : 1;
        const validatedTarget = Number(counterForm.targetCount) > 0 ? Number(counterForm.targetCount) : 1;

        if (editingCounter) {
            const isTotal = counterForm.cadence === 'total';
            const wasTotal = editingCounter.cadence === 'total';
            const oldTarget = wasTotal ? editingCounter.targetCount : getTargetForDate(editingCounter, selectedDate);
            const targetChanged = validatedTarget !== oldTarget;

            if (!isTotal && !wasTotal && targetChanged) {
                // If target changed on date-bound counter, prompt user with Target Scope Modal
                const baseUpdated: CounterItem = {
                    ...editingCounter,
                    name: counterForm.name.trim(),
                    cadence: counterForm.cadence,
                    unit: counterForm.unit.trim() || undefined,
                    step: validatedStep,
                    quickSteps: parsedQuickSteps.length > 0 ? parsedQuickSteps : [1, 5, 10],
                    color: counterForm.color,
                    notes: counterForm.notes.trim() || undefined,
                    isNegative: counterForm.isNegative,
                    backlog: Number(counterForm.backlog) || 0
                };
                setShowCounterModal(false);
                setTargetChangeModal({
                    counter: baseUpdated,
                    prevTarget: oldTarget,
                    newTarget: validatedTarget,
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
                        targetCount: validatedTarget,
                        targetHistory: isTotal ? [] : (c.targetHistory || []),
                        unit: counterForm.unit.trim() || undefined,
                        step: validatedStep,
                        quickSteps: parsedQuickSteps.length > 0 ? parsedQuickSteps : [1, 5, 10],
                        color: counterForm.color,
                        notes: counterForm.notes.trim() || undefined,
                        isNegative: counterForm.isNegative,
                        todayCount: isTotal ? (Number(counterForm.currentCount) || 0) : c.todayCount,
                        backlog: isTotal ? 0 : (Number(counterForm.backlog) || 0)
                    };
                }
                return c;
            });
            setCounters(updated);
            saveCounters(updated);
        } else {
            // New counter
            const isTotal = counterForm.cadence === 'total';
            const todayStr = getTodayDateStr();
            const newCounter: CounterItem = {
                id: `cnt-${Date.now()}`,
                name: counterForm.name.trim(),
                cadence: counterForm.cadence,
                targetCount: validatedTarget,
                unit: counterForm.unit.trim() || undefined,
                step: validatedStep,
                quickSteps: parsedQuickSteps.length > 0 ? parsedQuickSteps : [1, 5, 10],
                color: counterForm.color,
                notes: counterForm.notes.trim() || undefined,
                isNegative: counterForm.isNegative,
                createdAt: Date.now(),
                startDate: todayStr,
                backlog: isTotal ? 0 : (Number(counterForm.backlog) || 0),
                todayCount: isTotal ? (Number(counterForm.currentCount) || 0) : 0,
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
        const prevTarget = counter.cadence === 'total' ? counter.targetCount : getTargetForDate(counter, selectedDate);
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

    // Open Backlog Edit Modal directly from the card
    const handleOpenEditBacklog = (counter: CounterItem) => {
        const stats = calculateCounterStats(counter, selectedDate);
        setBacklogEditModal({
            counter,
            currentBacklog: stats.backlog,
            newBacklog: stats.backlog
        });
    };

    // Save Backlog Edit: adjusts stored counter.backlog so live backlog matches user's desired value
    const handleSaveBacklogEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!backlogEditModal) return;
        const { counter, newBacklog } = backlogEditModal;
        const stats = calculateCounterStats(counter, selectedDate);
        const difference = Number(newBacklog) - stats.backlog;
        const currentStored = counter.backlog || 0;
        const adjustedStored = currentStored + difference;

        const updated = counters.map(c => {
            if (c.id === counter.id) {
                return {
                    ...c,
                    backlog: adjustedStored
                };
            }
            return c;
        });

        setCounters(updated);
        saveCounters(updated);
        setBacklogEditModal(null);
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
                            Track daily/weekly routines with backlog pacing, or plain counters that count up to a target without dates or backlog.
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
                                    className={`counter-card ${stats.isMet ? 'is-met' : ''}`}
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
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                                                    <span style={{
                                                        width: '9px',
                                                        height: '9px',
                                                        borderRadius: '50%',
                                                        background: hexColor,
                                                        boxShadow: `0 0 8px ${hexColor}88`,
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
                                                        fontSize: '10px',
                                                        fontWeight: '700',
                                                        letterSpacing: '0.4px',
                                                        textTransform: 'uppercase',
                                                        padding: '2px 7px',
                                                        borderRadius: '5px',
                                                        background: counter.cadence === 'total' ? 'rgba(0, 245, 212, 0.12)' : 'rgba(255, 255, 255, 0.07)',
                                                        color: counter.cadence === 'total' ? 'var(--accent)' : 'var(--text-secondary)'
                                                    }}>
                                                        {counter.cadence === 'total' ? 'Plain Counter' : counter.cadence}
                                                    </span>

                                                    {counter.isNegative && (
                                                        <span style={{
                                                            fontSize: '10px',
                                                            fontWeight: '700',
                                                            letterSpacing: '0.4px',
                                                            padding: '2px 7px',
                                                            borderRadius: '5px',
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
                                                            maxWidth: '180px'
                                                        }}>
                                                            {counter.notes}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions: Focus, Duplicate, Edit, Delete */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <button
                                                type="button"
                                                className="icon-btn"
                                                onClick={() => setFocusClickerCounter(counter)}
                                                title="Focus Fullscreen Clicker"
                                                style={{ padding: '6px', color: 'var(--accent)' }}
                                            >
                                                <Maximize2 size={15} />
                                            </button>
                                            <button
                                                type="button"
                                                className="icon-btn"
                                                onClick={() => handleDuplicateCounter(counter)}
                                                title="Duplicate Counter"
                                                style={{ padding: '6px', color: 'var(--text-secondary)' }}
                                            >
                                                <Copy size={15} />
                                            </button>
                                            <button
                                                type="button"
                                                className="icon-btn"
                                                onClick={() => handleOpenEditCounter(counter)}
                                                title="Edit Counter"
                                                style={{ padding: '6px', color: 'var(--text-secondary)' }}
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            <button
                                                type="button"
                                                className="icon-btn"
                                                onClick={() => handleDeleteCounter(counter.id)}
                                                title="Delete Counter"
                                                style={{ padding: '6px', color: '#EF4444' }}
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Prominent Unified Count & Pacing Card */}
                                    <div style={{
                                        background: 'rgba(0, 0, 0, 0.25)',
                                        borderRadius: '12px',
                                        padding: '12px 14px',
                                        border: '1px solid var(--panel-border)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '10px'
                                    }}>
                                        {/* Count & Status Row */}
                                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                                    <span style={{
                                                        fontSize: '32px',
                                                        fontWeight: '800',
                                                        color: stats.isMet ? '#10B981' : hexColor,
                                                        lineHeight: 1,
                                                        fontVariantNumeric: 'tabular-nums'
                                                    }}>
                                                        {stats.todayCount}
                                                    </span>
                                                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                                                        {counter.unit || 'reps'}
                                                    </span>
                                                </div>
                                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                    {counter.cadence === 'total'
                                                        ? `Target: ${counter.targetCount} ${counter.unit || 'reps'}`
                                                        : counter.cadence === 'weekly'
                                                            ? 'Logged this week'
                                                            : `Logged on ${formatDisplayDate(selectedDate)}`}
                                                </span>
                                            </div>

                                            <div style={{ textAlign: 'right' }}>
                                                {stats.isMet ? (
                                                    <div style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        padding: '3px 9px',
                                                        borderRadius: '20px',
                                                        background: 'rgba(16, 185, 129, 0.15)',
                                                        color: '#10B981',
                                                        fontSize: '11px',
                                                        fontWeight: '700'
                                                    }}>
                                                        <CheckCircle2 size={13} />
                                                        <span>Target Met!</span>
                                                    </div>
                                                ) : (
                                                    <div style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '3px 9px',
                                                        borderRadius: '20px',
                                                        background: 'rgba(255, 255, 255, 0.06)',
                                                        fontSize: '11px',
                                                        fontWeight: '600'
                                                    }}>
                                                        <span style={{ color: '#fff', fontWeight: '700' }}>
                                                            {stats.remainingToday}
                                                        </span>
                                                        <span style={{ color: 'var(--text-secondary)' }}>to go ({stats.percentage}%)</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div style={{
                                            width: '100%',
                                            height: '6px',
                                            borderRadius: '999px',
                                            background: 'rgba(255, 255, 255, 0.08)',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                width: `${Math.min(100, stats.percentage)}%`,
                                                height: '100%',
                                                background: stats.isMet ? '#10B981' : hexColor,
                                                borderRadius: '999px',
                                                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                            }} />
                                        </div>

                                        {/* Target & Backlog Footer Strip */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '8px',
                                            fontSize: '11px',
                                            paddingTop: '6px',
                                            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                                            color: 'var(--text-secondary)',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {counter.cadence === 'total' ? (
                                                <>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <span>Target: <strong style={{ color: '#fff' }}>{counter.targetCount}</strong> <span style={{ opacity: 0.7 }}>{counter.unit || 'reps'}</span></span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenChangeTarget(counter)}
                                                            style={{
                                                                background: 'transparent',
                                                                border: 'none',
                                                                color: 'var(--accent)',
                                                                cursor: 'pointer',
                                                                padding: '0 2px',
                                                                fontSize: '11px',
                                                                fontWeight: '600',
                                                                textDecoration: 'underline'
                                                            }}
                                                        >
                                                            Edit
                                                        </button>
                                                    </div>
                                                    <div style={{ color: stats.isMet ? '#10B981' : 'var(--text-secondary)', fontWeight: '600' }}>
                                                        {stats.isMet ? 'Target reached! 🎯' : `${stats.percentage}% done`}
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <span>
                                                            {counter.cadence === 'weekly' ? 'Week Target' : 'Target'}:{' '}
                                                            <strong style={{ color: '#fff' }}>{stats.todayTarget}</strong>{' '}
                                                            <span style={{ opacity: 0.7 }}>{counter.unit || 'reps'}</span>
                                                            {counter.cadence === 'weekly' && stats.dailyPace ? (
                                                                <span style={{ opacity: 0.6, fontSize: '10px', marginLeft: '3px' }}>
                                                                    (~{stats.dailyPace}/d)
                                                                </span>
                                                            ) : null}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenChangeTarget(counter)}
                                                            style={{
                                                                background: 'transparent',
                                                                border: 'none',
                                                                color: 'var(--accent)',
                                                                cursor: 'pointer',
                                                                padding: '0 2px',
                                                                fontSize: '11px',
                                                                fontWeight: '600',
                                                                textDecoration: 'underline'
                                                            }}
                                                            title="Change Target (Prompt scope)"
                                                        >
                                                            Edit
                                                        </button>
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <span>
                                                            Backlog:{' '}
                                                            <strong style={{
                                                                color: stats.backlog > 0 ? '#FF9F1C' : (stats.backlog === 0 ? '#10B981' : '#00F5D4')
                                                            }}>
                                                                {stats.backlog > 0 ? `+${stats.backlog}` : stats.backlog}
                                                            </strong>
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenEditBacklog(counter)}
                                                            style={{
                                                                background: 'transparent',
                                                                border: 'none',
                                                                color: 'var(--accent)',
                                                                cursor: 'pointer',
                                                                padding: '0 2px',
                                                                fontSize: '11px',
                                                                fontWeight: '600',
                                                                textDecoration: 'underline'
                                                            }}
                                                            title="Edit Backlog"
                                                        >
                                                            Edit
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Quick Play Controls */}
                                    <div className="counter-btn-row">
                                        {/* Decrement Button */}
                                        <button
                                            type="button"
                                            className="secondary"
                                            onClick={() => handleDelta(counter, -(counter.step || 1))}
                                            disabled={stats.todayCount <= 0}
                                            title={`Minus ${counter.step || 1}`}
                                            style={{
                                                width: '38px',
                                                height: '38px',
                                                borderRadius: '8px',
                                                opacity: stats.todayCount <= 0 ? 0.35 : 1,
                                                cursor: stats.todayCount <= 0 ? 'not-allowed' : 'pointer',
                                                flexShrink: 0
                                            }}
                                        >
                                            <Minus size={15} />
                                        </button>

                                        {/* Quick Step Increment Buttons */}
                                        {(counter.quickSteps || [1, 5, 10]).map(step => (
                                            <button
                                                key={step}
                                                type="button"
                                                className="secondary"
                                                onClick={() => handleDelta(counter, step)}
                                                style={{
                                                    flex: 1,
                                                    minWidth: '44px',
                                                    height: '38px',
                                                    borderRadius: '8px',
                                                    fontWeight: '700',
                                                    fontSize: '13px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                +{step}
                                            </button>
                                        ))}

                                        {/* Distraction / Reason Log button */}
                                        <button
                                            type="button"
                                            className="secondary"
                                            onClick={() => handleOpenReasonModal(counter, counter.step || 1)}
                                            title="Add with Reason (When & Why)"
                                            style={{
                                                width: '38px',
                                                height: '38px',
                                                borderRadius: '8px',
                                                color: counter.isNegative ? '#EF4444' : 'var(--accent)',
                                                cursor: 'pointer',
                                                flexShrink: 0
                                            }}
                                        >
                                            <MessageSquare size={15} />
                                        </button>

                                        {/* Reset Count Button */}
                                        <button
                                            type="button"
                                            className="icon-btn"
                                            onClick={() => handleResetDay(counter)}
                                            title={counter.cadence === 'total' ? 'Reset count to 0' : 'Reset period count to 0'}
                                            style={{
                                                width: '36px',
                                                height: '38px',
                                                padding: '6px',
                                                borderRadius: '8px',
                                                color: 'var(--text-secondary)',
                                                cursor: 'pointer',
                                                flexShrink: 0,
                                                opacity: 0.8
                                            }}
                                        >
                                            <RotateCcw size={15} />
                                        </button>
                                    </div>

                                    {/* Bottom Links: History */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'flex-start',
                                        alignItems: 'center'
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
                                                {stats.events.length} {stats.events.length === 1 ? 'log' : 'logs'}{counter.cadence === 'total' ? '' : counter.cadence === 'weekly' ? ' this week' : ' today'} {isExpanded ? '▲' : '▼'}
                                            </span>
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
                                                    {counter.cadence === 'total' ? 'No entries recorded yet.' : counter.cadence === 'weekly' ? 'No entries recorded this week.' : 'No entries recorded for this date.'}
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
            <BaseModal
                isOpen={showCounterModal}
                onClose={() => setShowCounterModal(false)}
                maxWidth="460px"
                bodyClassName="modal-body-fixed-footer"
                title={editingCounter ? 'Edit Counter' : 'New Counter'}
            >
                <form onSubmit={handleSaveCounterForm} className="modal-form-layout">
                    <div className="modal-form-content">
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
                                    <option value="total">Plain Counter (No date bound / to target)</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                    {counterForm.cadence === 'total' ? 'Target to Reach' : counterForm.cadence === 'weekly' ? 'Weekly Target Count' : 'Daily Target Count'}
                                </label>
                                <input
                                    type="number"
                                    min="0.0001"
                                    step="any"
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
                                    placeholder="reps, zikr, glasses, km, hours"
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '14px' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                    Default Step
                                </label>
                                <input
                                    type="number"
                                    min="0.0001"
                                    step="any"
                                    value={counterForm.step}
                                    onChange={e => {
                                        const val = parseFloat(e.target.value);
                                        setCounterForm(prev => ({ ...prev, step: !isNaN(val) ? val : 0 }));
                                    }}
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

                        {counterForm.cadence === 'total' ? (
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--panel-border)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                        Current Count ({counterForm.unit || 'reps'})
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setCounterForm(prev => ({ ...prev, currentCount: 0 }))}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--accent)',
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                            padding: 0,
                                            fontWeight: '600',
                                            textDecoration: 'underline'
                                        }}
                                    >
                                        Reset to 0
                                    </button>
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={counterForm.currentCount}
                                    onChange={e => setCounterForm(prev => ({ ...prev, currentCount: Math.max(0, Number(e.target.value) || 0) }))}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '14px' }}
                                />
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.3 }}>
                                    Current count towards target. Tap step buttons on the card or adjust the count directly here.
                                </div>
                            </div>
                        ) : editingCounter && (
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--panel-border)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                        Accumulated Backlog ({counterForm.unit || 'reps'})
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setCounterForm(prev => ({ ...prev, backlog: 0 }))}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--accent)',
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                            padding: 0,
                                            fontWeight: '600',
                                            textDecoration: 'underline'
                                        }}
                                    >
                                        Reset to 0
                                    </button>
                                </div>
                                <input
                                    type="number"
                                    step="any"
                                    value={counterForm.backlog}
                                    onChange={e => setCounterForm(prev => ({ ...prev, backlog: Number(e.target.value) || 0 }))}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '14px' }}
                                />
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.3 }}>
                                    Cumulative backlog accumulated before today. Adjust this to account for previously completed counts you forgot to log.
                                </div>
                            </div>
                        )}

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#fff' }}>
                            <input
                                type="checkbox"
                                checked={counterForm.isNegative}
                                onChange={e => setCounterForm(prev => ({ ...prev, isNegative: e.target.checked }))}
                            />
                            <span>Track as Vice/Distraction (e.g. doomscrolling, smoking)</span>
                        </label>
                    </div>

                    <div className="modal-form-actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        {editingCounter ? (
                            <button
                                type="button"
                                className="secondary"
                                onClick={() => {
                                    handleDuplicateCounter(editingCounter);
                                    setShowCounterModal(false);
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                title="Create a copy of this counter"
                            >
                                <Copy size={14} />
                                <span>Duplicate</span>
                            </button>
                        ) : <div />}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button type="button" className="secondary" onClick={() => setShowCounterModal(false)}>
                                Cancel
                            </button>
                            <button type="submit" className="primary" style={{ padding: '8px 18px', borderRadius: '8px' }}>
                                {editingCounter ? 'Update Counter' : 'Create Counter'}
                            </button>
                        </div>
                    </div>
                </form>
            </BaseModal>

            {/* Modal 2: Target Scope Change Prompt */}
            <BaseModal
                isOpen={!!targetChangeModal}
                onClose={() => setTargetChangeModal(null)}
                maxWidth="440px"
                bodyClassName="modal-body-fixed-footer"
                title={targetChangeModal ? `Change Target for "${targetChangeModal.counter.name}"` : ''}
            >
                {targetChangeModal && (
                    <div className="modal-form-layout">
                        <div className="modal-form-content">
                            {/* 1. Show Previous Target */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.04)',
                                borderRadius: '10px',
                                padding: '12px 14px',
                                border: '1px solid var(--panel-border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '700', letterSpacing: '0.5px' }}>
                                        Previous Target
                                    </span>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                        {targetChangeModal.counter.cadence === 'total' ? 'Current Goal' : `Active for ${formatDisplayDate(selectedDate)}`}
                                    </div>
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>
                                    {targetChangeModal.prevTarget} <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>{targetChangeModal.counter.unit || 'reps'}</span>
                                </div>
                            </div>

                            {/* 2. Accept New Target */}
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                                    New Target ({targetChangeModal.counter.unit || 'reps'}) *
                                </label>
                                <input
                                    type="number"
                                    min="0.0001"
                                    step="any"
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

                            {/* 3. Ask whether to set from today or change for all (Only for date-bound counters) */}
                            {targetChangeModal.counter.cadence === 'total' ? (
                                <div style={{
                                    background: 'rgba(0, 245, 212, 0.08)',
                                    border: '1px solid rgba(0, 245, 212, 0.25)',
                                    borderRadius: '10px',
                                    padding: '12px',
                                    fontSize: '12px',
                                    color: 'var(--text-secondary)',
                                    lineHeight: 1.4
                                }}>
                                    <strong style={{ color: '#fff', display: 'block', marginBottom: '2px' }}>Plain Counter (No date bound)</strong>
                                    This counter has no backlog or historical dates. Applying will directly update the target to {targetChangeModal.newTarget} {targetChangeModal.counter.unit || 'reps'}.
                                </div>
                            ) : (
                                <div>
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
                            )}
                        </div>

                        <div className="modal-form-actions" style={{ justifyContent: 'flex-end' }}>
                            <button type="button" className="secondary" onClick={() => setTargetChangeModal(null)}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="primary"
                                onClick={handleConfirmTargetChange}
                                style={{ padding: '8px 20px', borderRadius: '8px', fontWeight: '700' }}
                            >
                                Apply Target
                            </button>
                        </div>
                    </div>
                )}
            </BaseModal>

            {/* Modal 3: Direct Backlog Edit Modal */}
            <BaseModal
                isOpen={!!backlogEditModal}
                onClose={() => setBacklogEditModal(null)}
                maxWidth="440px"
                bodyClassName="modal-body-fixed-footer"
                title={backlogEditModal ? `Edit Backlog for "${backlogEditModal.counter.name}"` : ''}
            >
                {backlogEditModal && (
                    <form onSubmit={handleSaveBacklogEdit} className="modal-form-layout">
                        <div className="modal-form-content">
                            {/* Current Live Backlog Display */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.04)',
                                borderRadius: '10px',
                                padding: '12px 14px',
                                border: '1px solid var(--panel-border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '700', letterSpacing: '0.5px' }}>
                                        Current Live Backlog
                                    </span>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                        {backlogEditModal.currentBacklog > 0 ? 'Behind target' : (backlogEditModal.currentBacklog === 0 ? 'On track' : 'Ahead of target')}
                                    </div>
                                </div>
                                <div style={{
                                    fontSize: '18px',
                                    fontWeight: '800',
                                    color: backlogEditModal.currentBacklog > 0 ? '#FF9F1C' : (backlogEditModal.currentBacklog === 0 ? '#10B981' : '#00F5D4')
                                }}>
                                    {backlogEditModal.currentBacklog > 0 ? `+${backlogEditModal.currentBacklog}` : backlogEditModal.currentBacklog} <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>{backlogEditModal.counter.unit || 'reps'}</span>
                                </div>
                            </div>

                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                        New Backlog ({backlogEditModal.counter.unit || 'reps'}) *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setBacklogEditModal(prev => prev ? { ...prev, newBacklog: 0 } : null)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--accent)',
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                            padding: 0,
                                            fontWeight: '600',
                                            textDecoration: 'underline'
                                        }}
                                    >
                                        Set to 0 (Clear Backlog)
                                    </button>
                                </div>
                                <input
                                    type="number"
                                    value={backlogEditModal.newBacklog}
                                    onChange={e => setBacklogEditModal(prev => prev ? { ...prev, newBacklog: Number(e.target.value) || 0 } : null)}
                                    autoFocus
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        fontSize: '18px',
                                        fontWeight: '800',
                                        background: 'rgba(0, 0, 0, 0.3)',
                                        border: '1px solid var(--panel-border)',
                                        color: '#fff'
                                    }}
                                />
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.4 }}>
                                    Tip: If you completed reps in the past that you forgot to log, decrease this number (e.g. by subtracting the done amount) or set it to 0.
                                </div>
                            </div>

                            {/* Quick delta adjustment pills */}
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                                    Quick Adjust (e.g. forgot to log reps):
                                </label>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {(backlogEditModal.counter.quickSteps || [1, 5, 10, 25]).map(step => (
                                        <button
                                            key={`sub-${step}`}
                                            type="button"
                                            className="secondary"
                                            onClick={() => setBacklogEditModal(prev => prev ? { ...prev, newBacklog: prev.newBacklog - step } : null)}
                                            style={{
                                                padding: '6px 10px',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                background: 'rgba(255, 255, 255, 0.05)'
                                            }}
                                            title={`Logged ${step} previously`}
                                        >
                                            -{step} {backlogEditModal.counter.unit || 'reps'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="modal-form-actions" style={{ justifyContent: 'flex-end' }}>
                            <button type="button" className="secondary" onClick={() => setBacklogEditModal(null)}>
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="primary"
                                style={{ padding: '8px 20px', borderRadius: '8px', fontWeight: '700' }}
                            >
                                Save Backlog
                            </button>
                        </div>
                    </form>
                )}
            </BaseModal>

            {/* Modal 4: Log with Reason (When & Why) */}
            <BaseModal
                isOpen={!!reasonModal}
                onClose={() => setReasonModal(null)}
                maxWidth="380px"
                bodyClassName="modal-body-fixed-footer"
                title={reasonModal ? `Log ${reasonModal.counter.name}` : ''}
            >
                {reasonModal && (
                    <form onSubmit={handleSaveReasonDelta} className="modal-form-layout">
                        <div className="modal-form-content">
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
                        </div>

                        <div className="modal-form-actions" style={{ justifyContent: 'flex-end' }}>
                            <button type="button" className="secondary" onClick={() => setReasonModal(null)}>
                                Cancel
                            </button>
                            <button type="submit" className="primary" style={{ padding: '8px 18px', borderRadius: '8px' }}>
                                Record Entry
                            </button>
                        </div>
                    </form>
                )}
            </BaseModal>

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
                                    {focusClickerCounter.cadence === 'total' ? 'Plain Counter' : `${focusClickerCounter.cadence} Clicker`}
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
                                    WebkitUserSelect: 'none',
                                    touchAction: 'manipulation'
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
                                        {stats.remainingToday} {focusClickerCounter.unit || 'reps'} remaining{focusClickerCounter.cadence === 'total' ? '' : ' today'}
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
