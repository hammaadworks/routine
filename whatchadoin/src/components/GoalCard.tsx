import * as React from 'react';
import {GripVertical, Pencil} from 'lucide-react';
import {getCardBgStyle} from '../utils';

interface Goal {
    id: string;
    text: string;
    color?: string;
    completed?: boolean;
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
                                     onBadgeClick
                                 }: GoalCardProps) {
    const hex = goal.color || '#eab308';
    const bgStyle = getCardBgStyle(hex);

    return (<div
            className={`item-card ${goal.completed ? 'scratched' : ''}`}
            draggable={draggable}
            onDragStart={(e) => onDragStart(e, index)}
            onDragEnter={(e) => onDragEnter(e, index)}
            onDragEnd={onDragEnd}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
            style={{
                cursor: draggable ? 'grab' : 'default',
                position: 'relative',
                minHeight: '48px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center', ...bgStyle
            }}
        >
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%'}}>
                <div style={{display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: 0}}>
                    <GripVertical size={16} color="var(--text-secondary)"
                                  style={{cursor: draggable ? 'grab' : 'default', flexShrink: 0, opacity: 0.5}}/>
                    <input
                        type="checkbox"
                        className="checkbox-square"
                        checked={goal.completed || false}
                        onChange={() => onToggle(goal.id)}
                        style={{'--accent': hex, flexShrink: 0} as React.CSSProperties}
                    />
                    <div style={{
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}>
            <span className="item-title" style={{
                color: hex,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: '13px',
                fontWeight: '500'
            }} title={goal.text}>
              {goal.text}
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
                <div style={{display: 'flex', gap: '12px', flexShrink: 0, marginLeft: '8px'}}>
                    <button className="icon-btn" onClick={() => onEdit(goal)}
                            style={{padding: '8px', cursor: 'pointer'}}>
                        <Pencil size={14}/>
                    </button>
                </div>
            </div>

            <div
                onClick={() => onBadgeClick(goal.id)}
                title="Total Linked Routine & Habits"
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
