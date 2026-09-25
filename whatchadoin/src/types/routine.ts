export interface TemplateBlock {
    id: string;
    name: string;
    startTime: number; // minutes from midnight (0-1439)
    duration: number; // in minutes
    color?: string;
    routineGoalId?: string;
}

export interface Template {
    id: string;
    name: string;
    blocks: TemplateBlock[];
}

export interface Habit {
    id: string;
    name: string;
    cadence?: 'daily' | 'weekly' | string;
    color?: string;
    routineGoalId?: string;
    notes?: string;
    duration?: number | string;
    targetDays?: number[];
    isPublic?: boolean;
    timelogs?: Record<string, boolean | number>;
    linkedGoals?: string[];
    [key: string]: unknown;
}

export interface RoutineGoal {
    id: string;
    name: string;
    color?: string;
    cost?: number;
    isPublic?: boolean;
    notes?: string;
    targetDate?: string;
    [key: string]: unknown;
}

export interface DayMapping {
    [dayOfWeek: number]: string; // 0=Sun, 1=Mon, ..., 6=Sat -> templateId
}

export interface Routine {
    id: string;
    name: string;
    desc?: string;
    start?: string;
    end?: string;
    habits?: Habit[] | { daily?: Habit[]; weekly?: Habit[] };
    templates?: Template[];
    activeTemplateId?: string;
    dayMapping?: DayMapping;
    routineGoals?: RoutineGoal[];
    dailyLogs?: Record<string, Record<string, boolean>>;
    timeLogs?: Record<string, Record<string, number>>;
    [key: string]: unknown;
}

export interface QuickTask {
    id: string;
    text: string;
    completed: boolean;
    createdAt?: number;
    isPublic?: boolean;
    [key: string]: unknown;
}
