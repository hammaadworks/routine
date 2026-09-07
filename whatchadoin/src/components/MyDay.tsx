import {useEffect, useState} from 'react';
import {Clock, GripVertical, X, ZoomIn, ZoomOut} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import BaseModal from './BaseModal';
import MyDayMaker from './MyDayMaker';

import {parseDuration, sortHabits} from '../utils';

const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = (minutes % 60).toString().padStart(2, '0');
    const ampm = h >= 12 && h < 24 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${m} ${ampm}`;
};

const formatTime24 = (minutes: number) => {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
};

const parseTime = (timeStr: string) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
};

const hexToRgb = (hex: string) => {
    if (!hex) return '234, 179, 8';
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
};

function getLayout(blocks: any[]) {
    if (!blocks || blocks.length === 0) return [];

    const processedBlocks: any[] = [];
    blocks.forEach(b => {
        if (b.startTime + b.duration > 1440) {
            processedBlocks.push({
                ...b,
                originalId: b.id,
                duration: 1440 - b.startTime,
                actualStartTime: b.startTime,
                actualDuration: b.duration,
                isWrapFirst: true
            });
            processedBlocks.push({
                ...b,
                id: b.id + '_wrap',
                originalId: b.id,
                startTime: 0,
                duration: b.startTime + b.duration - 1440,
                actualStartTime: b.startTime,
                actualDuration: b.duration,
                isWrapSecond: true
            });
        } else {
            processedBlocks.push({...b, originalId: b.id, actualStartTime: b.startTime, actualDuration: b.duration});
        }
    });

    const sorted = [...processedBlocks].sort((a, b) => a.startTime - b.startTime || b.duration - a.duration);
    const groups = [];
    let currentGroup: any[] = [];
    let currentGroupEnd = 0;

    sorted.forEach(block => {
        if (currentGroup.length === 0) {
            currentGroup.push(block);
            currentGroupEnd = block.startTime + block.duration;
        } else if (block.startTime < currentGroupEnd) {
            currentGroup.push(block);
            currentGroupEnd = Math.max(currentGroupEnd, block.startTime + block.duration);
        } else {
            groups.push(currentGroup);
            currentGroup = [block];
            currentGroupEnd = block.startTime + block.duration;
        }
    });
    if (currentGroup.length > 0) groups.push(currentGroup);

    const laidOutBlocks: any[] = [];
    groups.forEach(group => {
        const columns: any[][] = [];
        group.forEach(block => {
            let placed = false;
            for (let i = 0; i < columns.length; i++) {
                const col = columns[i];
                if (!col) continue;
                const lastBlock = col[col.length - 1];
                if (lastBlock.startTime + lastBlock.duration <= block.startTime) {
                    col.push(block);
                    block.colIndex = i;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                block.colIndex = columns.length;
                columns.push([block]);
            }
        });

        const numCols = columns.length;
        group.forEach(block => {
            block.width = 100 / numCols;
            block.left = block.colIndex * block.width;
            laidOutBlocks.push(block);
        });
    });

    return laidOutBlocks;
}


export interface Habit {
    id: string;
    name: string;
    time?: string;
    color?: string;
    routineGoalId?: string;
}

export interface Block {
    id: string;
    originalId?: string;
    name: string;
    startTime: number;
    duration: number;
    actualStartTime?: number;
    actualDuration?: number;
    color?: string;
    routineGoalId?: string;
    isWrapFirst?: boolean;
    isWrapSecond?: boolean;
    colIndex?: number;
    width?: number;
    left?: number;
}

export interface Template {
    id: string;
    name: string;
    blocks: Block[];
}

export interface MyDayProps {
    templates: Template[];
    setTemplates: React.Dispatch<React.SetStateAction<Template[]>>;
    activeTemplateId: string;
    setActiveTemplateId: React.Dispatch<React.SetStateAction<string>>;
    dayMapping: Record<string, string>;
    setDayMapping: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    updateActiveRoutine?: (updates: Partial<{templates: Template[], activeTemplateId: string, dayMapping: Record<string, string>}>) => void;
    habits: Habit[];
}


export default function MyDay({
                                  templates,
                                  setTemplates,
                                  activeTemplateId,
                                  setActiveTemplateId,
                                  dayMapping,
                                  setDayMapping,
                                  updateActiveRoutine,
                                  habits
                              }: MyDayProps) {
    const [newTemplateName, setNewTemplateName] = useState('');
    // Inline editing for blocks now, no block modal needed

    // Track scroll position of timeline container
    const [dragHoverMins, setDragHoverMins] = useState<number | null>(null);
    const [isEditingTemplateName, setIsEditingTemplateName] = useState(false);
    const [editingTemplateName, setEditingTemplateName] = useState('');
    const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState<any>(null);
    const [showMobileGoals, setShowMobileGoals] = useState(false);

    const [zoomLevel, setZoomLevel] = useState(1);
    const [currentTimeMins, setCurrentTimeMins] = useState(() => {
        const now = new Date();
        return now.getHours() * 60 + now.getMinutes();
    });

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            setCurrentTimeMins(now.getHours() * 60 + now.getMinutes());
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleZoomIn = () => {
        setZoomLevel(prev => Math.min(prev + 0.25, 3));
    };

    const handleZoomOut = () => {
        setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
    };

    const activeTemplate = templates.find((t: Template) => t.id === activeTemplateId);
    const laidOutBlocks = activeTemplate ? getLayout(activeTemplate.blocks) : [];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const createAndSetTemplate = (newTemplate: Template) => {
        const newId = newTemplate.id;
        const updates: any = {};
        updates.templates = [...templates, newTemplate];

        // Assign unassigned days to the newly created/duplicated template
        const updatedMapping = {...dayMapping};
        let mappingChanged = false;
        days.forEach(day => {
            if (!updatedMapping[day] || updatedMapping[day] === '') {
                updatedMapping[day] = newId;
                mappingChanged = true;
            }
        });
        if (mappingChanged) {
            updates.dayMapping = updatedMapping;
        }

        updates.activeTemplateId = newId;

        if (updateActiveRoutine) {
            updateActiveRoutine(updates);
        } else {
            setTemplates(updates.templates);
            if (updates.dayMapping) setDayMapping(updates.dayMapping);
            setActiveTemplateId(updates.activeTemplateId);
        }
    };

    const addTemplate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTemplateName.trim()) return;
        const cleanName = newTemplateName.trim();
        createAndSetTemplate({ id: Date.now().toString(), name: cleanName, blocks: [] });
        setNewTemplateName('');
    };

    useEffect(() => {
        const handleFab = () => setShowMobileGoals(prev => !prev);
        window.addEventListener('fab:add-myday', handleFab);
        return () => window.removeEventListener('fab:add-myday', handleFab);
    }, []);

    const handleNewClick = () => {
        setShowNewTemplateModal(true);
    };

    const saveTemplateName = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTemplateName.trim()) {
            setIsEditingTemplateName(false);
            return;
        }
        const cleanName = editingTemplateName.trim();
        const updatedTemplates = templates.map((t: Template) => t.id === activeTemplateId ? {...t, name: cleanName} : t);
        if (updateActiveRoutine) {
            updateActiveRoutine({ templates: updatedTemplates });
        } else {
            setTemplates(updatedTemplates);
        }
        setIsEditingTemplateName(false);
    };

    const duplicateTemplate = () => {
        if (!activeTemplate) return;
        createAndSetTemplate({ ...activeTemplate, id: Date.now().toString(), name: `${activeTemplate.name} (Copy)` });
    };

    const deleteTemplate = () => {
        setConfirmConfig({
            title: 'Delete Template',
            message: `do you wanna delete ${activeTemplate?.name}?`,
            isDanger: true,
            onConfirm: () => {
                const newTemplates = templates.filter((t: Template) => t.id !== activeTemplateId);

                let finalTemplates;
                let newActiveId;

                if (newTemplates.length === 0) {
                    newActiveId = Date.now().toString();
                    finalTemplates = [{id: newActiveId, name: 'Vanilla whatchadoin', blocks: []}];
                } else {
                    finalTemplates = newTemplates;
                    newActiveId = newTemplates[0]!.id;
                }

                const updates: any = {};
                updates.templates = finalTemplates;
                updates.activeTemplateId = newActiveId;

                // Remove references in dayMapping
                const updatedMapping = {...dayMapping};
                let mappingChanged = false;
                Object.keys(updatedMapping).forEach(day => {
                    if (updatedMapping[day] === activeTemplateId) {
                        updatedMapping[day] = newTemplates.length === 0 ? newActiveId : '';
                        mappingChanged = true;
                    }
                });
                if (mappingChanged) {
                    updates.dayMapping = updatedMapping;
                }

                if (updateActiveRoutine) {
                    updateActiveRoutine(updates);
                } else {
                    setTemplates(updates.templates);
                    setActiveTemplateId(updates.activeTemplateId);
                    if (updates.dayMapping) setDayMapping(updates.dayMapping);
                }
                setConfirmConfig(null);
            },
            onCancel: () => setConfirmConfig(null)
        });
    };

    const getSnappedMinutes = (y: number) => {
        let mins = Math.floor(y / (15 * zoomLevel)) * 15;
        if (mins < 0) return 0;
        if (mins > 1440 - 15) return 1440 - 15;
        return mins;
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragHoverMins(null);
        setShowMobileGoals(false);
        if (!activeTemplateId) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;

        const startMinutes = getSnappedMinutes(y);

        const source = e.dataTransfer.getData('source');

        let updatedTemplates = templates.map((t: Template) => {
            if (t.id === activeTemplateId) {
                let newBlocks = [...t.blocks];
                if (source === 'sidebar') {
                    const task = e.dataTransfer.getData('task');
                    const timeStr = e.dataTransfer.getData('time');
                    const color = e.dataTransfer.getData('color');
                    const routineGoalId = e.dataTransfer.getData('routineGoalId');
                    const duration = parseDuration(timeStr);

                    newBlocks.push({
                        id: Date.now().toString(),
                        name: task,
                        startTime: startMinutes,
                        duration: duration,
                        color: color,
                        routineGoalId: routineGoalId
                    });
                } else if (source === 'timeline') {
                    const blockId = e.dataTransfer.getData('blockId');
                    const blockIndex = newBlocks.findIndex(b => b.id === blockId);
                    if (blockIndex !== -1 && newBlocks[blockIndex]) {
                        newBlocks[blockIndex] = {...newBlocks[blockIndex]!, startTime: startMinutes};
                    }
                }
                return {...t, blocks: newBlocks};
            }
            return t;
        });

        if (updateActiveRoutine) {
            updateActiveRoutine({templates: updatedTemplates});
        } else {
            setTemplates(updatedTemplates);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        let startMinutes = Math.floor(y / (15 * zoomLevel)) * 15;
        if (startMinutes < 0) startMinutes = 0;
        if (startMinutes > 1440 - 15) startMinutes = 1440 - 15;
        setDragHoverMins(startMinutes);
    };

    const handleDragLeave = () => {
        setDragHoverMins(null);
    };


    const deleteBlock = (id: string) => {
        let updatedTemplates = templates.map((t: Template) => {
            if (t.id === activeTemplateId) {
                return {...t, blocks: t.blocks.filter((b: Block) => b.id !== id)};
            }
            return t;
        });

        if (updateActiveRoutine) {
            updateActiveRoutine({templates: updatedTemplates});
        } else {
            setTemplates(updatedTemplates);
        }
    };

    const sortedMobileGoals = sortHabits(habits);

    return (<div className="timeline-inner"
                 style={{position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0}}>
            <MyDayMaker
                templates={templates}
                activeTemplateId={activeTemplateId}
                setActiveTemplateId={setActiveTemplateId}
                activeTemplate={activeTemplate}
                dayMapping={dayMapping}
                setDayMapping={setDayMapping}
                days={days}
                handleNewClick={handleNewClick}
                setIsEditingTemplateName={setIsEditingTemplateName}
                setEditingTemplateName={setEditingTemplateName}
                duplicateTemplate={duplicateTemplate}
                deleteTemplate={deleteTemplate}
            />

            <div className="timeline-scroll">
                <div
                    className="timeline-grid"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    style={{'--zoom': zoomLevel} as React.CSSProperties}
                >
                    {/* Hours Grid (12 AM to 11 PM) */}
                    {Array.from({length: 24}).map((_, idx) => {
                        const i = idx;
                        const isNoon = i === 12;
                        const displayTime = i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`;
                        return (<div key={i} className="time-slot">
                                <div className="time-label" style={{
                                    fontWeight: isNoon ? 'bold' : 'normal',
                                    color: isNoon ? 'var(--accent)' : 'var(--text-secondary)'
                                }}>
                                    {displayTime}
                                </div>
                                {isNoon && (<div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: '1px',
                                        backgroundImage: 'linear-gradient(to right, var(--danger, #ef4444) 30%, transparent 30%)',
                                        backgroundSize: '15px 1px',
                                        backgroundRepeat: 'repeat-x',
                                        boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)',
                                        zIndex: 1
                                    }}/>)}
                                {(i === 4 || i === 20) && (<div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: '1px',
                                        backgroundImage: 'linear-gradient(to right, #a855f7 30%, transparent 30%)',
                                        backgroundSize: '15px 1px',
                                        backgroundRepeat: 'repeat-x',
                                        boxShadow: '0 0 10px rgba(168, 85, 247, 0.5)',
                                        zIndex: 1
                                    }}/>)}
                                {(i === 8 || i === 16) && (<div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: '1px',
                                        backgroundImage: 'linear-gradient(to right, #0ea5e9 30%, transparent 30%)',
                                        backgroundSize: '15px 1px',
                                        backgroundRepeat: 'repeat-x',
                                        boxShadow: '0 0 10px rgba(14, 165, 233, 0.5)',
                                        zIndex: 1
                                    }}/>)}
                                {/* Subtle 30m grid line */}
                                <div style={{
                                    position: 'absolute',
                                    top: `${30 * zoomLevel}px`,
                                    left: 0,
                                    right: 0,
                                    borderBottom: '1px dotted rgba(255,255,255,0.03)'
                                }}/>
                            </div>);
                    })}

                    {/* Current Time Indicator */}
                    {currentTimeMins >= 0 && currentTimeMins <= 1440 && (<div
                            style={{
                                position: 'absolute',
                                top: `${(currentTimeMins) * zoomLevel}px`,
                                left: '-60px',
                                right: 0,
                                borderBottom: '2px solid var(--accent)',
                                boxShadow: '0 0 10px rgba(234, 179, 8, 0.5)',
                                zIndex: 15,
                                pointerEvents: 'none'
                            }}
                        >
                            <div style={{
                                position: 'absolute',
                                left: 0,
                                top: '-4px',
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: 'var(--accent)',
                                boxShadow: '0 0 10px rgba(234, 179, 8, 0.8)'
                            }}/>
                            <div style={{
                                position: 'absolute',
                                left: '12px',
                                top: '-8px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                color: '#000',
                                background: 'var(--accent)',
                                padding: '1px 4px',
                                borderRadius: '4px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                whiteSpace: 'nowrap'
                            }}>
                                {formatTime(currentTimeMins)}
                            </div>
                        </div>)}

                    {/* Hover Phantom Indicator */}
                    {dragHoverMins !== null && (<div
                            style={{
                                position: 'absolute',
                                top: `${(dragHoverMins) * zoomLevel}px`,
                                left: '10px',
                                right: '20px',
                                height: `${30 * zoomLevel}px`,
                                background: 'rgba(234, 179, 8, 0.1)',
                                border: '2px dashed var(--accent)',
                                borderRadius: '6px',
                                zIndex: 20,
                                pointerEvents: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0 12px'
                            }}
                        >
                            <span style={{fontSize: '13px', fontWeight: 'bold', color: 'var(--accent)'}}>Drop to schedule at {formatTime(dragHoverMins)}</span>
                        </div>)}

                    {/* Overlapping GCal-style Blocks */}
                    {laidOutBlocks.map(block => {
                        const hex = block.color || '#ffffff';
                        return (<div
                                key={block.id}
                                className="time-block"
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('source', 'timeline');
                                    e.dataTransfer.setData('blockId', block.originalId);
                                }}
                                style={{
                                    top: `${(block.startTime) * zoomLevel}px`,
                                    height: `${block.duration * zoomLevel}px`,
                                    left: `calc(10px + ${block.left}% * 0.9)`, // 0.9 scaling leaves room for right margin
                                    width: `calc(${block.width}% * 0.9 - 4px)`,
                                    backgroundColor: `rgba(${hexToRgb(hex)}, 0.15)`,
                                    borderLeftColor: hex,
                                    borderLeftWidth: '4px',
                                    borderLeftStyle: 'solid',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    position: 'absolute',
                                    padding: block.duration <= 60 ? '4px 8px' : '8px',
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: block.duration <= 60 ? 'row' : 'column',
                                    alignItems: block.duration <= 60 ? 'center' : 'flex-start',
                                    gap: block.duration <= 60 ? '8px' : '0',
                                    opacity: block.isWrapSecond ? 0.9 : 1
                                }}
                            >
                                <div className="time-block-title" style={{
                                    color: hex,
                                    fontWeight: '600',
                                    fontSize: '13px',
                                    marginBottom: block.duration <= 60 ? '0' : '2px',
                                    paddingRight: block.duration <= 60 ? '0' : '16px',
                                    whiteSpace: block.duration <= 60 ? 'nowrap' : 'normal',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    flex: block.duration <= 60 ? 1 : 'none',
                                    minWidth: 0
                                }}
                                >
                                    {block.name}
                                </div>
                                <div className="time-block-meta" style={{
                                    color: `rgba(${hexToRgb(hex)}, 0.8)`,
                                    fontSize: '11px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    flexShrink: 0
                                }}>
                                    <Clock
                                        size={10}
                                        color="#fff"
                                        style={{cursor: 'pointer'}}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const nextSibling = e.currentTarget.nextElementSibling as HTMLInputElement; if (nextSibling && nextSibling.showPicker) nextSibling.showPicker();
                                        }}
                                    />
                                    <input
                                        type="time"
                                        value={formatTime24(block.actualStartTime)}
                                        onChange={(e) => {
                                            const newMins = parseTime(e.target.value);
                                            if (newMins !== null && !isNaN(newMins)) {
                                                const updatedTemplates = templates.map((t: Template) => {
                                                    if (t.id === activeTemplateId) {
                                                        return {
                                                            ...t,
                                                            blocks: t.blocks.map((b: Block) => b.id === block.originalId ? {
                                                                ...b,
                                                                startTime: newMins
                                                            } : b)
                                                        };
                                                    }
                                                    return t;
                                                });
                                                if (updateActiveRoutine) {
                                                    updateActiveRoutine({templates: updatedTemplates});
                                                } else {
                                                    setTemplates(updatedTemplates);
                                                }
                                            }
                                        }}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'inherit',
                                            fontSize: 'inherit',
                                            fontFamily: 'inherit',
                                            padding: 0,
                                            outline: 'none',
                                            cursor: 'pointer'
                                        }}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <span>-</span>
                                    <input
                                        type="time"
                                        value={formatTime24((block.actualStartTime + block.actualDuration) % 1440)}
                                        onChange={(e) => {
                                            const newEndMins = parseTime(e.target.value);
                                            if (newEndMins !== null && !isNaN(newEndMins)) {
                                                let newDuration = newEndMins - block.actualStartTime;
                                                if (newDuration < 0) newDuration += 1440;
                                                const updatedTemplates = templates.map((t: Template) => {
                                                    if (t.id === activeTemplateId) {
                                                        return {
                                                            ...t,
                                                            blocks: t.blocks.map((b: Block) => b.id === block.originalId ? {
                                                                ...b,
                                                                duration: newDuration
                                                            } : b)
                                                        };
                                                    }
                                                    return t;
                                                });
                                                if (updateActiveRoutine) {
                                                    updateActiveRoutine({templates: updatedTemplates});
                                                } else {
                                                    setTemplates(updatedTemplates);
                                                }
                                            }
                                        }}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'inherit',
                                            fontSize: 'inherit',
                                            fontFamily: 'inherit',
                                            padding: 0,
                                            outline: 'none',
                                            cursor: 'pointer'
                                        }}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteBlock(block.originalId);
                                    }}
                                    style={{
                                        position: 'absolute',
                                        top: '4px',
                                        right: '4px',
                                        background: 'transparent',
                                        border: 'none',
                                        color: hex,
                                        cursor: 'pointer',
                                        opacity: 0.6,
                                        padding: '2px'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                                >
                                    <X size={14}/>
                                </button>
                            </div>);
                    })}
                </div>
            </div>

            {/* Zoom Controls */}
            <div style={{
                position: 'absolute',
                bottom: '24px',
                right: '24px',
                display: 'flex',
                alignItems: 'center',
                background: 'var(--panel-bg)',
                border: '1px solid var(--panel-border)',
                borderRadius: '24px',
                padding: '4px',
                gap: '4px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                zIndex: 100
            }}>
                <button
                    onClick={handleZoomOut}
                    title="Zoom Out"
                    style={{
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '50%',
                        padding: '6px',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.color = 'var(--accent)';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.color = 'var(--text-secondary)';
                        e.currentTarget.style.background = 'transparent';
                    }}
                >
                    <ZoomOut size={16}/>
                </button>

                <div style={{
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    minWidth: '40px',
                    pointerEvents: 'none',
                    userSelect: 'none'
                }}>
                    {Math.round(zoomLevel * 100)}%
                </div>

                <button
                    onClick={handleZoomIn}
                    title="Zoom In"
                    style={{
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '50%',
                        padding: '6px',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.color = 'var(--accent)';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.color = 'var(--text-secondary)';
                        e.currentTarget.style.background = 'transparent';
                    }}
                >
                    <ZoomIn size={16}/>
                </button>


            </div>

            {/* Habits Tray (Mobile Goals) */}
            {showMobileGoals && (<div className="habits-tray" style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '40%',
                    background: 'var(--panel-bg)',
                    borderTop: '1px solid var(--panel-border)',
                    zIndex: 110,
                    overflowY: 'auto',
                    padding: '16px',
                    boxShadow: '0 -10px 20px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px',
                        flexShrink: 0
                    }}>
                        <h3 style={{margin: 0, fontSize: '14px', color: 'var(--accent)'}}>Drag Goals to Timeline</h3>
                        <button onClick={() => setShowMobileGoals(false)} style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer'
                        }}><X size={16}/></button>
                    </div>
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', flex: 1, alignContent: 'flex-start'}}>
                        {sortedMobileGoals.length === 0 ? (<div style={{
                                color: 'var(--text-secondary)',
                                fontSize: '12px',
                                textAlign: 'center',
                                width: '100%'
                            }}>No goals/habits found.</div>) : (sortedMobileGoals.map(habit => (<div
                                    key={habit.id}
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData('source', 'sidebar');
                                        e.dataTransfer.setData('task', habit.name);
                                        e.dataTransfer.setData('time', habit.time || '30m');
                                        e.dataTransfer.setData('color', habit.color || '#eab308');
                                        e.dataTransfer.setData('routineGoalId', habit.routineGoalId || '');
                                        setShowMobileGoals(false);
                                    }}
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        borderLeft: `4px solid ${habit.color || '#eab308'}`,
                                        cursor: 'grab',
                                        fontSize: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <GripVertical size={14} color="var(--text-secondary)"/>
                                    {habit.name} <span style={{
                                    color: 'var(--text-secondary)',
                                    fontSize: '10px'
                                }}>({habit.time || '30m'})</span>
                                </div>)))}
                    </div>
                </div>)}

            {/* Rename Modal */}
            <BaseModal
                isOpen={isEditingTemplateName}
                onClose={() => setIsEditingTemplateName(false)}
                title="Rename Template"
            >
                <form onSubmit={saveTemplateName}>
                    <input type="text" value={editingTemplateName}
                           onChange={e => setEditingTemplateName(e.target.value)}
                           style={{width: '100%', marginBottom: '16px'}}
                           autoFocus />
                    <div style={{display: 'flex', gap: '8px'}}>
                        <button type="submit" style={{flex: 1, color: '#000'}}>Save</button>
                        <button type="button" className="secondary" onClick={() => setIsEditingTemplateName(false)}
                                style={{flex: 1}}>Cancel
                        </button>
                    </div>
                </form>
            </BaseModal>

            {/* New Template Modal */}
            <BaseModal
                isOpen={showNewTemplateModal}
                onClose={() => setShowNewTemplateModal(false)}
                title="Create New Schedule"
            >
                <form onSubmit={(e) => { addTemplate(e); setShowNewTemplateModal(false); }}>
                    <input type="text" value={newTemplateName}
                           onChange={e => setNewTemplateName(e.target.value)}
                           placeholder="e.g. Vacation Day"
                           style={{width: '100%', marginBottom: '16px'}}
                           autoFocus />
                    <div style={{display: 'flex', gap: '8px'}}>
                        <button type="submit" style={{flex: 1, color: '#000'}} disabled={!newTemplateName.trim()}>Create</button>
                        <button type="button" className="secondary" onClick={() => setShowNewTemplateModal(false)}
                                style={{flex: 1}}>Cancel
                        </button>
                    </div>
                </form>
            </BaseModal>

            {/* Confirm Modal */}
            {confirmConfig && (
                <ConfirmModal
                  onCancel={confirmConfig.onCancel}
                  onConfirm={confirmConfig.onConfirm}
                  title={confirmConfig.title}
                  message={confirmConfig.message}
                  isDanger={confirmConfig.isDanger}
                  confirmText={confirmConfig.confirmText}
                />
            )}
        </div>);
}