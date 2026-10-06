import { dispatchAppEvent } from './events';

export interface LinkedMilestone {
    date: string;
    rawBlock: string;
    tag: string;
    cleanName: string;
    desc: string;
    done: boolean;
    isPast: boolean;
    isToday: boolean;
    diffDays: number;
    diffText: string;
    dateFormatted: string;
}

function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parseMilestoneBlock(block: string, dateStr: string): LinkedMilestone {
    const matchWithTag = block.match(/^\*\*@([^*]+)\*\*\s*-\s*\*\*([^*]+)\*\*(?:\s*\n([\s\S]*))?$/);
    const matchWithoutTag = block.match(/^\*\*([^*]+)\*\*(?:\s*\n([\s\S]*))?$/);

    const tag = matchWithTag ? (matchWithTag[1] || '').trim() : '';
    const rawName = matchWithTag ? (matchWithTag[2] || '') : (matchWithoutTag ? (matchWithoutTag[1] || '') : (block || ''));
    const desc = matchWithTag
        ? (matchWithTag[3] || '').trim().replace(/ {2}\n/g, '\n')
        : (matchWithoutTag ? (matchWithoutTag[2] || '').trim().replace(/ {2}\n/g, '\n') : '');

    const done = rawName.startsWith('[x] ');
    const cleanName = rawName.replace(/^\[(x| )\]\s*/, '').trim();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const itemDate = new Date(dateStr + 'T00:00:00');
    itemDate.setHours(0, 0, 0, 0);

    const diffTime = itemDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const isPast = diffDays < 0;
    const isToday = diffDays === 0;

    let diffText = '';
    if (diffDays === 0) diffText = 'Today';
    else if (diffDays === 1) diffText = 'Tomorrow';
    else if (diffDays > 1) diffText = `in ${diffDays} days`;
    else if (diffDays === -1) diffText = 'Yesterday';
    else diffText = `${Math.abs(diffDays)} days ago`;

    const dateFormatted = itemDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });

    return {
        date: dateStr,
        rawBlock: block,
        tag,
        cleanName,
        desc,
        done,
        isPast,
        isToday,
        diffDays,
        diffText,
        dateFormatted
    };
}

export function getMilestonesForGoalOrHabit(
    goalOrHabitName: string,
    milestones: Record<string, string> = {}
): {
    allLinked: LinkedMilestone[];
    nextMilestone: LinkedMilestone | null;
    completedCount: number;
    totalCount: number;
} {
    if (!goalOrHabitName || !milestones) {
        return { allLinked: [], nextMilestone: null, completedCount: 0, totalCount: 0 };
    }

    const cleanTarget = goalOrHabitName.trim().toLowerCase();
    const slugTarget = cleanTarget.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const cleanNoHyphen = cleanTarget.replace(/[-_]+/g, ' ');

    const mentionRegex = new RegExp(`@(?:${escapeRegExp(slugTarget)}|${escapeRegExp(cleanTarget)}|${escapeRegExp(cleanNoHyphen)})\\b`, 'i');

    const matches: LinkedMilestone[] = [];

    Object.entries(milestones).forEach(([dateStr, content]) => {
        if (!content || typeof content !== 'string') return;
        const blocks = content.split('\n\n');
        blocks.forEach((block) => {
            if (!block.trim()) return;

            const parsed = parseMilestoneBlock(block, dateStr);
            const tagClean = parsed.tag.toLowerCase();
            const tagNoHyphen = tagClean.replace(/[-_]+/g, ' ');

            const isTagMatch =
                tagClean === cleanTarget ||
                tagClean === slugTarget ||
                tagNoHyphen === cleanTarget ||
                tagNoHyphen === cleanNoHyphen;

            const isMentionMatch = mentionRegex.test(block);

            if (isTagMatch || isMentionMatch) {
                matches.push(parsed);
            }
        });
    });

    // Sort chronologically by date ASC
    matches.sort((a, b) => a.date.localeCompare(b.date));

    // Find next upcoming non-done milestone (diffDays >= 0)
    let nextMilestone: LinkedMilestone | null = null;
    const upcomingUndone = matches.filter(m => !m.done && m.diffDays >= 0);
    if (upcomingUndone.length > 0) {
        nextMilestone = upcomingUndone[0] || null;
    } else {
        // If no future undone, check overdue undone
        const overdueUndone = matches.filter(m => !m.done && m.diffDays < 0);
        if (overdueUndone.length > 0) {
            nextMilestone = overdueUndone[overdueUndone.length - 1] || null; // closest overdue
        } else if (matches.length > 0) {
            // All are completed
            nextMilestone = matches[matches.length - 1] || null;
        }
    }

    const completedCount = matches.filter(m => m.done).length;

    return {
        allLinked: matches,
        nextMilestone,
        completedCount,
        totalCount: matches.length
    };
}

export function flyToMilestone(date: string, milestoneName?: string): void {
    dispatchAppEvent('navigate-to-milestone', { date, name: milestoneName });
}
