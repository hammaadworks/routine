import React, { useState, useEffect } from 'react';
import { User, Trash2, Check } from 'lucide-react';
import BaseModal from '../BaseModal';
import type { CreatorPersona } from '../../types/dispatch';

interface PersonaModalProps {
    isOpen: boolean;
    onClose: () => void;
    persona: CreatorPersona | null; // null if creating a new persona
    onSave: (persona: CreatorPersona) => void;
    onDelete?: (personaId: string) => void;
}

const COLOR_PRESETS = [
    '#E1306C',
    '#FF0000',
    '#00F5D4',
    '#3B82F6',
    '#10B981',
    '#A855F7',
    '#F59E0B',
    '#C9A227'
];

export default function PersonaModal({
    isOpen,
    onClose,
    persona,
    onSave,
    onDelete
}: PersonaModalProps) {
    const [name, setName] = useState('');
    const [handle, setHandle] = useState('');
    const [chromeProfile, setChromeProfile] = useState('');
    const [color, setColor] = useState('#E1306C');

    useEffect(() => {
        if (persona) {
            setName(persona.name);
            setHandle(persona.handle);
            setChromeProfile(persona.chromeProfile || 'Profile 1');
            setColor(persona.color || '#E1306C');
        } else {
            setName('');
            setHandle('');
            setChromeProfile('Profile 1');
            setColor(COLOR_PRESETS[0] || '#E1306C');
        }
    }, [persona, isOpen]);

    if (!isOpen) return null;

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        const updatedPersona: CreatorPersona = {
            id: persona?.id || `persona_${Date.now()}`,
            name: name.trim(),
            handle: handle.trim().replace(/^@/, '') || name.trim().toLowerCase().replace(/\s+/g, ''),
            chromeProfile: chromeProfile.trim() || 'Profile 1',
            color: color || '#E1306C',
            platforms: persona?.platforms || []
        };

        onSave(updatedPersona);
        onClose();
    };

    const handleDelete = () => {
        if (!persona || !onDelete) return;
        if (window.confirm(`Are you sure you want to delete persona "${persona.name}" and all its channels?`)) {
            onDelete(persona.id);
            onClose();
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={18} color="var(--accent)" />
                    <span>{persona ? 'Edit Persona' : 'Add New Persona'}</span>
                </div>
            }
            maxWidth="460px"
        >
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Persona Name */}
                <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Display Name
                    </label>
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Hammaad Rawx, Works, Personal"
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--panel-border)',
                            background: 'rgba(0, 0, 0, 0.3)',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            outline: 'none'
                        }}
                    />
                </div>

                {/* Handle */}
                <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Handle / Username
                    </label>
                    <input
                        type="text"
                        value={handle}
                        onChange={e => setHandle(e.target.value)}
                        placeholder="e.g. hammaadrawx"
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--panel-border)',
                            background: 'rgba(0, 0, 0, 0.3)',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            outline: 'none'
                        }}
                    />
                </div>

                {/* Chrome Profile Name */}
                <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Default Chrome Profile
                    </label>
                    <input
                        type="text"
                        value={chromeProfile}
                        onChange={e => setChromeProfile(e.target.value)}
                        placeholder="e.g. Profile 1, Profile 2, Default"
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--panel-border)',
                            background: 'rgba(0, 0, 0, 0.3)',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            outline: 'none'
                        }}
                    />
                </div>

                {/* Color Badge Palette */}
                <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        Badge Color
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {COLOR_PRESETS.map(presetColor => (
                            <button
                                key={presetColor}
                                type="button"
                                onClick={() => setColor(presetColor)}
                                style={{
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: '50%',
                                    background: presetColor,
                                    border: color === presetColor ? '2px solid #fff' : '2px solid transparent',
                                    cursor: 'pointer',
                                    boxShadow: color === presetColor ? '0 0 6px rgba(255,255,255,0.4)' : 'none'
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Modal Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    {persona && onDelete ? (
                        <button
                            type="button"
                            onClick={handleDelete}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#EF4444',
                                fontSize: '12.5px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <Trash2 size={14} />
                            <span>Delete Persona</span>
                        </button>
                    ) : <div />}

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
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
                            type="submit"
                            style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                border: '1px solid var(--accent)',
                                background: 'var(--block-bg)',
                                color: 'var(--accent)',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <Check size={14} />
                            <span>Save Persona</span>
                        </button>
                    </div>
                </div>
            </form>
        </BaseModal>
    );
}
