import React, { useRef } from 'react';

export function useDragReorder<T>(items: T[], setItems: (items: T[]) => void) {
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const handleDragStart = (_e: React.DragEvent, position: number) => {
        dragItem.current = position;
    };

    const handleDragEnter = (_e: React.DragEvent, position: number) => {
        dragOverItem.current = position;
    };

    const handleDragEnd = () => {
        if (
            dragItem.current !== null && 
            dragOverItem.current !== null &&
            dragItem.current >= 0 &&
            dragOverItem.current >= 0
        ) {
            const newList = [...items];
            const draggedItemContent = newList[dragItem.current];
            if (draggedItemContent) {
                newList.splice(dragItem.current, 1);
                newList.splice(dragOverItem.current, 0, draggedItemContent);
                setItems(newList);
            }
        }
        dragItem.current = null;
        dragOverItem.current = null;
    };

    return { handleDragStart, handleDragEnter, handleDragEnd };
}
