import React from 'react';
import { Clock, Pencil } from 'lucide-react';
import BaseModal from './BaseModal';
import LinkedMilestonesSection from './habits/LinkedMilestonesSection';
import { useCurrency } from '../hooks/useCurrency';
import { formatCompactDuration } from '../utils';
import { formatAmountInWords } from '../utils/numberToWords';

export interface LinkedHabitItem {
    id: string;
    name: string;
}

export interface LinkedRoutineItem {
    id: string;
    name: string;
    color?: string;
}

export interface GoalInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    goal?: any | null;
    icon: React.ReactNode;
    costLabel?: string;
    linkedHabits?: LinkedHabitItem[];
    linkedRoutines?: LinkedRoutineItem[];
    milestones?: Record<string, string>;
    extraContent?: React.ReactNode;
    onEdit?: (goal: any) => void;
}

export default function GoalInfoModal({
    isOpen,
    onClose,
    goal,
    icon,
    costLabel = 'Estimated Cost',
    linkedHabits = [],
    linkedRoutines = [],
    milestones,
    extraContent,
    onEdit
}: GoalInfoModalProps) {
    const { formatCurrency, currency } = useCurrency();
    if (!isOpen || !goal) return null;

    const hex = goal.color || '#1982C4';
    const timeInfo = formatCompactDuration(
        goal.createdAt as string,
        goal.completedAt as string,
        !!goal.completed,
        goal.id
    );

    const costNum = typeof goal.cost === 'number'
        ? goal.cost
        : (typeof goal.cost === 'string' && goal.cost.trim() !== '' ? parseFloat(goal.cost) : undefined);
    const hasValidCost = typeof costNum === 'number' && !isNaN(costNum) && costNum > 0;
    const costWords = hasValidCost ? formatAmountInWords(costNum, currency) : '';

    return (
        <BaseModal
            isOpen={true}
            onClose={onClose}
            title={
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hex, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                    {icon}
                    {goal.name}
                </span>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {timeInfo && (
                    <div
                        style={{
                            background: `${hex}15`,
                            border: `1px solid ${hex}40`,
                            padding: '12px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            overflowWrap: 'anywhere'
                        }}
                    >
                        <Clock size={16} color={hex} style={{ flexShrink: 0 }} />
                        <span>{timeInfo.fullText}</span>
                    </div>
                )}

                {!!goal.desc && (
                    <div>
                        <div
                            style={{
                                fontSize: '12px',
                                color: 'var(--text-secondary)',
                                marginBottom: '4px',
                                fontWeight: 'bold'
                            }}
                        >
                            Description
                        </div>
                        <div
                            style={{
                                background: 'var(--surface-light)',
                                padding: '12px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                whiteSpace: 'pre-wrap',
                                overflowWrap: 'break-word',
                                wordBreak: 'break-word',
                                lineHeight: 1.5
                            }}
                        >
                            {String(goal.desc)}
                        </div>
                    </div>
                )}

                {hasValidCost && (
                    <div>
                        <div
                            style={{
                                fontSize: '12px',
                                color: 'var(--text-secondary)',
                                marginBottom: '4px',
                                fontWeight: 'bold'
                            }}
                        >
                            {costLabel}
                        </div>
                        <div
                            style={{
                                background: 'var(--surface-light)',
                                padding: '12px',
                                borderRadius: '8px',
                                fontSize: '15px',
                                fontWeight: 'bold',
                                color: hex,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px'
                            }}
                        >
                            <div>
                                {formatCurrency(costNum, {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: costNum % 1 === 0 ? 0 : 2
                                })}
                            </div>
                            {costWords && (
                                <div
                                    style={{
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        color: 'var(--text-secondary)',
                                        overflowWrap: 'anywhere',
                                        wordBreak: 'break-word'
                                    }}
                                >
                                    ✨ {costWords}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {linkedRoutines.length > 0 && (
                    <div>
                        <div
                            style={{
                                fontSize: '12px',
                                color: 'var(--text-secondary)',
                                marginBottom: '6px',
                                fontWeight: 'bold'
                            }}
                        >
                            Linked Routines ({linkedRoutines.length})
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {linkedRoutines.map(r => (
                                <span
                                    key={r.id}
                                    style={{
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        background: 'var(--surface-light)',
                                        color: r.color || 'var(--accent)',
                                        fontSize: '12px',
                                        border: `1px solid ${r.color || 'var(--accent)'}40`,
                                        maxWidth: '100%',
                                        overflowWrap: 'break-word',
                                        wordBreak: 'break-word'
                                    }}
                                >
                                    🎯 {r.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div>
                    <div
                        style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            marginBottom: '6px',
                            fontWeight: 'bold'
                        }}
                    >
                        Linked Habits ({linkedHabits.length})
                    </div>
                    {linkedHabits.length === 0 ? (
                        <div
                            style={{
                                fontSize: '13px',
                                color: 'var(--text-secondary)',
                                fontStyle: 'italic'
                            }}
                        >
                            No linked habits yet.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {linkedHabits.map((h, idx) => (
                                <span
                                    key={h.id || idx}
                                    style={{
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        background: 'var(--surface-light)',
                                        fontSize: '12px',
                                        border: '1px solid var(--border)',
                                        maxWidth: '100%',
                                        overflowWrap: 'break-word',
                                        wordBreak: 'break-word'
                                    }}
                                >
                                    {h.name}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {extraContent}

                {milestones && (
                    <LinkedMilestonesSection
                        name={goal.name}
                        milestones={milestones}
                        primaryColor={hex}
                        onCloseModal={onClose}
                    />
                )}

                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className="secondary"
                        onClick={onClose}
                        style={{
                            flex: 1,
                            minWidth: '100px',
                            padding: '10px 0',
                            borderRadius: '6px',
                            fontWeight: '500'
                        }}
                    >
                        Close
                    </button>
                    {onEdit && (
                        <button
                            type="button"
                            className="primary"
                            onClick={() => {
                                onClose();
                                onEdit(goal);
                            }}
                            style={{
                                flex: 1,
                                minWidth: '120px',
                                padding: '10px 0',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}
                        >
                            <Pencil size={14} /> Edit Goal
                        </button>
                    )}
                </div>
            </div>
        </BaseModal>
    );
}
