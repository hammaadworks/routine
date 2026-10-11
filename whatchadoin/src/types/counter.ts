export type CounterCadence = 'daily' | 'weekly';

export interface TargetHistoryEntry {
    effectiveDate: string; // 'YYYY-MM-DD'
    targetCount: number;
}

export interface CounterEvent {
    id: string;
    timestamp: number;        // epoch milliseconds
    timeStr: string;          // e.g. "14:32"
    amount: number;           // e.g. +1, +5, -1
    why?: string;             // optional note/reason (e.g. "bored after lunch")
}

export interface CounterItem {
    id: string;
    name: string;             // e.g. "Pushups", "SubhanAllah", "Instagram Doomscroll"
    cadence: CounterCadence;  // 'daily' | 'weekly'
    targetCount: number;      // initial or default target
    targetHistory?: TargetHistoryEntry[]; // target changes with effective dates
    unit?: string;            // e.g. "reps", "zikr", "times", "glasses"
    step?: number;            // default step for quick tap e.g. 1
    quickSteps?: number[];    // e.g. [1, 5, 10, 33]
    color?: string;           // accent hex code
    notes?: string;           // purpose / rules
    isNegative?: boolean;     // true if tracking a vice/distraction
    startDate?: string;       // YYYY-MM-DD tracking start date
    createdAt: number;

    // Lightweight cumulative tracking (no unbounded daily logs needed)
    backlog: number;          // Running cumulative backlog accumulated prior to current active period
    todayCount: number;       // Count completed in current active period
    lastActiveDate: string;   // 'YYYY-MM-DD' representing active period (day for daily, Sunday for weekly)
    pastDaysCount?: number;   // Number of closed days/periods
    pastTotalDid?: number;    // Cumulative units done across closed periods
    todayEvents?: CounterEvent[]; // Audit trail for current active period
}

// Kept for backward compatibility if needed
export interface CounterDayLog {
    count: number;
    events: CounterEvent[];
}
export type CounterLogsMap = Record<string, Record<string, CounterDayLog>>;
