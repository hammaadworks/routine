export type CenterTab = 'myday' | 'habits' | 'calendar' | 'plans' | 'coins' | 'tasks';
export type LeftTab = 'life' | 'routine' | 'money';
export type MobileTab = 'tasks' | 'goals' | 'myday' | 'calendar' | 'plans' | 'coins';
export type CalendarSubTab = 'mark_goals' | 'timelog' | 'milestones' | 'journal' | 'target_dates' | 'timelogs';
export type AIDockState = 'hidden' | 'docked' | 'fullscreen';

export interface ConfirmConfig {
    title: string;
    message: string;
    isDanger?: boolean;
    onConfirm: () => void;
}

export interface Quote {
    id: string;
    text: string;
    author?: string;
    [key: string]: unknown;
}
