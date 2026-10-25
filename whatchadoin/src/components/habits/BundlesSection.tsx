import React, { useState } from 'react';
import { Package, ChevronDown, ChevronRight, Pencil, Trash2, Check, Clock, Plus } from 'lucide-react';
import type { HabitBundle } from '../../types/routine';
import { formatDuration, getBundleTotalDuration, isBundleCompleted, getBundleVisibility } from '../../utils';

interface BundlesSectionProps {
    bundles: HabitBundle[];
    habits: any[];
    effectiveDate: string | null;
    dailyLogs: any;
    toggleBundleCompletion: (bundle: HabitBundle) => void;
    openEditBundle: (bundle: HabitBundle) => void;
    deleteBundle: (bundle: HabitBundle) => void;
    onDragStartBundle: (e: React.DragEvent, bundle: HabitBundle) => void;
    isPublicView?: boolean;
    openAddBundle: () => void;
}

export default function BundlesSection({
    bundles,
    habits,
    effectiveDate,
    dailyLogs,
    toggleBundleCompletion,
    openEditBundle,
    deleteBundle,
    onDragStartBundle,
    isPublicView,
    openAddBundle
}: BundlesSectionProps) {
    const [isSectionOpen, setIsSectionOpen] = useState(true);

    const visibleBundles = (bundles || []).filter(bundle => {
        if (!isPublicView) return true;
        const vis = getBundleVisibility(bundle, habits);
        return !vis.allPrivate;
    });

    if (visibleBundles.length === 0 && !openAddBundle) return null;

    return (
        <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Header Accordion Toggle */}
            <div
                onClick={() => setIsSectionOpen(!isSectionOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--panel-border)',
                    cursor: 'pointer',
                    userSelect: 'none'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isSectionOpen ? <ChevronDown size={15} color="var(--accent)" /> : <ChevronRight size={15} color="var(--accent)" />}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Package size={15} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
                            Habit Bundles
                        </span>
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            background: 'rgba(234, 179, 8, 0.15)',
                            color: 'var(--accent)',
                            padding: '1px 6px',
                            borderRadius: '10px'
                        }}>
                            {visibleBundles.length}
                        </span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        openAddBundle();
                    }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'transparent',
                        border: '1px dashed var(--accent)',
                        color: 'var(--accent)',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                    title="Create new bundle"
                >
                    <Plus size={12} /> New
                </button>
            </div>

            {/* Bundles List */}
            {isSectionOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {visibleBundles.length === 0 ? (
                        <div style={{
                            padding: '12px',
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            textAlign: 'center',
                            border: '1px dashed var(--panel-border)',
                            borderRadius: '6px'
                        }}>
                            No habit bundles yet. Click "+ New" to bundle habits together!
                        </div>
                    ) : (
                        visibleBundles.map(bundle => {
                            const isCompleted = isBundleCompleted(bundle, dailyLogs, effectiveDate, habits);
                            const totalMins = getBundleTotalDuration(bundle);

                            // Build multi-colored gradient border for left edge
                            const colors = (bundle.items || []).map(i => i.color || 'var(--accent)');
                            const uniqueColors = Array.from(new Set(colors));
                            const borderLeftStyle = uniqueColors.length > 1
                                ? `linear-gradient(to bottom, ${uniqueColors.join(', ')})`
                                : (uniqueColors[0] || 'var(--accent)');

                            return (
                                <div
                                    key={bundle.id}
                                    className={`item-card ${isCompleted ? 'scratched' : ''}`}
                                    draggable={!effectiveDate}
                                    onDragStart={!effectiveDate ? (e) => onDragStartBundle(e, bundle) : undefined}
                                    style={{
                                        position: 'relative',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px',
                                        padding: '10px 12px',
                                        borderRadius: '6px',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid var(--panel-border)',
                                        borderLeft: uniqueColors.length > 1 ? '4px solid transparent' : `4px solid ${borderLeftStyle}`,
                                        borderImage: uniqueColors.length > 1 ? `${borderLeftStyle} 1 100%` : undefined,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                        cursor: effectiveDate ? 'default' : 'grab'
                                    }}
                                    title={`Habit Bundle: ${bundle.name}\n${(bundle.items || []).map(i => `• ${i.name} (${i.duration}m)`).join('\n')}\n\nDrag onto timeline to schedule!`}
                                >
                                    {/* Top Row: Checkbox, Name, Total Duration, Actions */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleBundleCompletion(bundle);
                                                }}
                                                style={{
                                                    width: '18px',
                                                    height: '18px',
                                                    borderRadius: '4px',
                                                    border: `1.5px solid ${isCompleted ? 'var(--accent)' : 'var(--panel-border)'}`,
                                                    background: isCompleted ? 'var(--accent)' : 'transparent',
                                                    color: isCompleted ? '#000' : 'transparent',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    padding: 0,
                                                    flexShrink: 0
                                                }}
                                                title={isCompleted ? "Mark bundle uncompleted" : "Mark bundle completed"}
                                            >
                                                <Check size={12} strokeWidth={3} />
                                            </button>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                                <Package size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                                                <span style={{
                                                    fontSize: '13px',
                                                    fontWeight: 700,
                                                    color: 'var(--text-primary)',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}>
                                                    {bundle.name}
                                                </span>
                                            </div>

                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                color: 'var(--accent)',
                                                background: 'rgba(234, 179, 8, 0.1)',
                                                border: '1px solid rgba(234, 179, 8, 0.25)',
                                                padding: '1px 6px',
                                                borderRadius: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '3px',
                                                flexShrink: 0
                                            }}>
                                                <Clock size={11} /> {formatDuration(totalMins)}
                                            </span>
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                                            <button
                                                type="button"
                                                className="icon-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openEditBundle(bundle);
                                                }}
                                                style={{ padding: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                                                title="Edit bundle"
                                            >
                                                <Pencil size={13} />
                                            </button>
                                            <button
                                                type="button"
                                                className="icon-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteBundle(bundle);
                                                }}
                                                style={{ padding: '4px', cursor: 'pointer', color: 'var(--danger, #ef4444)' }}
                                                title="Delete bundle"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Bottom Row: Sequence Chips */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: '4px',
                                        paddingLeft: '26px'
                                    }}>
                                        {(bundle.items || []).map((item, iIdx) => (
                                            <React.Fragment key={item.id}>
                                                <div style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    background: 'rgba(255,255,255,0.04)',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    fontSize: '11px',
                                                    color: 'var(--text-secondary)'
                                                }}>
                                                    <span style={{
                                                        width: '6px',
                                                        height: '6px',
                                                        borderRadius: '50%',
                                                        background: item.color || 'var(--accent)',
                                                        flexShrink: 0
                                                    }} />
                                                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                                        {item.name}
                                                    </span>
                                                    <span style={{ opacity: 0.7, fontSize: '10px' }}>
                                                        {item.duration}m
                                                    </span>
                                                </div>
                                                {iIdx < (bundle.items || []).length - 1 && (
                                                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.5 }}>→</span>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
