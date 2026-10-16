import type {
    CounterItem,
    CounterLogsMap,
    CounterEvent,
    TargetHistoryEntry
} from '../types/counter';

export const COUNTERS_STORAGE_KEY = 'whatchadoin_counters';

export function getTodayDateStr(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export function formatDisplayDate(dateStr: string): string {
    const today = getTodayDateStr();
    if (dateStr === today) return 'Today';

    const [y = 2026, m = 1, d = 1] = dateStr.split('-').map(Number);
    const targetDate = new Date(y, m - 1, d);
    const todayDate = new Date();
    const diffDays = Math.round((targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === -1) return 'Yesterday';
    if (diffDays === 1) return 'Tomorrow';

    return targetDate.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

export function addDays(dateStr: string, days: number): string {
    const [y = 2026, m = 1, d = 1] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/**
 * Standard week starts on Sunday (day 0 = Sunday).
 * Returns the Sunday date string ('YYYY-MM-DD') for the week containing dateStr.
 */
export function getSundayDate(dateStr: string): string {
    const [y = 2026, m = 1, d = 1] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const day = date.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
    date.setDate(date.getDate() - day);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns 7 date strings (Sunday .. Saturday) for the week containing dateStr.
 */
export function getWeekDates(dateStr: string): string[] {
    const sundayStr = getSundayDate(dateStr);
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
        week.push(addDays(sundayStr, i));
    }
    return week;
}

export const DEFAULT_PRESET_COUNTERS: CounterItem[] = [];

/**
 * Returns the target count active for the given date, accounting for targetHistory.
 */
export function getTargetForDate(counter: CounterItem, dateStr: string): number {
    if (!counter.targetHistory || counter.targetHistory.length === 0) {
        return counter.targetCount;
    }

    // Sort ascending by effectiveDate
    const sorted = [...counter.targetHistory].sort((a, b) =>
        a.effectiveDate.localeCompare(b.effectiveDate)
    );

    let active = counter.targetCount;
    for (const entry of sorted) {
        if (dateStr >= entry.effectiveDate) {
            active = entry.targetCount;
        }
    }
    return active;
}

/**
 * Space-Saving Rollover:
 * When midnight arrives or when the user opens the app the next day (or after several days),
 * this rolls over elapsed days/weeks into `backlog` without saving unbounded daily logs!
 * Backlog(Day N) = Backlog(Day N - 1) + Target(Day N) - Did(Day N).
 */
export function rolloverCounterIfNeeded(counter: CounterItem, todayStr: string): CounterItem {
    if (counter.cadence === 'total') {
        return {
            ...counter,
            lastActiveDate: counter.lastActiveDate || todayStr,
            todayCount: counter.todayCount || 0,
            backlog: 0,
            pastDaysCount: counter.pastDaysCount || 0,
            pastTotalDid: counter.pastTotalDid || 0,
            todayEvents: counter.todayEvents || []
        };
    }

    if (!counter.lastActiveDate) {
        return {
            ...counter,
            lastActiveDate: todayStr,
            todayCount: counter.todayCount || 0,
            backlog: counter.backlog || 0,
            pastDaysCount: counter.pastDaysCount || 0,
            pastTotalDid: counter.pastTotalDid || 0,
            todayEvents: counter.todayEvents || []
        };
    }

    if (counter.cadence === 'daily') {
        if (counter.lastActiveDate >= todayStr) {
            return counter;
        }

        let cur = counter.lastActiveDate;
        let runningBacklog = counter.backlog || 0;
        let pastDaysCount = counter.pastDaysCount || 0;
        let pastTotalDid = counter.pastTotalDid || 0;

        // 1. Commit the active day that just closed (lastActiveDate)
        const dayTarget = getTargetForDate(counter, cur);
        const dayDid = counter.todayCount || 0;
        runningBacklog += (dayTarget - dayDid);
        pastDaysCount += 1;
        pastTotalDid += dayDid;

        // 2. Advance to the next day
        cur = addDays(cur, 1);

        // 3. For any intermediate missed days where user did 0:
        while (cur < todayStr) {
            const skippedTarget = getTargetForDate(counter, cur);
            runningBacklog += skippedTarget;
            pastDaysCount += 1;
            cur = addDays(cur, 1);
        }

        return {
            ...counter,
            lastActiveDate: todayStr,
            todayCount: 0,
            backlog: runningBacklog,
            pastDaysCount,
            pastTotalDid,
            todayEvents: []
        };
    } else {
        // Weekly cadence (starts on Sunday)
        const lastSun = getSundayDate(counter.lastActiveDate);
        const todaySun = getSundayDate(todayStr);

        if (lastSun >= todaySun) {
            return {
                ...counter,
                lastActiveDate: todayStr
            };
        }

        let curSun = lastSun;
        let runningBacklog = counter.backlog || 0;
        let pastWeeksCount = counter.pastDaysCount || 0;
        let pastTotalDid = counter.pastTotalDid || 0;

        // Commit previous week
        const weekTarget = getTargetForDate(counter, curSun);
        const weekDid = counter.todayCount || 0;
        runningBacklog += (weekTarget - weekDid);
        pastWeeksCount += 1;
        pastTotalDid += weekDid;

        // Advance 7 days
        curSun = addDays(curSun, 7);

        // Advance any intermediate skipped weeks
        while (curSun < todaySun) {
            const skippedTarget = getTargetForDate(counter, curSun);
            runningBacklog += skippedTarget;
            pastWeeksCount += 1;
            curSun = addDays(curSun, 7);
        }

        return {
            ...counter,
            lastActiveDate: todayStr,
            todayCount: 0,
            backlog: runningBacklog,
            pastDaysCount: pastWeeksCount,
            pastTotalDid,
            todayEvents: []
        };
    }
}

export function loadCounters(): CounterItem[] {
    const todayStr = getTodayDateStr();
    try {
        const raw = localStorage.getItem(COUNTERS_STORAGE_KEY);
        if (raw !== null) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                let changed = false;
                const updated = parsed.map((item: CounterItem) => {
                    const normalized: CounterItem = {
                        ...item,
                        cadence: item.cadence === 'weekly' ? 'weekly' : item.cadence === 'total' ? 'total' : 'daily',
                        backlog: item.cadence === 'total' ? 0 : (typeof item.backlog === 'number' ? item.backlog : 0),
                        todayCount: typeof item.todayCount === 'number' ? item.todayCount : 0,
                        lastActiveDate: item.lastActiveDate || todayStr,
                        pastDaysCount: item.pastDaysCount || 0,
                        pastTotalDid: item.pastTotalDid || 0,
                        todayEvents: item.todayEvents || []
                    };
                    const rolled = rolloverCounterIfNeeded(normalized, todayStr);
                    if (rolled.lastActiveDate !== item.lastActiveDate || rolled.backlog !== item.backlog || rolled.todayCount !== item.todayCount) {
                        changed = true;
                    }
                    return rolled;
                });
                if (changed) {
                    saveCounters(updated);
                }
                return updated;
            }
        }
    } catch (e) {
        console.error('Failed to load counters from storage', e);
    }

    return [];
}

export function saveCounters(counters: CounterItem[]): void {
    try {
        localStorage.setItem(COUNTERS_STORAGE_KEY, JSON.stringify(counters));
        window.dispatchEvent(new CustomEvent('whatchadoin_counters_updated'));
    } catch (e) {
        console.error('Failed to save counters', e);
    }
}

// Backward compatibility stub (all state is stored right on CounterItem now!)
export function loadCounterLogs(): CounterLogsMap {
    return {};
}

/**
 * Updates a counter's target with historical scoping.
 * scope: 'from_today' (default) -> sets new target effective from effectiveDate onwards. Backlog remains intact!
 * scope: 'all' -> updates baseline targetCount, clears targetHistory, and retroactively updates backlog.
 */
export function updateCounterTarget(
    counters: CounterItem[],
    counterId: string,
    newTarget: number,
    scope: 'from_today' | 'all',
    effectiveDate: string
): CounterItem[] {
    const updated = counters.map(item => {
        if (item.id !== counterId) return item;

        if (item.cadence === 'total') {
            return {
                ...item,
                targetCount: newTarget,
                targetHistory: [],
                backlog: 0
            };
        }

        if (scope === 'all') {
            const pastCount = item.pastDaysCount || 0;
            const pastDid = item.pastTotalDid || 0;
            const recalculatedBacklog = (pastCount * newTarget) - pastDid;

            return {
                ...item,
                targetCount: newTarget,
                targetHistory: [],
                backlog: recalculatedBacklog
            };
        }

        // 'from_today' (default)
        const existingHistory = item.targetHistory || [];
        const filtered = existingHistory.filter(h => h.effectiveDate !== effectiveDate);
        const newHistory: TargetHistoryEntry[] = [
            ...filtered,
            { effectiveDate, targetCount: newTarget }
        ].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));

        return {
            ...item,
            targetHistory: newHistory
        };
    });

    saveCounters(updated);
    return updated;
}

/**
 * Records a count change (increment/decrement) and appends an audit event for today.
 */
export function recordCounterDelta(
    counters: CounterItem[],
    counterId: string,
    delta: number,
    why?: string
): CounterItem[] {
    const todayStr = getTodayDateStr();
    const updated = counters.map(item => {
        if (item.id !== counterId) return item;

        // Rollover if needed
        const rolled = rolloverCounterIfNeeded(item, todayStr);
        // Round to 4 decimal places to prevent floating-point precision artifacts (e.g. 0.1 + 0.2 = 0.30000000000000004)
        const rawNew = (rolled.todayCount || 0) + delta;
        const newCount = Math.max(0, Math.round(rawNew * 10000) / 10000);

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const newEvent: CounterEvent = {
            id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: Date.now(),
            timeStr,
            amount: delta,
            why: why ? why.trim() : undefined
        };

        return {
            ...rolled,
            todayCount: newCount,
            todayEvents: [newEvent, ...(rolled.todayEvents || [])]
        };
    });

    saveCounters(updated);
    return updated;
}

export function resetCounterDay(
    counters: CounterItem[],
    counterId: string
): CounterItem[] {
    const todayStr = getTodayDateStr();
    const updated = counters.map(item => {
        if (item.id !== counterId) return item;
        const rolled = rolloverCounterIfNeeded(item, todayStr);
        return {
            ...rolled,
            todayCount: 0,
            todayEvents: [
                {
                    id: `ev-reset-${Date.now()}`,
                    timestamp: Date.now(),
                    timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    amount: -(rolled.todayCount || 0),
                    why: 'Manual reset'
                },
                ...(rolled.todayEvents || [])
            ]
        };
    });

    saveCounters(updated);
    return updated;
}

export interface CounterStats {
    effectiveTarget: number;
    todayTarget: number;
    todayCount: number;
    backlog: number;
    totalTargetSoFar: number;
    totalDidSoFar: number;
    targetToday: number;
    remainingToday: number;
    isMet: boolean;
    percentage: number;
    weekTotal: number;
    avg7Days: number;
    dailyPace?: number;
    events: CounterEvent[];
}

/**
 * Calculates current pacing, remaining targets, and live backlog.
 * Formula:
 * Live Backlog = counter.backlog + currentPeriodTarget - todayCount.
 * Exactly verifies:
 * Day 1: Target 10, Did 2 -> Backlog = 8
 * Day 2: Target 10, Did 0 -> Backlog = 18
 * Day 3: Target 10, Did 25 -> Backlog = 3
 * Day 4: Target 10, Did 15 -> Backlog = -2
 * Day 5: Target 10, Did 7 -> Backlog = 1
 * Day 6: Target 20, Did 21 -> Backlog = 0
 * Day 7: Target 20, Did 15 -> Backlog = 5
 * Day 8: Target 20, Did 30 -> Backlog = -5
 * Day 9: Target 20, Did 30 -> Backlog = -15
 * Day 10: Target 20, Did 5 -> Backlog = 0
 */
export function calculateCounterStats(
    counter: CounterItem,
    dateStr: string
): CounterStats {
    if (counter.cadence === 'total') {
        const target = counter.targetCount;
        const currentCount = counter.todayCount || 0;
        const remaining = Math.max(0, target - currentCount);
        let isMet = false;
        let percentage = 0;

        if (counter.isNegative) {
            isMet = currentCount <= target;
            percentage = target > 0 ? Math.min(100, Math.round((currentCount / target) * 100)) : (currentCount === 0 ? 100 : 0);
        } else {
            isMet = currentCount >= target;
            percentage = target > 0 ? Math.min(100, Math.round((currentCount / target) * 100)) : 100;
        }

        return {
            effectiveTarget: target,
            todayTarget: target,
            todayCount: currentCount,
            backlog: 0,
            totalTargetSoFar: target,
            totalDidSoFar: currentCount,
            targetToday: target,
            remainingToday: remaining,
            isMet,
            percentage,
            weekTotal: currentCount,
            avg7Days: currentCount,
            events: counter.todayEvents || []
        };
    }

    const effectiveTarget = getTargetForDate(counter, dateStr);
    const todayCount = counter.todayCount || 0;

    let targetToday = effectiveTarget;
    let remainingToday = Math.max(0, Math.round((effectiveTarget - todayCount) * 10000) / 10000);
    let isMet = false;
    let percentage = 0;
    let weekTotal = todayCount;
    let dailyPace: number | undefined = undefined;

    let backlog = Math.round(((counter.backlog || 0) + (effectiveTarget - todayCount)) * 10000) / 10000;

    if (counter.cadence === 'daily') {
        targetToday = effectiveTarget;
        remainingToday = Math.max(0, targetToday - todayCount);

        if (counter.isNegative) {
            isMet = todayCount <= targetToday;
            percentage = targetToday > 0 ? Math.min(100, Math.round((todayCount / targetToday) * 100)) : (todayCount === 0 ? 100 : 0);
        } else {
            isMet = todayCount >= targetToday;
            percentage = targetToday > 0 ? Math.min(100, Math.round((todayCount / targetToday) * 100)) : 100;
        }
    } else {
        // Weekly cadence (starts Sunday = day 0)
        const [y = 2026, m = 1, d = 1] = dateStr.split('-').map(Number);
        const dayIdx = new Date(y, m - 1, d).getDay(); // 0 is Sunday, 6 is Saturday
        const daysRemaining = 7 - dayIdx; // includes today
        const neededForWeek = Math.max(0, effectiveTarget - todayCount);
        dailyPace = daysRemaining > 0 ? Math.ceil(neededForWeek / daysRemaining) : 0;

        targetToday = effectiveTarget;
        remainingToday = Math.max(0, Math.round((effectiveTarget - todayCount) * 10000) / 10000);

        backlog = Math.round(((counter.backlog || 0) + (effectiveTarget - todayCount)) * 10000) / 10000;

        if (counter.isNegative) {
            isMet = todayCount <= effectiveTarget;
            percentage = effectiveTarget > 0 ? Math.min(100, Math.round((todayCount / effectiveTarget) * 100)) : (todayCount === 0 ? 100 : 0);
        } else {
            isMet = todayCount >= effectiveTarget;
            percentage = effectiveTarget > 0 ? Math.min(100, Math.round((todayCount / effectiveTarget) * 100)) : 100;
        }
    }

    const pastCount = counter.pastDaysCount || 0;
    const pastDid = counter.pastTotalDid || 0;
    const totalTargetSoFar = (pastCount * effectiveTarget) + effectiveTarget;
    const totalDidSoFar = pastDid + todayCount;

    // Approximate 7-day average from past did + today
    const totalDaysConsidered = Math.max(1, Math.min(7, pastCount + 1));
    const avg7Days = Math.round((totalDidSoFar / totalDaysConsidered) * 10) / 10;

    return {
        effectiveTarget,
        todayTarget: targetToday,
        todayCount,
        backlog,
        totalTargetSoFar,
        totalDidSoFar,
        targetToday,
        remainingToday,
        isMet,
        percentage,
        weekTotal,
        avg7Days,
        dailyPace,
        events: counter.todayEvents || []
    };
}
