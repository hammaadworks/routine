import * as React from 'react';
import { Pencil } from 'lucide-react';
import { getCardBgStyle, formatCompactDuration } from '../utils';
import OrderControls from './OrderControls';

interface Goal {
    id: string;
    name: string;
    color?: string;
    completed?: boolean;
    completedAt?: string;
    createdAt?: string;
    isPublic?: boolean;
    desc?: string;

    [key: string]: any;
}

interface GoalCardProps {
    goal: Goal;
    index: number;
    linkedCount: number;
    onToggle: (id: string) => void;
    onEdit: (goal: Goal) => void;
    onBadgeClick: (id: string) => void;
    onCardClick?: (goal: Goal) => void;
    canMoveUp?: boolean;
    canMoveDown?: boolean;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    isReorderDisabled?: boolean;
    // Legacy props for compatibility
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent, index: number) => void;
    onDragEnter?: (e: React.DragEvent, index: number) => void;
    onDragEnd?: () => void;
    isDragOver?: boolean;
    isDragging?: boolean;
    dropDirection?: 'up' | 'down';
}

export default function GoalCard({
    goal,
    index: _index,
    linkedCount,
    onToggle,
    onEdit,
    onBadgeClick,
    onCardClick,
    canMoveUp = false,
    canMoveDown = false,
    onMoveUp,
    onMoveDown,
    isReorderDisabled = false
}: GoalCardProps) {
    const hex = goal.color || '#eab308';
    const bgStyle = getCardBgStyle(hex);
    const timeInfo = formatCompactDuration(goal.createdAt, goal.completedAt, goal.completed, goal.id);

    return (
        <div
            className={`item-card ${goal.completed ? 'scratched' : ''}`}
            style={{
                position: 'relative',
                overflow: 'visible',
                minHeight: '48px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                transition: 'background-color 0.2s, border-color 0.2s',
                ...bgStyle
            }}
        >
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%'}}>
                <div style={{display: 'flex', gap: '8px', alignItems: 'center', flex: 1, minWidth: 0}}>
                    <OrderControls
                        canMoveUp={canMoveUp}
                        canMoveDown={canMoveDown}
                        onMoveUp={onMoveUp || (() => {})}
                        onMoveDown={onMoveDown || (() => {})}
                        disabled={isReorderDisabled}
                    />

                    <input
                        name="auto_field_9"
                        type="checkbox"
                        className="checkbox-square"
                        checked={goal.completed || false}
                        onChange={() => onToggle(goal.id)}
                        style={{'--accent': hex, flexShrink: 0} as React.CSSProperties}
                    />
                    <div 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onCardClick) onCardClick(goal);
                        }}
                        style={{
                            flex: 1,
                            minWidth: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        <span className="item-title" style={{
                            color: hex,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: '13px',
                            fontWeight: '500'
                        }} title={goal.name}>
                            {goal.name}
                        </span>
                        {goal.desc && (
                            <span style={{
                                fontSize: '11px',
                                color: 'var(--text-secondary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                marginTop: '2px'
                            }} title={goal.desc}>
                                {goal.desc}
                            </span>
                        )}
                    </div>
                </div>
                <div style={{display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0, marginLeft: '8px'}}>
                    {timeInfo && (
                        <span
                            title={timeInfo.fullText}
                            style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                padding: '2px 6px',
                                borderRadius: '8px',
                                background: `${hex}1F`,
                                border: `1px solid ${hex}40`,
                                color: hex,
                                whiteSpace: 'nowrap',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                cursor: 'help'
                            }}
                        >
                            {timeInfo.isCompleted && <span style={{fontSize: '9px'}}>✓</span>}
                            {timeInfo.formatted}
                        </span>
                    )}
                    <button className="icon-btn" onClick={() => onEdit(goal)}
                            style={{padding: '8px', cursor: 'pointer'}}>
                        <Pencil size={14}/>
                    </button>
                </div>
            </div>

            <div
                onClick={(e) => {
                    e.stopPropagation();
                    onBadgeClick(goal.id);
                }}
                title="Total Linked Routine & Habits (Click to view)"
                style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    cursor: 'pointer',
                    background: linkedCount > 0 ? hex : '#fff',
                    color: '#000',
                    fontSize: '11px',
                    fontWeight: '900',
                    minWidth: '22px',
                    height: '22px',
                    padding: '0 6px',
                    borderRadius: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: linkedCount > 0 ? `0 4px 8px ${hex}4D` : '0 2px 8px rgba(255,255,255,0.4)',
                    border: '2px solid var(--panel-bg)',
                    zIndex: 10
                }}>
                {linkedCount}
            </div>
        </div>
    );
}
