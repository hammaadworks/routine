import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Package, Check } from 'lucide-react';
import BaseModal from '../BaseModal';
import type { HabitBundle, HabitBundleItem } from '../../types/routine';
import { parseDuration, formatDuration, getGoalColor } from '../../utils';

interface BundleModalProps {
    isOpen: boolean;
    onClose: () => void;
    bundleToEdit?: HabitBundle | null;
    habits: any[];
    routineGoals?: any[];
    lifeGoals?: any[];
    moneyGoals?: any[];
    onSave: (bundle: HabitBundle) => void;
}

export default function BundleModal({
    isOpen,
    onClose,
    bundleToEdit,
    habits,
    routineGoals = [],
    lifeGoals = [],
    moneyGoals = [],
    onSave
}: BundleModalProps) {
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [items, setItems] = useState<HabitBundleItem[]>([]);
    const [selectedHabitId, setSelectedHabitId] = useState('');
    const [customDurationInput, setCustomDurationInput] = useState('15');

    useEffect(() => {
        if (bundleToEdit) {
            setName(bundleToEdit.name || '');
            setDesc(bundleToEdit.desc || '');
            setItems(bundleToEdit.items || []);
        } else {
            setName('');
            setDesc('');
            setItems([]);
        }
        setSelectedHabitId('');
        setCustomDurationInput('15');
    }, [bundleToEdit, isOpen]);

    // When habit is picked from dropdown, update duration input default
    const handleSelectHabit = (habitId: string) => {
        setSelectedHabitId(habitId);
        if (!habitId) return;
        const habit = habits.find(h => h.id === habitId);
        if (habit) {
            const rawDur = habit.duration || habit.time;
            const parsed = rawDur ? parseDuration(rawDur) : 15;
            setCustomDurationInput(String(parsed > 0 ? parsed : 15));
        }
    };

    const handleAddItem = () => {
        if (!selectedHabitId) return;
        const habit = habits.find(h => h.id === selectedHabitId);
        if (!habit) return;

        const hexes = getGoalColor(habit, routineGoals, lifeGoals, moneyGoals);
        const color = (hexes && hexes[0]) || habit.color || '#3b82f6';
        const durationMins = parseDuration(customDurationInput) || 15;

        const newItem: HabitBundleItem = {
            id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            habitId: habit.id,
            name: habit.name || 'Untitled Habit',
            duration: durationMins,
            color,
            isPublic: habit.isPublic ?? (habit.name || '').includes('[public]')
        };

        setItems(prev => [...prev, newItem]);
        setSelectedHabitId('');
        setCustomDurationInput('15');
    };

    const handleRemoveItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleMoveItem = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= items.length) return;

        setItems(prev => {
            const next = [...prev];
            const currentItem = next[index];
            const targetItem = next[targetIndex];
            if (!currentItem || !targetItem) return prev;
            next[index] = targetItem;
            next[targetIndex] = currentItem;
            return next;
        });
    };

    const handleItemDurationChange = (index: number, newDurationStr: string) => {
        const val = parseInt(newDurationStr, 10);
        const mins = isNaN(val) ? 0 : Math.max(1, Math.min(1440, val));
        setItems(prev => prev.map((item, i) => i === index ? { ...item, duration: mins } : item));
    };

    const totalDuration = items.reduce((acc, item) => acc + (item.duration || 0), 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = name.trim();
        if (!trimmedName || items.length === 0) return;

        const bundle: HabitBundle = {
            id: bundleToEdit?.id || `bundle-${Date.now()}`,
            name: trimmedName,
            desc: desc.trim(),
            color: items[0]?.color || '#eab308',
            items
        };

        onSave(bundle);
        onClose();
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Package size={20} style={{ color: 'var(--accent)' }} />
                    <span>{bundleToEdit ? 'Edit Habit Bundle' : 'New Habit Bundle'}</span>
                </div>
            }
            maxWidth="520px"
        >
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                        Bundle Name <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
                    </label>
                    <input
                        type="text"
                        required
                        placeholder="e.g. bd, Morning Stack, Workout Warmup"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 12px',
                            background: 'var(--bg-input, rgba(255,255,255,0.05))',
                            border: '1px solid var(--panel-border)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '14px',
                            outline: 'none'
                        }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                        Description (optional)
                    </label>
                    <input
                        type="text"
                        placeholder="Short note or purpose for this combo"
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: 'var(--bg-input, rgba(255,255,255,0.05))',
                            border: '1px solid var(--panel-border)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            outline: 'none'
                        }}
                    />
                </div>

                {/* Sub-habits in this bundle */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            Habits in Bundle ({items.length})
                        </label>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>
                            Total: {formatDuration(totalDuration)}
                        </span>
                    </div>

                    {/* Ordered List of Habits */}
                    {items.length === 0 ? (
                        <div style={{
                            padding: '16px',
                            textAlign: 'center',
                            borderRadius: '6px',
                            border: '1px dashed var(--panel-border)',
                            color: 'var(--text-secondary)',
                            fontSize: '13px'
                        }}>
                            No habits added yet. Select a habit below to add it to the bundle.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                            {items.map((item, idx) => (
                                <div
                                    key={item.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 10px',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid var(--panel-border)',
                                        borderLeft: `4px solid ${item.color || 'var(--accent)'}`,
                                        borderRadius: '6px'
                                    }}
                                >
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', width: '20px' }}>
                                        #{idx + 1}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {item.name}
                                        </div>
                                    </div>

                                    {/* Duration Input */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <input
                                            type="number"
                                            min={1}
                                            max={720}
                                            value={item.duration}
                                            onChange={e => handleItemDurationChange(idx, e.target.value)}
                                            style={{
                                                width: '50px',
                                                padding: '4px 6px',
                                                fontSize: '12px',
                                                textAlign: 'right',
                                                background: 'var(--bg-input, rgba(0,0,0,0.3))',
                                                border: '1px solid var(--panel-border)',
                                                borderRadius: '4px',
                                                color: 'var(--text-primary)',
                                                outline: 'none'
                                            }}
                                        />
                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>m</span>
                                    </div>

                                    {/* Reorder Buttons */}
                                    <div style={{ display: 'flex', gap: '2px' }}>
                                        <button
                                            type="button"
                                            disabled={idx === 0}
                                            onClick={() => handleMoveItem(idx, 'up')}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: idx === 0 ? 'rgba(255,255,255,0.15)' : 'var(--text-secondary)',
                                                cursor: idx === 0 ? 'default' : 'pointer',
                                                padding: '3px'
                                            }}
                                            title="Move Up"
                                        >
                                            <ArrowUp size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            disabled={idx === items.length - 1}
                                            onClick={() => handleMoveItem(idx, 'down')}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: idx === items.length - 1 ? 'rgba(255,255,255,0.15)' : 'var(--text-secondary)',
                                                cursor: idx === items.length - 1 ? 'default' : 'pointer',
                                                padding: '3px'
                                            }}
                                            title="Move Down"
                                        >
                                            <ArrowDown size={14} />
                                        </button>
                                    </div>

                                    {/* Remove Button */}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveItem(idx)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--danger, #ef4444)',
                                            cursor: 'pointer',
                                            padding: '4px',
                                            opacity: 0.8
                                        }}
                                        title="Remove from bundle"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Add Habit to Bundle Selector */}
                <div style={{
                    padding: '12px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        + Add Habit to Bundle
                    </span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select
                            value={selectedHabitId}
                            onChange={e => handleSelectHabit(e.target.value)}
                            style={{
                                flex: 1,
                                padding: '8px 10px',
                                background: 'var(--bg-input, rgba(0,0,0,0.3))',
                                border: '1px solid var(--panel-border)',
                                borderRadius: '6px',
                                color: 'var(--text-primary)',
                                fontSize: '13px',
                                outline: 'none'
                            }}
                        >
                            <option value="">-- Choose a Habit --</option>
                            {(habits || []).map((h: any) => (
                                <option key={h.id} value={h.id}>
                                    {h.name} {h.duration ? `(${h.duration}m)` : (h.time ? `(${h.time})` : '')}
                                </option>
                            ))}
                        </select>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                                type="number"
                                min={1}
                                max={720}
                                value={customDurationInput}
                                onChange={e => setCustomDurationInput(e.target.value)}
                                placeholder="Mins"
                                style={{
                                    width: '56px',
                                    padding: '8px 6px',
                                    fontSize: '13px',
                                    textAlign: 'right',
                                    background: 'var(--bg-input, rgba(0,0,0,0.3))',
                                    border: '1px solid var(--panel-border)',
                                    borderRadius: '6px',
                                    color: 'var(--text-primary)',
                                    outline: 'none'
                                }}
                            />
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>m</span>
                        </div>

                        <button
                            type="button"
                            disabled={!selectedHabitId}
                            onClick={handleAddItem}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '8px 14px',
                                background: selectedHabitId ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                                color: selectedHabitId ? '#000' : 'var(--text-secondary)',
                                fontWeight: 600,
                                fontSize: '13px',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: selectedHabitId ? 'pointer' : 'not-allowed'
                            }}
                        >
                            <Plus size={14} /> Add
                        </button>
                    </div>
                </div>

                {/* Submit / Cancel Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '8px 16px',
                            background: 'transparent',
                            border: '1px solid var(--panel-border)',
                            borderRadius: '6px',
                            color: 'var(--text-secondary)',
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!name.trim() || items.length === 0}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 20px',
                            background: (!name.trim() || items.length === 0) ? 'rgba(255,255,255,0.1)' : 'var(--accent)',
                            color: (!name.trim() || items.length === 0) ? 'var(--text-secondary)' : '#000',
                            fontWeight: 600,
                            fontSize: '13px',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: (!name.trim() || items.length === 0) ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <Check size={15} />
                        {bundleToEdit ? 'Save Changes' : 'Create Bundle'}
                    </button>
                </div>
            </form>
        </BaseModal>
    );
}
