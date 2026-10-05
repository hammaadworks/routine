import type React from 'react';
import { useState } from 'react';

/**
 * Moves an item in `items` so that it appears before `targetItem` (for moving up)
 * or after `targetItem` (for moving down).
 */
export function moveItemRelativeTo<T extends { id?: string | number }>(
    items: T[],
    itemToMove: T,
    targetItem?: T,
    position: 'before' | 'after' = 'before'
): T[] {
    if (!targetItem) return items;
    const fromIndex = items.findIndex(i => (i.id !== undefined && itemToMove.id !== undefined) ? i.id === itemToMove.id : i === itemToMove);
    const targetIndex = items.findIndex(i => (i.id !== undefined && targetItem.id !== undefined) ? i.id === targetItem.id : i === targetItem);
    if (fromIndex === -1 || targetIndex === -1 || fromIndex === targetIndex) return items;

    const copy = [...items];
    const [moved] = copy.splice(fromIndex, 1);
    if (!moved) return items;

    const newTargetIndex = copy.findIndex(i => (i.id !== undefined && targetItem.id !== undefined) ? i.id === targetItem.id : i === targetItem);
    if (newTargetIndex === -1) return items;

    const insertIndex = position === 'before' ? newTargetIndex : newTargetIndex + 1;
    copy.splice(insertIndex, 0, moved);
    return copy;
}

/**
 * Moves an item by absolute index in the list.
 */
export function moveItemByIndex<T>(items: T[], fromIndex: number, toIndex: number): T[] {
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length || fromIndex === toIndex) {
        return items;
    }
    const copy = [...items];
    const [moved] = copy.splice(fromIndex, 1);
    if (!moved) return items;
    copy.splice(toIndex, 0, moved);
    return copy;
}

export function useListOrder<T extends { id?: string | number }>(items: T[], setItems: (items: T[]) => void) {
    const moveUp = (itemToMove: T, targetItem?: T) => {
        if (!targetItem) return;
        const next = moveItemRelativeTo(items, itemToMove, targetItem, 'before');
        setItems(next);
    };

    const moveDown = (itemToMove: T, targetItem?: T) => {
        if (!targetItem) return;
        const next = moveItemRelativeTo(items, itemToMove, targetItem, 'after');
        setItems(next);
    };

    return { moveUp, moveDown };
}

/**
 * Legacy drag reorder hook preserved for backward compatibility
 */
export function useDragReorder<T>(items: T[], setItems: (items: T[]) => void) {
    const [dragItemIndex, setDragItemIndex] = useState<number | null>(null);
    const [dragOverItemIndex, setDragOverItemIndex] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent, position: number) => {
        setDragItemIndex(position);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', position.toString());
    };

    const handleDragEnter = (_e: React.DragEvent, position: number) => {
        setDragOverItemIndex(position);
    };

    const handleDragEnd = () => {
        if (
            dragItemIndex !== null && 
            dragOverItemIndex !== null &&
            dragItemIndex >= 0 &&
            dragOverItemIndex >= 0
        ) {
            const newList = [...items];
            const draggedItemContent = newList[dragItemIndex];
            if (draggedItemContent) {
                newList.splice(dragItemIndex, 1);
                newList.splice(dragOverItemIndex, 0, draggedItemContent);
                setItems(newList);
            }
        }
        setDragItemIndex(null);
        setDragOverItemIndex(null);
    };

    return { handleDragStart, handleDragEnter, handleDragEnd, dragItemIndex, dragOverItemIndex };
}
