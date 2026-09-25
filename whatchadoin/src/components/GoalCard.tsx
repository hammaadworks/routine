import * as React from 'react';
import {GripVertical, Pencil} from 'lucide-react';
import {getCardBgStyle, formatCompactDuration} from '../utils';

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
    draggable: boolean;
    onDragStart: (e: React.DragEvent, index: number) => void;
    onDragEnter: (e: React.DragEvent, index: number) => void;
    onDragEnd: () => void;
    onToggle: (id: string) => void;
    onEdit: (goal: Goal) => void;
    onBadgeClick: (id: string) => void;
    onCardClick?: (goal: Goal) => void;
    isDragOver?: boolean;
    isDragging?: boolean;
    dropDirection?: 'up' | 'down';
}

export default function GoalCard({
                                     goal,
                                     index,
                                     linkedCount,
                                     draggable,
                                     onDragStart,
                                     onDragEnter,
                                     onDragEnd,
                                     onToggle,
                                     onEdit,
                                     onBadgeClick,
                                     onCardClick,
                                     isDragOver,
                                     isDragging,
                                     dropDirection
                                 }: GoalCardProps) {
    const hex = goal.color || '#eab308';
    const bgStyle = getCardBgStyle(hex);
    const timeInfo = formatCompactDuration(goal.createdAt, goal.completedAt, goal.completed, goal.id);

    return (<div
            className={`item-card ${goal.completed ? 'scratched' : ''} ${isDragging ? 'dragging' : ''}`}
            onDragEnter={(e) => onDragEnter(e, index)}
            onDragEnd={onDragEnd}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
            style={{
                position: 'relative',
                overflow: 'visible',
                minHeight: '48px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                opacity: isDragging ? 0.4 : 1,
                borderTop: isDragOver && dropDirection === 'up' ? `2px solid ${hex}` : 'none',
                borderBottom: isDragOver && dropDirection === 'down' ? `2px solid ${hex}` : 'none',
                transform: isDragOver && dropDirection === 'up' ? 'translateY(2px)' : (isDragOver && dropDirection === 'down' ? 'translateY(-2px)' : 'none'),
                transition: 'border 0.2s, transform 0.2s, opacity 0.2s',
                ...bgStyle
            }}
        >
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%'}}>
                <div style={{display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: 0}}>
                    <div
                        draggable={draggable}
                        onDragStart={(e) => {
                            const parent = e.currentTarget.closest('.item-card') as HTMLDivElement;
                            if (parent) e.dataTransfer.setDragImage(parent, 20, 20);
                            onDragStart(e, index);
                        }}
                        style={{display: 'flex', cursor: draggable ? 'grab' : 'default', touchAction: 'none'}}
                    >
                        <GripVertical size={16} color="var(--text-secondary)"
                                      style={{flexShrink: 0, opacity: 0.5}}/>
                    </div>
                    <input name="auto_field_9"
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
                        {goal.desc && (<span style={{
                                fontSize: '11px',
                                color: 'var(--text-secondary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                marginTop: '2px'
                            }} title={goal.desc}>
                {goal.desc}
              </span>)}
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
        </div>);
}
