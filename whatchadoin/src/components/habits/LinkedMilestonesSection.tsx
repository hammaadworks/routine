import { useMemo } from 'react';
import { Calendar, CheckCircle2, Circle, ExternalLink, Flag, Target } from 'lucide-react';
import { getMilestonesForGoalOrHabit, flyToMilestone, type LinkedMilestone } from '../../utils/milestoneHelpers';

interface LinkedMilestonesSectionProps {
    name: string;
    milestones?: Record<string, string>;
    primaryColor?: string;
    onCloseModal?: () => void;
}

export default function LinkedMilestonesSection({
    name,
    milestones = {},
    primaryColor = 'var(--accent)',
    onCloseModal
}: LinkedMilestonesSectionProps) {
    const { allLinked, nextMilestone, completedCount, totalCount } = useMemo(() => {
        return getMilestonesForGoalOrHabit(name, milestones);
    }, [name, milestones]);

    const handleFly = (m: LinkedMilestone) => {
        if (onCloseModal) {
            onCloseModal();
        }
        flyToMilestone(m.date, m.cleanName);
    };

    if (totalCount === 0) {
        return (
            <div>
                <div style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    marginBottom: '6px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}>
                    <Flag size={14} color={primaryColor} />
                    <span>Linked Milestones (0)</span>
                </div>
                <div style={{
                    background: 'var(--surface-light)',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    fontStyle: 'italic',
                    border: '1px dashed var(--panel-border)',
                    textAlign: 'center'
                }}>
                    No milestones linked yet. Tag a milestone with <strong>@{name.replace(/\s+/g, '-')}</strong> to track targets here.
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                fontWeight: 'bold'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Flag size={14} color={primaryColor} />
                    <span>Linked Milestones ({completedCount}/{totalCount} done)</span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Click to view in Calendar ↗
                </span>
            </div>

            {/* Next Target Milestone Highlight Card */}
            {nextMilestone && (
                <div
                    onClick={() => handleFly(nextMilestone)}
                    style={{
                        background: nextMilestone.done
                            ? 'rgba(34, 197, 94, 0.08)'
                            : `linear-gradient(135deg, ${primaryColor}18 0%, rgba(0,0,0,0.3) 100%)`,
                        border: `1px solid ${nextMilestone.done ? 'var(--success, #22c55e)40' : `${primaryColor}60`}`,
                        borderRadius: '10px',
                        padding: '12px 14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: `0 4px 16px ${primaryColor}15`,
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                    className="clickable-milestone-card"
                    title="Click to fly to Calendar and highlight this milestone"
                >
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '6px'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                            color: nextMilestone.done ? 'var(--success, #22c55e)' : primaryColor
                        }}>
                            <Target size={13} />
                            <span>{nextMilestone.done ? 'Completed Milestone' : 'Next Target Milestone'}</span>
                        </div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: nextMilestone.diffDays < 0 && !nextMilestone.done
                                ? 'rgba(239, 68, 68, 0.2)'
                                : `${primaryColor}25`,
                            color: nextMilestone.diffDays < 0 && !nextMilestone.done
                                ? '#ef4444'
                                : (nextMilestone.done ? 'var(--success, #22c55e)' : primaryColor)
                        }}>
                            <span>{nextMilestone.diffText}</span>
                            <ExternalLink size={11} />
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '8px'
                    }}>
                        {nextMilestone.done ? (
                            <CheckCircle2 size={16} color="var(--success, #22c55e)" style={{ flexShrink: 0, marginTop: '2px' }} />
                        ) : (
                            <Circle size={16} color={primaryColor} style={{ flexShrink: 0, marginTop: '2px' }} />
                        )}
                        <div>
                            <div style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                color: nextMilestone.done ? 'var(--text-secondary)' : '#fff',
                                textDecoration: nextMilestone.done ? 'line-through' : 'none'
                            }}>
                                {nextMilestone.cleanName}
                            </div>
                            <div style={{
                                fontSize: '12px',
                                color: 'var(--text-secondary)',
                                marginTop: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <Calendar size={12} />
                                <span>{nextMilestone.dateFormatted} ({nextMilestone.date})</span>
                            </div>
                            {nextMilestone.desc && (
                                <div style={{
                                    fontSize: '12px',
                                    color: 'var(--text-secondary)',
                                    marginTop: '4px',
                                    fontStyle: 'italic',
                                    lineHeight: 1.3
                                }}>
                                    {nextMilestone.desc.length > 80 ? `${nextMilestone.desc.slice(0, 80)}...` : nextMilestone.desc}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* List of Other Linked Milestones if more than 1 */}
            {allLinked.length > 1 && (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    paddingRight: '4px'
                }}>
                    {allLinked.map((m, idx) => {
                        const isCurrentNext = nextMilestone && nextMilestone.date === m.date && nextMilestone.cleanName === m.cleanName;
                        if (isCurrentNext && allLinked.length <= 2) return null; // avoid duplication when few items

                        return (
                            <div
                                key={`${m.date}-${idx}`}
                                onClick={() => handleFly(m)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '7px 10px',
                                    borderRadius: '6px',
                                    background: isCurrentNext ? `${primaryColor}10` : 'var(--surface-light)',
                                    border: isCurrentNext ? `1px solid ${primaryColor}30` : '1px solid transparent',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    transition: 'all 0.15s ease'
                                }}
                                className="clickable-milestone-item"
                                title="Click to fly to Calendar and view milestone"
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                    {m.done ? (
                                        <CheckCircle2 size={13} color="var(--success, #22c55e)" style={{ flexShrink: 0 }} />
                                    ) : (
                                        <Circle size={13} color={primaryColor} style={{ flexShrink: 0 }} />
                                    )}
                                    <span style={{
                                        color: m.done ? 'var(--text-secondary)' : '#fff',
                                        textDecoration: m.done ? 'line-through' : 'none',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        fontWeight: isCurrentNext ? 600 : 400
                                    }}>
                                        {m.cleanName}
                                    </span>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    flexShrink: 0,
                                    fontSize: '11px',
                                    color: 'var(--text-secondary)'
                                }}>
                                    <span>{m.dateFormatted}</span>
                                    <ExternalLink size={10} style={{ opacity: 0.6 }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
