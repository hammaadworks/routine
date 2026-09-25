import type {TemplateBlock} from '@/types/routine.ts';

export interface LaidOutBlock extends TemplateBlock {
    originalId?: string;
    actualStartTime?: number;
    actualDuration?: number;
    isWrapFirst?: boolean;
    isWrapSecond?: boolean;
    colIndex?: number;
    width?: number;
    left?: number;
    isPublic?: boolean;

    [key: string]: unknown;
}

export const calculateNextStartTime = (blocks: TemplateBlock[]): number => {
    let startMinutes: number;
    if (blocks.length > 0) {
        const firstBlock = blocks[0];
        if (!firstBlock) return 0;
        const lastBlock = blocks.reduce((prev, current) => (prev.startTime + prev.duration > current.startTime + current.duration) ? prev : current, firstBlock);
        startMinutes = lastBlock.startTime + lastBlock.duration;
        startMinutes = Math.ceil(startMinutes / 15) * 15;
    } else {
        const now = new Date();
        startMinutes = Math.floor((now.getHours() * 60 + now.getMinutes()) / 15) * 15;
    }
    if (startMinutes > 1440 - 15) startMinutes = 1440 - 15;
    return startMinutes;
};

export function getLayout(blocks: TemplateBlock[]): LaidOutBlock[] {
    if (!blocks || blocks.length === 0) return [];

    const processedBlocks: LaidOutBlock[] = [];
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
            processedBlocks.push({
                ...b, originalId: b.id, actualStartTime: b.startTime, actualDuration: b.duration
            });
        }
    });

    const sorted = [...processedBlocks].sort((a, b) => a.startTime - b.startTime || b.duration - a.duration);
    const groups: LaidOutBlock[][] = [];
    let currentGroup: LaidOutBlock[] = [];
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

    const laidOutBlocks: LaidOutBlock[] = [];
    groups.forEach(group => {
        const columns: LaidOutBlock[][] = [];
        group.forEach(block => {
            let placed = false;
            for (let i = 0; i < columns.length; i++) {
                const col = columns[i];
                if (!col || col.length === 0) continue;
                const lastBlock = col[col.length - 1];
                if (lastBlock && (lastBlock.startTime + lastBlock.duration <= block.startTime)) {
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
            block.left = (block.colIndex || 0) * (block.width || 100);
            laidOutBlocks.push(block);
        });
    });

    return laidOutBlocks;
}
