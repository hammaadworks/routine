import * as React from 'react';
import {useEffect, useState} from 'react';
import {Clock, Target, X, ZoomIn, ZoomOut} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import BaseModal from './BaseModal';
import MyDayMaker from './MyDayMaker';

import {getGoalColor, parseDuration, sortHabits} from '../utils';

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

const calculateNextStartTime = (blocks: any[]) => {
    let startMinutes;
    if (blocks.length > 0) {
        const lastBlock = blocks.reduce((prev, current) => (prev.startTime + prev.duration > current.startTime + current.duration) ? prev : current);
        startMinutes = lastBlock.startTime + lastBlock.duration;
        startMinutes = Math.ceil(startMinutes / 15) * 15;
    } else {
        const now = new Date();
        startMinutes = Math.floor((now.getHours() * 60 + now.getMinutes()) / 15) * 15;
    }
    if (startMinutes > 1440 - 15) startMinutes = 1440 - 15;
    return startMinutes;
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
    isPublic?: boolean;
    [key: string]: any;
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
    isPublic?: boolean;
    [key: string]: any;
}

export interface Template {
    id: string;
    name: string;
    blocks: Block[];
}

export interface MyDayProps {
    isPublicView?: boolean;
    templates: Template[];
    setTemplates: React.Dispatch<React.SetStateAction<Template[]>>;
    activeTemplateId: string;
    setActiveTemplateId: React.Dispatch<React.SetStateAction<string>>;
    dayMapping: Record<string, string>;
    setDayMapping: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    updateActiveRoutine?: (updates: Partial<{
        templates: Template[], activeTemplateId: string, dayMapping: Record<string, string>
    }>) => void;
    habits: Habit[];
    routineGoals?: any[];
    lifeGoals?: any[];
}


export default function MyDay({
    isPublicView,
                                  templates,
                                  setTemplates,
                                  activeTemplateId,
                                  setActiveTemplateId,
                                  dayMapping,
                                  setDayMapping,
                                  updateActiveRoutine,
                                  habits,
                                  routineGoals = [],
                                  lifeGoals = []
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

    const addTemplate = (e: React.SyntheticEvent) => {
        e.preventDefault();
        if (!newTemplateName.trim()) return;
        const cleanName = newTemplateName.trim();
        createAndSetTemplate({id: Date.now().toString(), name: cleanName, blocks: []});
        setNewTemplateName('');
    };

    useEffect(() => {
        const handleFab = () => setShowMobileGoals(prev => !prev);

        const handleMobileAdd = (e: Event) => {
            const customEvent = e as CustomEvent;
            const habit = customEvent.detail;
            if (!activeTemplateId) return;

            const duration = parseDuration(habit.time || '30m');
            let startMinutes = 0;

            setTemplates(currentTemplates => {
                const updatedTemplates = currentTemplates.map((t: Template) => {
                    if (t.id === activeTemplateId) {
                        let newBlocks = [...t.blocks];
                        startMinutes = calculateNextStartTime(newBlocks);

                        newBlocks.push({
                            id: Date.now().toString(),
                            name: habit.name,
                            startTime: startMinutes,
                            duration: duration,
                            color: habit.color || '#eab308',
                            routineGoalId: habit.id || ''
                        });
                        return {...t, blocks: newBlocks};
                    }
                    return t;
                });

                if (updateActiveRoutine) {
                    updateActiveRoutine({templates: updatedTemplates});
                }

                return updatedTemplates;
            });

            // Close the routine drawer
            window.dispatchEvent(new CustomEvent('close-routine-drawer'));
        };

        window.addEventListener('fab:add-myday', handleFab);
        window.addEventListener('myday-add-habit-mobile', handleMobileAdd);
        return () => {
            window.removeEventListener('fab:add-myday', handleFab);
            window.removeEventListener('myday-add-habit-mobile', handleMobileAdd);
        };
    }, [activeTemplateId, templates, updateActiveRoutine]);

    const handleNewClick = () => {
        setShowNewTemplateModal(true);
    };

    const saveTemplateName = (e: React.SyntheticEvent) => {
        e.preventDefault();
        if (!editingTemplateName.trim()) {
            setIsEditingTemplateName(false);
            return;
        }
        const cleanName = editingTemplateName.trim();
        const updatedTemplates = templates.map((t: Template) => t.id === activeTemplateId ? {
            ...t, name: cleanName
        } : t);
        if (updateActiveRoutine) {
            updateActiveRoutine({templates: updatedTemplates});
        } else {
            setTemplates(updatedTemplates);
        }
        setIsEditingTemplateName(false);
    };

    const duplicateTemplate = () => {
        if (!activeTemplate) return;
        createAndSetTemplate({...activeTemplate, id: Date.now().toString(), name: `${activeTemplate.name} (Copy)`});
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
        const clientY = e.clientY || (e.nativeEvent as any).clientY || (e.nativeEvent as any).changedTouches?.[0]?.clientY || 0;
        const y = clientY - rect.top;

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

                    const linkedHabit = habits?.find((h: any) => h.id === routineGoalId);
                    const isPublicBlock = (e.dataTransfer.getData('isPublic') === 'true') || linkedHabit?.isPublic || task.includes('[public]');

                    newBlocks.push({
                        id: Date.now().toString(),
                        name: task,
                        startTime: startMinutes,
                        duration: duration,
                        color: color,
                        routineGoalId: routineGoalId,
                        isPublic: isPublicBlock
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
        const clientY = e.clientY || (e.nativeEvent as any).clientY || (e.nativeEvent as any).changedTouches?.[0]?.clientY || 0;
        const y = clientY - rect.top;
        let startMinutes = Math.floor(y / (15 * zoomLevel)) * 15;
        if (startMinutes < 0) startMinutes = 0;
        if (startMinutes > 1440 - 15) startMinutes = 1440 - 15;
        setDragHoverMins(startMinutes);
    };

    useEffect(() => {
        const handleGlobalDragEnd = () => setDragHoverMins(null);
        window.addEventListener('dragend', handleGlobalDragEnd);
        window.addEventListener('touchend', handleGlobalDragEnd); // Catch touch ends too for polyfill safety
        return () => {
            window.removeEventListener('dragend', handleGlobalDragEnd);
            window.removeEventListener('touchend', handleGlobalDragEnd);
        };
    }, []);


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

    const visibleHabits = (habits || []).filter((h: any) => !isPublicView || h.isPublic || (h.name || '').includes('[public]'));
    const sortedMobileGoals = sortHabits(visibleHabits);


    return (<div className="timeline-inner"
                 style={{
                     position: 'relative',
                     flex: 1,
                     width: '100%',
                     display: 'flex',
                     flexDirection: 'column',
                     minWidth: 0,
                     minHeight: 0
                 }}>
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
                    <span style={{
                        fontSize: '13px', fontWeight: 'bold', color: 'var(--accent)'
                    }}>Drop to schedule at {formatTime(dragHoverMins)}</span>
                </div>)}

                {/* Overlapping GCal-style Blocks */}
                {laidOutBlocks.map(block => {
                    const hex = block.color || '#ffffff';
                    const linkedHabit = habits?.find((h: any) => h.id === block.routineGoalId);
                    const isBlockPublic = (block as any).isPublic || block.name?.includes('[public]') || linkedHabit?.isPublic || (linkedHabit?.name || '').includes('[public]');
                    const isMasked = isPublicView && !isBlockPublic;
                    
                    return (<div
                        key={block.id}
                        className="time-block"
                        draggable={!isMasked}
                        onDragStart={isMasked ? undefined : (e) => {
                            e.dataTransfer.setData('source', 'timeline');
                            e.dataTransfer.setData('blockId', block.originalId || block.id);
                        }}
                        style={{
                            top: `${(block.startTime) * zoomLevel}px`,
                            height: `${block.duration * zoomLevel}px`,
                            left: `calc(10px + ${block.left}%)`, // Removed 0.9 scaling to fill the gap
                            width: `calc(${block.width}% - 14px)`,
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
                            touchAction: 'none',
                            opacity: block.isWrapSecond ? 0.9 : 1
                        }}
                    >
                        {!isMasked && (<>
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
                                    const nextSibling = e.currentTarget.nextElementSibling as HTMLInputElement;
                                    if (nextSibling && nextSibling.showPicker) nextSibling.showPicker();
                                }}
                            />
                            <input name="auto_field_14"
                                   type="time"
                                   value={formatTime24(block.startTime)}
                                   onChange={(e) => {
                                       const newMins = parseTime(e.target.value);
                                       if (newMins !== null && !isNaN(newMins)) {
                                           const updatedTemplates = templates.map((t: Template) => {
                                               if (t.id === activeTemplateId) {
                                                   return {
                                                       ...t,
                                                       blocks: t.blocks.map((b: Block) => b.id === block.originalId ? {
                                                           ...b, startTime: newMins
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
                            <input name="auto_field_15"
                                   type="time"
                                   value={formatTime24((block.startTime + block.duration) % 1440)}
                                   onChange={(e) => {
                                       const newEndMins = parseTime(e.target.value);
                                       if (newEndMins !== null && !isNaN(newEndMins)) {
                                           let newDuration = newEndMins - block.startTime;
                                           if (newDuration < 0) newDuration += 1440;
                                           const updatedTemplates = templates.map((t: Template) => {
                                               if (t.id === activeTemplateId) {
                                                   return {
                                                       ...t,
                                                       blocks: t.blocks.map((b: Block) => b.id === block.originalId ? {
                                                           ...b, duration: newDuration
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
                        </>)}
                    </div>);
                })}
            </div>
        </div>


        {/* Footer */}
        <div style={{
            flex: 'none',
            background: 'rgba(0,0,0,0.3)',
            borderTop: '1px solid var(--panel-border)',
            padding: '0 16px',
            minHeight: '44px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)'
            }}>
                <Clock size={14} color="var(--accent)"/>
                {(() => {
                    let unallocatedMins = 24 * 60;
                    if (activeTemplate && activeTemplate.blocks) {
                        const intervals = (activeTemplate.blocks || []).map((b: any) => [b.startTime ?? 0, (b.startTime ?? 0) + (b.duration || 0)]);
                        intervals.sort((a: number[], b: number[]) => (a[0] || 0) - (b[0] || 0));
                        let allocated = 0;
                        let currentStart = -1;
                        let currentEnd = -1;
                        for (const [start, end] of intervals as [number, number][]) {
                            if (currentEnd < start) {
                                if (currentStart !== -1) {
                                    allocated += currentEnd - currentStart;
                                }
                                currentStart = start;
                                currentEnd = end;
                            } else {
                                currentEnd = Math.max(currentEnd, end);
                            }
                        }
                        if (currentStart !== -1) {
                            allocated += currentEnd - currentStart;
                        }
                        unallocatedMins -= allocated;
                    }
                    const h = Math.floor(unallocatedMins / 60);
                    const m = unallocatedMins % 60;
                    return `Free Time: ${h}h ${m}m`;
                })()}
            </div>

            {/* Zoom Controls */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '4px'
            }}>
                <button
                    onClick={handleZoomOut}
                    title="Zoom Out"
                    style={{
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '50%',
                        padding: '2px',
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
                        padding: '2px',
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
        </div>

        {/* Habits Drawer (Mobile Goals) */}
        {showMobileGoals && (<div
            className="mobile-drawer-overlay hide-on-desktop"
            onClick={() => setShowMobileGoals(false)}
        />)}
        <div className={`panel pane right-pane hide-on-desktop ${showMobileGoals ? 'drawer-open' : ''}`}
             style={{display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', minHeight: 0}}>
            <div className="panel-header" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                borderBottom: '1px solid var(--panel-border)'
            }}>
                <h2 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <Target size={18} color="var(--accent)"/>
                    Habits
                </h2>
                <button
                    className="icon-btn"
                    onClick={() => setShowMobileGoals(false)}
                    style={{padding: '8px', background: 'var(--panel-border)', borderRadius: '50%'}}
                >
                    <X size={18}/>
                </button>
            </div>

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                padding: '24px',
                paddingTop: '16px',
                overflowY: 'auto'
            }}>
                <p style={{margin: 0, marginBottom: '16px', fontSize: '12px', color: 'var(--text-secondary)'}}>
                    Tap to add to schedule, or drag if on desktop.
                </p>
                <div className="mobile-goals-grid">
                    {sortedMobileGoals.length === 0 ? (<div style={{
                        color: 'var(--text-secondary)',
                        fontSize: '12px',
                        textAlign: 'center',
                        width: '100%',
                        padding: '24px 0'
                    }}>
                        No goals/habits found.
                    </div>) : (sortedMobileGoals.map(habit => {
                        const habitColor = getGoalColor(habit, routineGoals, lifeGoals)[0] || '#eab308';
                        return (<div
                            key={habit.id}
                            draggable
                            onDragStart={(e) => {
                                e.dataTransfer.setData('source', 'sidebar');
                                e.dataTransfer.setData('task', habit.name);
                                e.dataTransfer.setData('time', habit.time || '30m');
                                e.dataTransfer.setData('color', habitColor);
                                e.dataTransfer.setData('routineGoalId', habit.id);
                                e.dataTransfer.setData('isPublic', (habit.isPublic || (habit.name || '').includes('[public]')) ? 'true' : 'false');
                                setTimeout(() => setShowMobileGoals(false), 0);
                            }}
                            onClick={() => {
                                if (!activeTemplateId) return;

                                // Tap to add logic for mobile (and desktop as shortcut)
                                const duration = parseDuration(habit.time || '30m');

                                let updatedTemplates = templates.map((t: Template) => {
                                    if (t.id === activeTemplateId) {
                                        let newBlocks = [...t.blocks];
                                        const startMinutes = calculateNextStartTime(newBlocks);

                                        newBlocks.push({
                                            id: Date.now().toString(),
                                            name: habit.name,
                                            startTime: startMinutes,
                                            duration: duration,
                                            color: habitColor,
                                            routineGoalId: habit.routineGoalId || habit.id,
                                            isPublic: habit.isPublic || (habit.name || '').includes('[public]')
                                        });
                                        return {...t, blocks: newBlocks};
                                    }
                                    return t;
                                });

                                if (updateActiveRoutine) {
                                    updateActiveRoutine({templates: updatedTemplates});
                                } else {
                                    setTemplates(updatedTemplates);
                                }
                                setShowMobileGoals(false);
                            }}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                borderLeft: `4px solid ${habitColor}`,
                                cursor: 'pointer',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                boxSizing: 'border-box'
                            }}
                        >
                            <span style={{
                                flex: 1,
                                wordBreak: 'break-word',
                                whiteSpace: 'pre-wrap',
                                lineHeight: 1.4
                            }}>{habit.name}</span>
                            <span style={{
                                color: 'var(--text-secondary)', fontSize: '10px', flexShrink: 0
                            }}>({habit.time || '30m'})</span>
                        </div>);
                    }))}
                </div>
            </div>
        </div>

        {/* Rename Modal */}
        <BaseModal
            isOpen={isEditingTemplateName}
            onClose={() => setIsEditingTemplateName(false)}
            title="Rename Template"
        >
            <form onSubmit={saveTemplateName}>
                <input name="auto_field_16" type="text" value={editingTemplateName}
                       onChange={e => setEditingTemplateName(e.target.value)}
                       style={{width: '100%', marginBottom: '16px'}}
                       autoFocus/>
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
            <form onSubmit={(e) => {
                addTemplate(e);
                setShowNewTemplateModal(false);
            }}>
                <input name="auto_field_17" type="text" value={newTemplateName}
                       onChange={e => setNewTemplateName(e.target.value)}
                       placeholder="e.g. Vacation Day"
                       style={{width: '100%', marginBottom: '16px'}}
                       autoFocus/>
                <div style={{display: 'flex', gap: '8px'}}>
                    <button type="submit" style={{flex: 1, color: '#000'}} disabled={!newTemplateName.trim()}>Create
                    </button>
                    <button type="button" className="secondary" onClick={() => setShowNewTemplateModal(false)}
                            style={{flex: 1}}>Cancel
                    </button>
                </div>
            </form>
        </BaseModal>

        {/* Confirm Modal */}
        {confirmConfig && (<ConfirmModal
            onCancel={confirmConfig.onCancel}
            onConfirm={confirmConfig.onConfirm}
            title={confirmConfig.title}
            message={confirmConfig.message}
            isDanger={confirmConfig.isDanger}
            confirmText={confirmConfig.confirmText}
        />)}
    </div>);
}