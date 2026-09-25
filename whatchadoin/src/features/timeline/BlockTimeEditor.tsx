import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { formatTime, formatTime24, parseTime } from './timeUtils';
import { hexToRgb } from '@/utils.ts';
import type { LaidOutBlock } from './timelineMath';

interface BlockTimeEditorProps {
    block: LaidOutBlock;
    hex: string;
    onUpdate: (blockId: string, newStartTime: number, newDuration: number) => void;
}

export const BlockTimeEditor: React.FC<BlockTimeEditorProps> = ({ block, hex, onUpdate }) => {
    const actualStart = block.actualStartTime ?? block.startTime;
    const actualDuration = block.actualDuration ?? block.duration;

    const [startVal, setStartVal] = useState(formatTime(actualStart));
    const [endVal, setEndVal] = useState(formatTime((actualStart + actualDuration) % 1440));
    const isEditingRef = useRef(false);
    const hiddenPickerStartRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isEditingRef.current) {
            setStartVal(formatTime(actualStart));
            setEndVal(formatTime((actualStart + actualDuration) % 1440));
        }
    }, [actualStart, actualDuration]);

    const handleCommitStart = (newStartStr: string) => {
        isEditingRef.current = false;
        const sMins = parseTime(newStartStr, actualStart);
        if (sMins === null) {
            setStartVal(formatTime(actualStart));
            return;
        }

        const currentDur = actualDuration;
        const newEndMins = (sMins + currentDur) % 1440;
        setStartVal(formatTime(sMins));
        setEndVal(formatTime(newEndMins));

        if (sMins !== actualStart) {
            onUpdate(block.originalId || block.id, sMins, currentDur);
        }
    };

    const handleCommitEnd = (newEndStr: string) => {
        isEditingRef.current = false;
        const currentStartMins = parseTime(startVal, actualStart) ?? actualStart;
        const currentEndMins = (currentStartMins + actualDuration) % 1440;
        const eMins = parseTime(newEndStr, currentEndMins);

        if (eMins === null) {
            setEndVal(formatTime((currentStartMins + actualDuration) % 1440));
            return;
        }

        let newDuration = eMins - currentStartMins;

        if (newDuration <= 0) {
            if (currentStartMins >= 12 * 60 && eMins <= 12 * 60) {
                newDuration = (1440 - currentStartMins) + eMins;
            } else {
                newDuration = 15;
            }
        }

        if (newDuration > 1440) newDuration = 1440;

        const committedEndMins = (currentStartMins + newDuration) % 1440;
        setStartVal(formatTime(currentStartMins));
        setEndVal(formatTime(committedEndMins));

        if (currentStartMins !== actualStart || newDuration !== actualDuration) {
            onUpdate(block.originalId || block.id, currentStartMins, newDuration);
        }
    };

    const rgb = hexToRgb(hex);

    return (
        <div
            className="time-block-meta no-drag"
            draggable={false}
            onDragStart={(e) => {
                e.stopPropagation();
                e.preventDefault();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
                color: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.95)`,
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                flexShrink: 0,
                cursor: 'default',
                userSelect: 'none',
                position: 'relative'
            }}
        >
            <Clock
                size={11}
                color={hex}
                style={{ cursor: 'pointer', flexShrink: 0, opacity: 0.85 }}
                onClick={(e) => {
                    e.stopPropagation();
                    const picker = hiddenPickerStartRef.current as HTMLInputElement & { showPicker?: () => void };
                    if (picker && typeof picker.showPicker === 'function') {
                        picker.showPicker();
                    }
                }}
            />
            <input
                ref={hiddenPickerStartRef}
                type="time"
                value={formatTime24(actualStart)}
                onChange={(e) => {
                    handleCommitStart(e.target.value);
                }}
                aria-hidden="true"
                style={{
                    position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0
                }}
                tabIndex={-1}
            />
            <input
                name={`start_time_${block.id}`}
                aria-label="Start time"
                type="text"
                value={startVal}
                draggable={false}
                onDragStart={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onFocus={() => {
                    isEditingRef.current = true;
                }}
                onChange={(e) => {
                    setStartVal(e.target.value);
                }}
                onBlur={(e) => {
                    handleCommitStart(e.target.value);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        const cur = parseTime(startVal, actualStart) ?? actualStart;
                        const step = e.shiftKey ? 15 : 60;
                        const next = (cur + step) % 1440;
                        setStartVal(formatTime(next));
                        setEndVal(formatTime((next + actualDuration) % 1440));
                        onUpdate(block.originalId || block.id, next, actualDuration);
                    } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        const cur = parseTime(startVal, actualStart) ?? actualStart;
                        const step = e.shiftKey ? 15 : 60;
                        const prev = (cur - step + 1440) % 1440;
                        setStartVal(formatTime(prev));
                        setEndVal(formatTime((prev + actualDuration) % 1440));
                        onUpdate(block.originalId || block.id, prev, actualDuration);
                    }
                }}
                style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '4px',
                    color: 'inherit',
                    fontSize: '10.5px',
                    fontFamily: 'inherit',
                    letterSpacing: '-0.2px',
                    padding: '1px 2px',
                    outline: 'none',
                    cursor: 'text',
                    width: '70px',
                    textAlign: 'center',
                    boxSizing: 'border-box',
                    flexShrink: 0
                }}
                title="Edit start time (e.g. 11pm, 10:30am, 23:00). Arrow keys adjust hour."
            />
            <span style={{ opacity: 0.6 }}>-</span>
            <input
                name={`end_time_${block.id}`}
                aria-label="End time"
                type="text"
                value={endVal}
                draggable={false}
                onDragStart={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onFocus={() => {
                    isEditingRef.current = true;
                }}
                onChange={(e) => {
                    setEndVal(e.target.value);
                }}
                onBlur={(e) => {
                    handleCommitEnd(e.target.value);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        const currentStartMins = parseTime(startVal, actualStart) ?? actualStart;
                        const currentEndMins = parseTime(endVal, (currentStartMins + actualDuration) % 1440) ?? ((currentStartMins + actualDuration) % 1440);
                        const step = e.shiftKey ? 15 : 60;
                        const nextEnd = (currentEndMins + step) % 1440;
                        let newDur = nextEnd - currentStartMins;
                        if (newDur <= 0) newDur = (1440 - currentStartMins) + nextEnd;
                        if (newDur > 1440) newDur = 1440;
                        setEndVal(formatTime((currentStartMins + newDur) % 1440));
                        onUpdate(block.originalId || block.id, currentStartMins, newDur);
                    } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        const currentStartMins = parseTime(startVal, actualStart) ?? actualStart;
                        const currentEndMins = parseTime(endVal, (currentStartMins + actualDuration) % 1440) ?? ((currentStartMins + actualDuration) % 1440);
                        const step = e.shiftKey ? 15 : 60;
                        const prevEnd = (currentEndMins - step + 1440) % 1440;
                        let newDur = prevEnd - currentStartMins;
                        if (newDur <= 0 && currentStartMins >= 12 * 60) newDur = (1440 - currentStartMins) + prevEnd;
                        if (newDur < 15) newDur = 15;
                        setEndVal(formatTime((currentStartMins + newDur) % 1440));
                        onUpdate(block.originalId || block.id, currentStartMins, newDur);
                    }
                }}
                style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '4px',
                    color: 'inherit',
                    fontSize: '10.5px',
                    fontFamily: 'inherit',
                    letterSpacing: '-0.2px',
                    padding: '1px 2px',
                    outline: 'none',
                    cursor: 'text',
                    width: '70px',
                    textAlign: 'center',
                    boxSizing: 'border-box',
                    flexShrink: 0
                }}
                title="Edit end time (e.g. 11pm, 12am, 23:00). Arrow keys adjust hour."
            />
        </div>
    );
};
