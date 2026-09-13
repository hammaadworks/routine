import React, { useState } from 'react';

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
