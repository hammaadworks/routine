import React, { useState } from 'react';
import { Plus, Trash2, Calendar } from 'lucide-react';
import BaseModal from '../BaseModal';
import type { PlatformConfig, BaseSlotTemplate } from '../../types/dispatch';

interface WeeklyScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    platform: PlatformConfig | null;
    personaName: string;
    initialDayOfWeek?: number;
    onSaveSchedule: (platformId: string, updatedSchedule: Record<number, BaseSlotTemplate[]>) => void;
}

const DAYS_OF_WEEK = [
    { day: 0, label: 'Sunday', short: 'Sun' },
    { day: 1, label: 'Monday', short: 'Mon' },
    { day: 2, label: 'Tuesday', short: 'Tue' },
    { day: 3, label: 'Wednesday', short: 'Wed' },
    { day: 4, label: 'Thursday', short: 'Thu' },
    { day: 5, label: 'Friday', short: 'Fri' },
    { day: 6, label: 'Saturday', short: 'Sat' }
];

export default function WeeklyScheduleModal({
    isOpen,
    onClose,
    platform,
    personaName,
    initialDayOfWeek,
    onSaveSchedule
}: WeeklyScheduleModalProps) {
    const [selectedDay, setSelectedDay] = useState<number>(() => initialDayOfWeek ?? new Date().getDay());
    const [scheduleState, setScheduleState] = useState<Record<number, BaseSlotTemplate[]>>({});
    const [newSlotTitle, setNewSlotTitle] = useState('');

    React.useEffect(() => {
        if (platform) {
            setScheduleState(JSON.parse(JSON.stringify(platform.weeklySchedule || {})));
        }
        if (initialDayOfWeek !== undefined) {
            setSelectedDay(initialDayOfWeek);
        }
    }, [platform, initialDayOfWeek, isOpen]);

    if (!isOpen || !platform) return null;

    const currentSlots = scheduleState[selectedDay] || [];

    const handleAddSlot = () => {
        if (!newSlotTitle.trim()) return;
        const newSlot: BaseSlotTemplate = {
            id: `slot_${platform.platform}_${Date.now()}`,
            title: newSlotTitle.trim()
        };
        const updated = {
            ...scheduleState,
            [selectedDay]: [...currentSlots, newSlot]
        };
        setScheduleState(updated);
        setNewSlotTitle('');
    };

    const handleDeleteSlot = (slotId: string) => {
        const updated = {
            ...scheduleState,
            [selectedDay]: currentSlots.filter(s => s.id !== slotId)
        };
        setScheduleState(updated);
    };

    const handleClearDay = () => {
        setScheduleState(prev => ({
            ...prev,
            [selectedDay]: []
        }));
    };

    const handleClearAllDays = () => {
        if (window.confirm(`Clear all recurring rules across all days for ${platform.label}?`)) {
            setScheduleState({
                0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
            });
        }
    };

    const handleSave = () => {
        onSaveSchedule(platform.id, scheduleState);
        onClose();
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={18} color="var(--accent)" />
                    <span>Weekly Rules: {platform.label} ({personaName})</span>
                </div>
            }
            maxWidth="520px"
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Define the default recurring posting slots for each day of the week. These slots automatically populate your daily checklist.
                </p>

                {/* Day of Week Selector */}
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {DAYS_OF_WEEK.map(({ day, short }) => {
                        const count = (scheduleState[day] || []).length;
                        const isSelected = selectedDay === day;
                        return (
                            <button
                                key={day}
                                onClick={() => setSelectedDay(day)}
                                style={{
                                    flex: 1,
                                    padding: '8px 4px',
                                    borderRadius: '8px',
                                    border: isSelected ? '1px solid var(--accent)' : '1px solid var(--panel-border)',
                                    background: isSelected ? 'var(--block-bg)' : 'rgba(255, 255, 255, 0.02)',
                                    color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '2px',
                                    fontSize: '12px',
                                    fontWeight: isSelected ? '600' : 'normal'
                                }}
                            >
                                <span>{short}</span>
                                <span style={{
                                    fontSize: '10px',
                                    color: count > 0 ? (isSelected ? 'var(--accent)' : 'var(--text-secondary)') : 'rgba(255, 255, 255, 0.2)'
                                }}>
                                    {count} {count === 1 ? 'slot' : 'slots'}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Slots List for Selected Day */}
                <div style={{
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '8px',
                    border: '1px solid var(--panel-border)',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    minHeight: '140px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)' }}>
                            {DAYS_OF_WEEK.find(d => d.day === selectedDay)?.label} ({currentSlots.length} Target)
                        </span>
                        {currentSlots.length > 0 && (
                            <button
                                type="button"
                                onClick={handleClearDay}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--danger)',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    padding: '2px 6px'
                                }}
                            >
                                Clear day
                            </button>
                        )}
                    </div>

                    {currentSlots.length === 0 ? (
                        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                            No scheduled slots for this day. Add one below!
                        </div>
                    ) : (
                        currentSlots.map((slot, index) => (
                            <div
                                key={slot.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 10px',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(255, 255, 255, 0.06)'
                                }}
                            >
                                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                                    <strong style={{ color: 'var(--accent)', marginRight: '6px' }}>#{index + 1}</strong>
                                    {slot.title}
                                </span>
                                <button
                                    onClick={() => handleDeleteSlot(slot.id)}
                                    title="Remove Slot Template"
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'flex'
                                    }}
                                >
                                    <Trash2 size={14} color="var(--danger)" />
                                </button>
                            </div>
                        ))
                    )}

                    {/* Add Slot to Selected Day */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        <input
                            type="text"
                            placeholder="e.g. Boxing video, Live clip..."
                            value={newSlotTitle}
                            onChange={(e) => setNewSlotTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddSlot();
                                }
                            }}
                            style={{
                                flex: 1,
                                padding: '8px 10px',
                                borderRadius: '6px',
                                border: '1px solid var(--panel-border)',
                                background: 'rgba(0, 0, 0, 0.3)',
                                color: 'var(--text-primary)',
                                fontSize: '13px',
                                outline: 'none'
                            }}
                        />
                        <button
                            onClick={handleAddSlot}
                            disabled={!newSlotTitle.trim()}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid var(--accent)',
                                background: 'var(--block-bg)',
                                color: 'var(--accent)',
                                fontWeight: '600',
                                fontSize: '12px',
                                cursor: newSlotTitle.trim() ? 'pointer' : 'not-allowed',
                                opacity: newSlotTitle.trim() ? 1 : 0.5,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <Plus size={14} />
                            Add
                        </button>
                    </div>
                </div>

                {/* Footer Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    {Object.values(scheduleState).some(slots => (slots || []).length > 0) ? (
                        <button
                            type="button"
                            onClick={handleClearAllDays}
                            style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                background: 'rgba(239, 68, 68, 0.08)',
                                color: '#EF4444',
                                fontSize: '11.5px',
                                cursor: 'pointer'
                            }}
                        >
                            Clear All Rules
                        </button>
                    ) : <div />}

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={onClose}
                        style={{
                            padding: '8px 14px',
                            borderRadius: '6px',
                            border: '1px solid var(--panel-border)',
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        style={{
                            padding: '8px 18px',
                            borderRadius: '6px',
                            border: '1px solid var(--accent)',
                            background: 'var(--accent)',
                            color: '#111418',
                            fontWeight: '600',
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        Save Rules
                    </button>
                    </div>
                </div>
            </div>
        </BaseModal>
    );
}
