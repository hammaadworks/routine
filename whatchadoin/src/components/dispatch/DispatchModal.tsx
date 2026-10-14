import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Send,
    ExternalLink,
    Plus,
    Trash2,
    Calendar,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Sparkles,
    Globe
} from 'lucide-react';
import BaseModal from '../BaseModal';
import WeeklyScheduleModal from './WeeklyScheduleModal';
import type {
    ContentDispatchStorage,
    CreatorPersona,
    PlatformConfig,
    BaseSlotTemplate
} from '../../types/dispatch';
import {
    loadDispatchData,
    saveDispatchData,
    getTodayDateStr,
    formatDisplayDate,
    addDays,
    getResolvedPlatformSlots,
    toggleSlotCompletion,
    addAdHocSlot,
    deleteSlot,
    calculateDailyMetrics,
    launchChromeProfile
} from '../../utils/dispatchStore';

interface DispatchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function DispatchModal({ isOpen, onClose }: DispatchModalProps) {
    const [dispatchData, setDispatchData] = useState<ContentDispatchStorage>(loadDispatchData);
    const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr);
    const [selectedPersonaId, setSelectedPersonaId] = useState<string>('all');
    const [adHocInputs, setAdHocInputs] = useState<Record<string, string>>({});
    const [launchStatus, setLaunchStatus] = useState<Record<string, string>>({});

    // Weekly schedule template modal state
    const [editingPlatform, setEditingPlatform] = useState<{
        platform: PlatformConfig;
        personaName: string;
    } | null>(null);

    // Sync state reactively
    const reloadData = useCallback(() => {
        setDispatchData(loadDispatchData());
    }, []);

    useEffect(() => {
        window.addEventListener('whatchadoin_dispatch_updated', reloadData);
        return () => window.removeEventListener('whatchadoin_dispatch_updated', reloadData);
    }, [reloadData]);

    // Metrics for the currently selected date
    const dailyMetrics = useMemo(() => {
        return calculateDailyMetrics(dispatchData, selectedDate, selectedPersonaId);
    }, [dispatchData, selectedDate, selectedPersonaId]);

    const activePersonas = useMemo(() => {
        if (selectedPersonaId === 'all') return dispatchData.personas || [];
        return (dispatchData.personas || []).filter(p => p.id === selectedPersonaId);
    }, [dispatchData.personas, selectedPersonaId]);

    const handleToggleSlot = (slotId: string) => {
        const updated = toggleSlotCompletion(dispatchData, selectedDate, slotId);
        setDispatchData(updated);
    };

    const handleAddAdHoc = (platformId: string) => {
        const text = adHocInputs[platformId] || '';
        if (!text.trim()) return;

        const updated = addAdHocSlot(dispatchData, selectedDate, platformId, text.trim());
        setDispatchData(updated);
        setAdHocInputs(prev => ({ ...prev, [platformId]: '' }));
    };

    const handleDeleteSlot = (slotId: string) => {
        const updated = deleteSlot(dispatchData, selectedDate, slotId);
        setDispatchData(updated);
    };

    const handleLaunch = async (persona: CreatorPersona, platform: PlatformConfig) => {
        const targetProfile = platform.chromeProfile || persona.chromeProfile || 'Default';
        const platId = platform.id;

        setLaunchStatus(prev => ({ ...prev, [platId]: 'Launching...' }));

        const result = await launchChromeProfile(targetProfile, platform.composeUrl);

        if (result.fallbackUsed) {
            setLaunchStatus(prev => ({ ...prev, [platId]: 'Opened in tab' }));
        } else {
            setLaunchStatus(prev => ({ ...prev, [platId]: `Launched in ${targetProfile}` }));
        }

        setTimeout(() => {
            setLaunchStatus(prev => {
                const next = { ...prev };
                delete next[platId];
                return next;
            });
        }, 3000);
    };

    const handleSaveSchedule = (platformId: string, updatedSchedule: Record<number, BaseSlotTemplate[]>) => {
        const updatedPersonas = (dispatchData.personas || []).map(persona => ({
            ...persona,
            platforms: persona.platforms.map(plat => {
                if (plat.id === platformId) {
                    return { ...plat, weeklySchedule: updatedSchedule };
                }
                return plat;
            })
        }));

        const updatedData: ContentDispatchStorage = {
            ...dispatchData,
            personas: updatedPersonas
        };
        setDispatchData(updatedData);
        saveDispatchData(updatedData);
    };

    if (!isOpen) return null;

    return (
        <>
            <BaseModal
                isOpen={isOpen}
                onClose={onClose}
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '7px',
                            background: 'var(--block-bg)',
                            border: '1px solid var(--accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--accent)'
                        }}>
                            <Send size={15} />
                        </div>
                        <div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                Content Dispatch & Quota
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                                Persona posting targets & Chrome profile launcher
                            </div>
                        </div>
                    </div>
                }
                maxWidth="760px"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* TOP SCOREBOARD & DATE NAVIGATOR */}
                    <div style={{
                        background: dailyMetrics.isAllComplete && dailyMetrics.total > 0
                            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))'
                            : 'rgba(0, 0, 0, 0.25)',
                        border: dailyMetrics.isAllComplete && dailyMetrics.total > 0
                            ? '1px solid rgba(16, 185, 129, 0.4)'
                            : '1px solid var(--panel-border)',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        {/* Date bar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                    onClick={() => setSelectedDate(prev => addDays(prev, -1))}
                                    className="icon-btn"
                                    style={{
                                        padding: '5px 8px',
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        border: '1px solid var(--panel-border)',
                                        borderRadius: '6px',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer'
                                    }}
                                    title="Previous Day"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span style={{
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: 'var(--text-primary)',
                                    minWidth: '90px',
                                    textAlign: 'center'
                                }}>
                                    {formatDisplayDate(selectedDate)}
                                </span>
                                <button
                                    onClick={() => setSelectedDate(prev => addDays(prev, 1))}
                                    className="icon-btn"
                                    style={{
                                        padding: '5px 8px',
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        border: '1px solid var(--panel-border)',
                                        borderRadius: '6px',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer'
                                    }}
                                    title="Next Day"
                                >
                                    <ChevronRight size={16} />
                                </button>
                                {selectedDate !== getTodayDateStr() && (
                                    <button
                                        onClick={() => setSelectedDate(getTodayDateStr())}
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--accent)',
                                            background: 'var(--block-bg)',
                                            color: 'var(--accent)',
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            marginLeft: '4px'
                                        }}
                                    >
                                        Today
                                    </button>
                                )}
                            </div>

                            {/* Completeness Pill */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '13px',
                                fontWeight: '600'
                            }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Today&apos;s Target:</span>
                                <span style={{
                                    padding: '3px 10px',
                                    borderRadius: '12px',
                                    background: dailyMetrics.isAllComplete && dailyMetrics.total > 0 ? 'rgba(16, 185, 129, 0.2)' : 'var(--block-bg)',
                                    color: dailyMetrics.isAllComplete && dailyMetrics.total > 0 ? '#10B981' : 'var(--accent)',
                                    border: `1px solid ${dailyMetrics.isAllComplete && dailyMetrics.total > 0 ? 'rgba(16, 185, 129, 0.4)' : 'var(--accent)'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                }}>
                                    {dailyMetrics.isAllComplete && dailyMetrics.total > 0 && <CheckCircle2 size={13} />}
                                    {dailyMetrics.completed} / {dailyMetrics.total} Completed
                                </span>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div>
                            <div style={{
                                width: '100%',
                                height: '7px',
                                background: 'rgba(255, 255, 255, 0.08)',
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: `${dailyMetrics.percentage}%`,
                                    height: '100%',
                                    background: dailyMetrics.isAllComplete && dailyMetrics.total > 0 ? '#10B981' : 'var(--accent)',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                                <span>{dailyMetrics.percentage}% complete</span>
                                <span>
                                    {dailyMetrics.remaining === 0 && dailyMetrics.total > 0
                                        ? '✨ Quotas finished for today!'
                                        : `${dailyMetrics.remaining} posts left today`}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* PERSONA TABS FILTER */}
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
                        <button
                            onClick={() => setSelectedPersonaId('all')}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                border: selectedPersonaId === 'all' ? '1px solid var(--accent)' : '1px solid var(--panel-border)',
                                background: selectedPersonaId === 'all' ? 'var(--block-bg)' : 'rgba(255, 255, 255, 0.02)',
                                color: selectedPersonaId === 'all' ? 'var(--accent)' : 'var(--text-secondary)',
                                fontSize: '12.5px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            All Personas
                        </button>
                        {(dispatchData.personas || []).map(persona => {
                            const isSelected = selectedPersonaId === persona.id;
                            return (
                                <button
                                    key={persona.id}
                                    onClick={() => setSelectedPersonaId(persona.id)}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '8px',
                                        border: isSelected ? `1px solid ${persona.color || 'var(--accent)'}` : '1px solid var(--panel-border)',
                                        background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                                        color: isSelected ? (persona.color || 'var(--accent)') : 'var(--text-secondary)',
                                        fontSize: '12.5px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    <span style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: persona.color || 'var(--accent)'
                                    }} />
                                    @{persona.handle}
                                </button>
                            );
                        })}
                    </div>

                    {/* PERSONAS & PLATFORMS LIST */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        {activePersonas.map(persona => (
                            <div
                                key={persona.id}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--panel-border)',
                                    padding: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '14px'
                                }}
                            >
                                {/* Persona Header */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                                    paddingBottom: '10px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            background: persona.color || 'var(--accent)',
                                            color: '#111418',
                                            fontWeight: 'bold',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '14px'
                                        }}>
                                            {persona.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '14.5px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                                {persona.name}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                @{persona.handle}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Default Profile Tag */}
                                    <span style={{
                                        fontSize: '11.5px',
                                        color: 'var(--text-secondary)',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        background: 'rgba(0, 0, 0, 0.3)',
                                        border: '1px solid var(--panel-border)',
                                        fontFamily: 'var(--font-mono)'
                                    }}>
                                        Chrome: {persona.chromeProfile}
                                    </span>
                                </div>

                                {/* Platform Cards */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {persona.platforms.map(platform => {
                                        const slots = getResolvedPlatformSlots(dispatchData, selectedDate, platform);
                                        const completedCount = slots.filter(s => s.completed).length;
                                        const totalCount = slots.length;
                                        const isDone = totalCount > 0 && completedCount >= totalCount;
                                        const inputVal = adHocInputs[platform.id] || '';
                                        const statusMsg = launchStatus[platform.id];
                                        const designatedProfile = platform.chromeProfile || persona.chromeProfile;

                                        return (
                                            <div
                                                key={platform.id}
                                                style={{
                                                    background: 'rgba(0, 0, 0, 0.2)',
                                                    borderRadius: '10px',
                                                    border: isDone ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                                                    padding: '14px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '12px'
                                                }}
                                            >
                                                {/* Platform Header & Launcher */}
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    flexWrap: 'wrap',
                                                    gap: '8px'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Globe size={16} color={platform.color || 'var(--accent)'} />
                                                        <span style={{ fontSize: '13.5px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                                            {platform.label}
                                                        </span>
                                                        <span style={{
                                                            fontSize: '11px',
                                                            fontWeight: 'bold',
                                                            padding: '2px 7px',
                                                            borderRadius: '10px',
                                                            background: isDone ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                                            color: isDone ? '#10B981' : 'var(--text-secondary)',
                                                            border: `1px solid ${isDone ? 'rgba(16, 185, 129, 0.4)' : 'transparent'}`
                                                        }}>
                                                            {completedCount} / {totalCount}
                                                        </span>
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {/* Configure Weekly Schedule */}
                                                        <button
                                                            onClick={() => setEditingPlatform({ platform, personaName: persona.name })}
                                                            title="Edit Weekly Schedule Rules"
                                                            style={{
                                                                padding: '5px 8px',
                                                                borderRadius: '6px',
                                                                background: 'rgba(255, 255, 255, 0.03)',
                                                                border: '1px solid var(--panel-border)',
                                                                color: 'var(--text-secondary)',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                fontSize: '11.5px'
                                                            }}
                                                        >
                                                            <Calendar size={13} />
                                                            <span>Rules</span>
                                                        </button>

                                                        {/* Launch in Chrome */}
                                                        <button
                                                            onClick={() => handleLaunch(persona, platform)}
                                                            title={`Launch compose URL in designated profile (${designatedProfile})`}
                                                            style={{
                                                                padding: '6px 12px',
                                                                borderRadius: '6px',
                                                                background: statusMsg ? 'rgba(16, 185, 129, 0.2)' : 'var(--block-bg)',
                                                                border: statusMsg ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--accent)',
                                                                color: statusMsg ? '#10B981' : 'var(--accent)',
                                                                fontWeight: '600',
                                                                fontSize: '12px',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '5px',
                                                                transition: 'all 0.2s ease'
                                                            }}
                                                        >
                                                            {statusMsg ? <Sparkles size={13} /> : <ExternalLink size={13} />}
                                                            <span>
                                                                {statusMsg || `Open in Chrome (${designatedProfile})`}
                                                            </span>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Slots Checklist */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {slots.length === 0 ? (
                                                        <div style={{
                                                            fontSize: '12.5px',
                                                            color: 'var(--text-secondary)',
                                                            fontStyle: 'italic',
                                                            padding: '6px 0'
                                                        }}>
                                                            No posts scheduled for this platform today. Add a post below!
                                                        </div>
                                                    ) : (
                                                        slots.map(slot => (
                                                            <div
                                                                key={slot.id}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    padding: '7px 10px',
                                                                    borderRadius: '6px',
                                                                    background: slot.completed ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                                                                    border: slot.completed ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(255, 255, 255, 0.04)',
                                                                    transition: 'background 0.2s ease'
                                                                }}
                                                            >
                                                                <label style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '9px',
                                                                    cursor: 'pointer',
                                                                    flex: 1
                                                                }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={slot.completed}
                                                                        onChange={() => handleToggleSlot(slot.id)}
                                                                        style={{
                                                                            width: '15px',
                                                                            height: '15px',
                                                                            accentColor: '#10B981',
                                                                            cursor: 'pointer'
                                                                        }}
                                                                    />
                                                                    <span style={{
                                                                        fontSize: '13px',
                                                                        color: slot.completed ? 'var(--text-secondary)' : 'var(--text-primary)',
                                                                        textDecoration: slot.completed ? 'line-through' : 'none',
                                                                        transition: 'color 0.2s ease'
                                                                    }}>
                                                                        {slot.title}
                                                                    </span>
                                                                    {slot.isAdHoc && (
                                                                        <span style={{
                                                                            fontSize: '10px',
                                                                            padding: '1px 5px',
                                                                            borderRadius: '4px',
                                                                            background: 'rgba(201, 162, 39, 0.2)',
                                                                            color: 'var(--accent)',
                                                                            fontWeight: '600'
                                                                        }}>
                                                                            Ad-hoc
                                                                        </span>
                                                                    )}
                                                                </label>

                                                                {/* Delete if ad-hoc */}
                                                                {slot.isAdHoc && (
                                                                    <button
                                                                        onClick={() => handleDeleteSlot(slot.id)}
                                                                        title="Remove Ad-hoc Slot"
                                                                        style={{
                                                                            background: 'transparent',
                                                                            border: 'none',
                                                                            color: 'var(--text-secondary)',
                                                                            cursor: 'pointer',
                                                                            padding: '3px',
                                                                            display: 'flex'
                                                                        }}
                                                                    >
                                                                        <Trash2 size={13} color="var(--danger)" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>

                                                {/* Inline + Add Post for Today */}
                                                <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                                                    <input
                                                        type="text"
                                                        placeholder="+ Add a post for today..."
                                                        value={inputVal}
                                                        onChange={(e) => setAdHocInputs(prev => ({ ...prev, [platform.id]: e.target.value }))}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                handleAddAdHoc(platform.id);
                                                            }
                                                        }}
                                                        style={{
                                                            flex: 1,
                                                            padding: '6px 10px',
                                                            borderRadius: '6px',
                                                            border: '1px solid var(--panel-border)',
                                                            background: 'rgba(0, 0, 0, 0.3)',
                                                            color: 'var(--text-primary)',
                                                            fontSize: '12.5px',
                                                            outline: 'none'
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => handleAddAdHoc(platform.id)}
                                                        disabled={!inputVal.trim()}
                                                        style={{
                                                            padding: '6px 10px',
                                                            borderRadius: '6px',
                                                            border: '1px solid var(--panel-border)',
                                                            background: inputVal.trim() ? 'var(--block-bg)' : 'rgba(255, 255, 255, 0.02)',
                                                            color: inputVal.trim() ? 'var(--accent)' : 'var(--text-secondary)',
                                                            fontSize: '12px',
                                                            fontWeight: '600',
                                                            cursor: inputVal.trim() ? 'pointer' : 'default',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        <Plus size={13} />
                                                        Add
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </BaseModal>

            {/* Weekly Schedule Sub-Modal */}
            {editingPlatform && (
                <WeeklyScheduleModal
                    isOpen={!!editingPlatform}
                    onClose={() => setEditingPlatform(null)}
                    platform={editingPlatform.platform}
                    personaName={editingPlatform.personaName}
                    onSaveSchedule={handleSaveSchedule}
                />
            )}
        </>
    );
}
